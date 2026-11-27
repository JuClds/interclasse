/* ============================================================
   CONFIGURAÇÃO DO INTERCLASSE (edite só este arquivo)
   Onde achar: painel do Supabase > Project Settings > API
   ============================================================ */
window.INTERCLASSE_CONFIG = {
  // "Project URL"
  supabaseUrl: "https://ukdpiygmmfpbrzgkmsja.supabase.co",

  // Chave "publishable" (pública: pode ficar no site, quem protege os dados são as regras do setup.sql)
  supabaseAnonKey: "sb_publishable_7ZRIyabDRd2cfSg6aYkFSw_JAm-1ohd",

  // E-mail do usuário único da organização (criado em Authentication > Users).
  // Quem usa o site só digita a SENHA; este e-mail fica escondido aqui.
  emailOrganizacao: "organizacao@interclasse.app",

  // E-mail da ADMINISTRADORA: só ela vê e altera a página Organização.
  // Crie esse usuário em Authentication > Users (a senha é definida por você lá).
  emailAdmin: "ju@inter.com",

  // Nome do bucket de imagens criado pelo setup.sql
  bucket: "brasoes"
};
