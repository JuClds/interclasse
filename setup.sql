-- =============================================================
-- INTERCLASSE NAVE 2026 · configuração do banco no Supabase
-- Como usar: painel do Supabase > SQL Editor > New query >
-- cole TUDO este arquivo > Run. Pode rodar de novo sem problema.
-- =============================================================

-- 1) Tabela única de dados do app
--    Cada linha é um "documento": caminho (ex.: partidas/futsal-m-j1) + conteúdo em JSON.
create table if not exists public.docs (
  path        text primary key,
  col         text not null,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists docs_col_idx on public.docs (col);

-- Necessário para o app saber qual linha foi apagada (atualização ao vivo)
alter table public.docs replica identity full;

-- 2) Segurança: todo mundo lê, só a organização (usuário logado) escreve
alter table public.docs enable row level security;

drop policy if exists "docs leitura publica"   on public.docs;
drop policy if exists "docs organizacao cria"  on public.docs;
drop policy if exists "docs organizacao edita" on public.docs;
drop policy if exists "docs organizacao apaga" on public.docs;

create policy "docs leitura publica"   on public.docs for select using (true);
create policy "docs organizacao cria"  on public.docs for insert to authenticated with check (true);
create policy "docs organizacao edita" on public.docs for update to authenticated using (true) with check (true);
create policy "docs organizacao apaga" on public.docs for delete to authenticated using (true);

-- Permissões da API (projetos novos do Supabase não liberam sozinhos)
grant usage on schema public to anon, authenticated;
grant select on public.docs to anon, authenticated;
grant insert, update, delete on public.docs to authenticated;

-- 3) Placar ao vivo (Realtime)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs'
  ) then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- 4) Imagens das turmas (brasões ou fotos): bucket público, limite de 2 MB por arquivo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brasoes', 'brasoes', true, 2097152,
        array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "brasoes leitura publica"   on storage.objects;
drop policy if exists "brasoes organizacao envia" on storage.objects;
drop policy if exists "brasoes organizacao troca" on storage.objects;
drop policy if exists "brasoes organizacao apaga" on storage.objects;

create policy "brasoes leitura publica"   on storage.objects for select using (bucket_id = 'brasoes');
create policy "brasoes organizacao envia" on storage.objects for insert to authenticated with check (bucket_id = 'brasoes');
create policy "brasoes organizacao troca" on storage.objects for update to authenticated using (bucket_id = 'brasoes');
create policy "brasoes organizacao apaga" on storage.objects for delete to authenticated using (bucket_id = 'brasoes');

-- Pronto! Agora crie o usuário da organização (veja o README, passo 3).
