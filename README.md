# Interclasse NAVE 2026 · versão com Supabase

Placar, agenda, chaves, penalidades e turmas do Interclasse da ETE Cícero Dias, com a identidade visual do NAVE.

- **Público (alunos, famílias, escola):** abre o link e vê tudo ao vivo, **sem login**.
- **Organização:** toca em **"Entrar (organização)"**, digita **só a senha** e passa a ver a Visão de edição (Lançar placar, Penalidades, Organização).

Tudo gratuito: **Supabase** (banco, imagens e login) + **GitHub Pages** (hospedagem).

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro (telas, visual, regras de pontuação do edital) |
| `config.js` | **Único arquivo que você edita**: endereço e chave do Supabase |
| `adapter.js` | Liga o app ao Supabase (banco ao vivo, imagens, login) |
| `setup.sql` | Cria a tabela, as regras de segurança e o espaço das imagens |

---

## Passo a passo (uns 20 minutos)

### 1. Criar o projeto no Supabase
1. Entre em **supabase.com** e crie uma conta (pode ser com o GitHub). Não pede cartão.
2. **New project**: dê um nome (ex.: `interclasse-nave`), crie uma senha do banco (guarde, mas o app não usa) e escolha a região **South America (São Paulo)**.
3. Espere o projeto ficar pronto (1 a 2 minutos).

### 2. Criar a tabela e as regras
1. No menu lateral, abra **SQL Editor** e clique em **New query**.
2. Cole todo o conteúdo do arquivo `setup.sql` e clique em **Run**.
3. Deve aparecer "Success". Pode rodar de novo sem problema, se precisar.

### 3. Criar o login da organização (só senha)
O site pede só a senha. Por trás, ela é a senha de **um único usuário** do Supabase.

1. Menu **Authentication > Users > Add user > Create new user**.
2. E-mail: `organizacao@interclasse.app` (ou outro, mas precisa ser **igual** ao do `config.js`).
3. Senha: escolha a senha que os professores vão usar. Use uma senha forte, com pelo menos 10 caracteres.
4. Marque **Auto Confirm User** e crie.
5. **Importante:** desligue os cadastros novos para ninguém criar outra conta. Em **Authentication**, na parte de configurações de login (Sign In / Providers), desative **"Allow new users to sign up"**.

Para trocar a senha depois: **Authentication > Users**, clique no usuário e altere a senha. Quem já estava logado continua logado até tocar em "Sair".

### 4. Preencher o `config.js`
1. No Supabase, abra **Project Settings > API** (ou **Data API / API Keys**).
2. Copie o **Project URL** e a chave **anon public** (ou "publishable").
3. Cole no `config.js`, no lugar de `https://SEU-PROJETO.supabase.co` e `SUA-CHAVE-ANON-PUBLICA`.

A chave anon é pública por natureza: pode ficar no site. Quem protege os dados são as regras do `setup.sql` (todo mundo lê, só a organização logada grava). **Nunca** coloque a chave `service_role` no site.

### 5. Publicar no GitHub Pages
1. Crie um repositório no GitHub (ex.: `interclasse-nave`), público.
2. Envie os 4 arquivos (`index.html`, `config.js`, `adapter.js`, `setup.sql`) e este `README.md`. Pelo site do GitHub é só **Add file > Upload files** e arrastar.
3. No repositório: **Settings > Pages > Build and deployment > Deploy from a branch**, escolha `main` e a pasta `/ (root)`, e salve.
4. Em 1 a 2 minutos o site fica em `https://SEU-USUARIO.github.io/interclasse-nave/`.

Cada vez que você editar um arquivo no GitHub, o site atualiza sozinho em alguns minutos.

### 6. Trazer os dados que já foram lançados no Claude
1. No app atual (no Claude), abra a **Visão de edição > Organização > Backup e migração dos dados** e toque em **Copiar todos os dados**.
2. No site novo, toque em **Entrar (organização)**, digite a senha e vá em **Organização > Importar dados de um backup**.
3. Cole o texto e toque em **Importar** (duas vezes, para confirmar).

As chaves do PDF, resultados, penalidades, avisos, horários alterados e nomes das turmas vêm junto. **As imagens das turmas não vêm**: envie de novo em **Organização > Turmas > Brasão ou foto**.

Faça a migração num intervalo entre jogos, para nenhum resultado ficar para trás.

---

## Avisos importantes

- **Pausa por falta de uso:** no plano gratuito, o Supabase pausa o projeto depois de cerca de uma semana sem uso. Durante o interclasse isso não acontece. Depois do evento, para reativar, entre no painel do Supabase e clique em **Restore** no projeto. Os dados ficam guardados.
- **Backup:** antes e depois de cada dia de jogos, vale tocar em **Copiar todos os dados** e guardar o texto num documento. É o seu backup.
- **Limites gratuitos:** sobram com folga para o interclasse (500 MB de banco e 1 GB de imagens).
- **Senha:** quem tem a senha consegue editar tudo. Passe só para quem está na organização e troque depois do evento.

## Para o ano que vem
- Nomes das turmas, personagens e cores: **Organização > Turmas**.
- Modalidades, horários e locais: **Organização** (criar, apagar, mudar horário, cancelar).
- Pontuação (1º, 2º, 3º, participação): **Organização > Pontuação**.
- Datas e programação fixa (chegada, lanche, almoço) e a lista de infrações do edital ficam no começo do `<script>` do `index.html`, nas listas `DIAS`, `GERAL`, `MODS` e `PEN`.

## Como funciona por dentro (para a turma de Programação)
- Tudo fica numa tabela `docs` com duas colunas principais: `path` (ex.: `partidas/futsal-m-j1`) e `data` (JSON).
- Coleções usadas: `config`, `res` (pódios), `partidas` (chaves), `agenda` (horários alterados), `mods` (modalidades novas), `penal` (penalidades), `avisos`.
- O `adapter.js` carrega a tabela, escuta mudanças pelo **Supabase Realtime** e confere de novo a cada minuto.
- Segurança por **Row Level Security**: leitura pública, escrita só para o usuário autenticado.
