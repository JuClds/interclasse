/* Ponte entre o app do Interclasse e o Supabase.
   Guarda tudo numa tabela "docs" (caminho + JSON), com atualização ao vivo,
   imagens no Storage e login da organização só com senha. */
(function () {
  const C = window.INTERCLASSE_CONFIG || {};
  const ok = !!(window.supabase && C.supabaseUrl && C.supabaseAnonKey &&
    !/SEU-PROJETO/.test(C.supabaseUrl) && !/SUA-CHAVE/.test(C.supabaseAnonKey));
  const BUCKET = C.bucket || "brasoes";
  window.IC_CONFIG_OK = ok;
  window.IC_IMG = id => ok ? `${C.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(id)}` : "";
  if (!ok) { window.claude = { use: async () => null }; return; }

  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true } });
  const cache = new Map();
  let loaded = false;
  const subs = new Set(), errs = new Set();
  const meta = { fromCache: false, hasPendingWrites: false };
  const colOf = p => p.split("/").slice(0, -1).join("/");
  const idOf = p => p.split("/").pop();
  const snap = p => ({ id: idOf(p), exists: cache.has(p), data: () => cache.get(p), metadata: meta });
  const notify = () => { for (const f of subs) { try { f(); } catch (e) { console.error(e); } } };
  const mapErr = e => ({
    code: e && (e.code === "42501" || e.status === 401 || e.status === 403 || /row-level security|JWT|permission/i.test(e.message || "")) ? "invalid_argument" : "unavailable",
    message: (e && e.message) || "erro"
  });

  async function loadAll() {
    const all = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("docs").select("path,data").neq("col", "backup").range(from, from + 999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) break;
    }
    cache.clear();
    for (const r of all) cache.set(r.path, r.data);
    loaded = true;
    notify();
  }
  loadAll().catch(e => { console.error(e); for (const f of errs) f(mapErr(e)); });

  // Atualização ao vivo (e uma conferência a cada minuto, por garantia)
  sb.channel("docs-ao-vivo")
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, pl => {
      if (pl.eventType === "DELETE") { if (pl.old && pl.old.path) cache.delete(pl.old.path); }
      else if (pl.new && pl.new.path) cache.set(pl.new.path, pl.new.data);
      notify();
    })
    .subscribe();
  setInterval(() => { if (!document.hidden) loadAll().catch(() => {}); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadAll().catch(() => {}); });

  async function put(rows) {
    const now = new Date().toISOString();
    const { error } = await sb.from("docs").upsert(rows.map(r => ({ path: r.path, col: colOf(r.path), data: r.data, updated_at: now })));
    if (error) throw mapErr(error);
    for (const r of rows) cache.set(r.path, r.data);
    notify();
  }
  const rid = () => {
    const a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from(crypto.getRandomValues(new Uint8Array(20)), x => a[x % 62]).join("");
  };
  const clone = d => JSON.parse(JSON.stringify(d));

  function doc(path) {
    return {
      id: idOf(path), path,
      get: async () => snap(path),
      set: async d => put([{ path, data: clone(d) }]),
      update: async d => {
        if (!cache.has(path)) throw { code: "invalid_argument", message: "documento não existe" };
        return put([{ path, data: Object.assign({}, cache.get(path), clone(d)) }]);
      },
      delete: async () => {
        const { error } = await sb.from("docs").delete().eq("path", path);
        if (error) throw mapErr(error);
        cache.delete(path); notify();
      },
      onSnapshot(next, err) {
        const f = () => { if (loaded) next(snap(path)); };
        subs.add(f); if (err) errs.add(err); f();
        return () => { subs.delete(f); errs.delete(err); };
      },
      collection: c => col(path + "/" + c)
    };
  }
  function col(c, q = {}) {
    const run = () => {
      let docs = [...cache.keys()].filter(p => colOf(p) === c).map(snap);
      if (q.ob) {
        const [f, dir] = q.ob;
        docs.sort((a, b) => { const x = a.data()[f], y = b.data()[f]; if (x === y) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : 1) * (dir === "desc" ? -1 : 1); });
      } else docs.sort((a, b) => (a.id < b.id ? -1 : 1));
      if (q.lim) docs = docs.slice(0, q.lim);
      return { docs, size: docs.length, empty: !docs.length, metadata: meta, docChanges: () => [] };
    };
    return {
      path: c,
      where() { return col(c, q); },
      orderBy: (f, dir) => col(c, Object.assign({}, q, { ob: [f, dir || "asc"] })),
      limit: n => col(c, Object.assign({}, q, { lim: n })),
      get: async () => run(),
      onSnapshot(next, err) {
        const f = () => { if (loaded) next(run()); };
        subs.add(f); if (err) errs.add(err); f();
        return () => { subs.delete(f); errs.delete(err); };
      },
      doc: id => doc(c + "/" + (id || rid())),
      add: async d => { const r = doc(c + "/" + rid()); await r.set(d); return r; }
    };
  }
  const db = { doc, collection: col, bulk: async rows => { for (let i = 0; i < rows.length; i += 200) await put(rows.slice(i, i + 200)); } };

  let session = null;
  const ready = sb.auth.getSession().then(r => { session = r.data.session; }).catch(() => {});
  const logged = async () => { await ready; return !!session; };
  // Administradora: só ela vê e altera a página Organização (as regras do banco garantem isso)
  const isAdmin = async () => {
    await ready; if (!session) return false;
    const em = String(session.user.email || "").toLowerCase();
    if (C.emailAdmin && em === String(C.emailAdmin).toLowerCase()) return true;
    try { const { data, error } = await sb.rpc("ic_admin_definido"); if (error) return false; return data === false; } catch (e) { return false; }
  };
  const user = { canEdit: logged, isOwner: isAdmin, isAdmin, can: logged, id: async () => { await ready; return session ? session.user.id : null; } };

  const EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
  const assets = {
    upload: async blob => {
      const id = rid() + "-" + (EXT[blob.type] || "img");
      const { error } = await sb.storage.from(BUCKET).upload(id, blob, { contentType: blob.type || "image/png", upsert: false, cacheControl: "31536000" });
      if (error) throw { code: /size|large/i.test(error.message) ? "too_large" : "upstream_error", message: error.message };
      return { id, url: window.IC_IMG(id) };
    },
    delete: async id => { const { error } = await sb.storage.from(BUCKET).remove([id]); return { deleted: !error }; }
  };

  window.IC_AUTH = {
    login: async (pw, email) => { const { error } = await sb.auth.signInWithPassword({ email: (email && email.trim()) || C.emailOrganizacao, password: pw }); if (error) throw error; },
    logout: async () => { await sb.auth.signOut(); }
  };
  window.claude = { use: async n => n === "db" ? db : n === "user" ? user : n === "assets" ? ((await logged()) ? assets : null) : null };
})();
