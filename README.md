# :pencil2: xoxoLAB

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.19305547.svg)](https://doi.org/10.5281/zenodo.19305547)

O xoxoLAB é uma ferramenta web de gestão editorial colaborativa que reúne em uma única interface nove instrumentos de trabalho para equipes de comunicação e mídias sociais: quadro de avisos, pautas, conteúdos, kanban, efemérides, políticas, recursos, equipe e senhas, todos conectados por um sistema de @menções que notifica colaboradores em tempo real. Os dados são armazenados diretamente no repositório GitHub privado da própria equipe, sem servidor intermediário, e múltiplos projetos podem ser gerenciados simultaneamente por diferentes grupos de colaboradores, cada um com seu próprio espaço isolado de trabalho.

<img src="screenshots/ombudsman-logo.png" alt="Desenvolvido por Viktor Chagas" align="right" width="100">O software foi desenvolvido por [Viktor Chagas](https://scholar.google.com/citations?user=F02DKoAAAAAJ&hl=en) e pelo [coLAB/UFF](http://colab-uff.github.io), com auxílio do Claude Code Sonnet 4.6 para as tarefas de programação. Os autores agradecem a Rafael Cardoso Sampaio pelos comentários e sugestões de adoção de ferramentas de IA, que levaram ao planejamento inicial da aplicação.

---

# :octocat: Frameworks

O xoxoLAB é desenvolvido em TypeScript com React 19 como framework de interface, utilizando Vite 7 como bundler e servidor de desenvolvimento. A estilização é feita com Tailwind CSS v4 via plugin oficial para Vite, e os componentes de interface são construídos diretamente sobre primitivos Radix UI com utilitários cva, clsx e tailwind-merge. O roteamento é feito com React Router v7 com rotas aninhadas por projeto, e o gerenciamento de dados assíncronos é feito com TanStack Query v5. Recursos adicionais incluem @hello-pangea/dnd para drag-and-drop em pautas e kanban, date-fns para manipulação de datas, react-markdown com remark-gfm para renderização de Markdown, jsPDF e jspdf-autotable para exportação em PDF, html2canvas para exportação em PNG, xlsx para planilhas, docx para documentos Word e js-yaml para serialização dos dados, além de @emailjs/browser para notificações opcionais por e-mail.

Toda a persistência de dados ocorre diretamente em um repositório GitHub privado da equipe por meio da GitHub Contents API (REST), sem banco de dados externo. Os dados são armazenados em arquivos YAML organizados por projeto e por módulo no repositório. O projeto não depende de nenhum serviço de backend próprio — o navegador se comunica diretamente com a API do GitHub, e cada colaborador autentica-se com seu próprio Personal Access Token.

---

## Módulos

### 1. Gestão de Projetos

O xoxoLAB permite gerenciar várias contas e projetos simultaneamente. Assim, equipes de produção de conteúdo para as mídias sociais podem gerenciar várias páginas e perfis em um único ambiente. Ao efetuar o login no software, é preciso indicar um email, que funcionará como nome de usuário. As equipes podem atribuir tarefas e notificar usuários por meio de um sistema de menções (@). Disponível também em **modo demonstração**, sem necessidade de conta GitHub.

![Login](screenshots/00-login.png)

#### Como usar

1. Acesse a aplicação
2. Informe seu **email** e as demais credenciais de acesso (ou use o Modo demonstração)
3. Crie ou acesse um projeto e convide colaboradores pelos seus emails

Os dados ficam inteiramente no seu repositório GitHub privado.

![Projetos](screenshots/01-projects.png)


### 2. Quadro de Avisos

Um quadro de recados colaborativo organizado como uma Matriz Eisenhower, para priorização de comunicados internos da equipe.

![Quadro de Avisos](screenshots/02-avisos.png)

- **4 Quadrantes** organizados por eixos de Iminência (horizontal) e Empenho (vertical): Crítico, Estrutural, Operacional, Residual
- Cards com título, descrição em Markdown, prioridade, suporte a @menções
- Clique no marcador colorido arquiva o card na área "Concluídos" (colapsável)
- **Export**: PNG, PDF (paisagem), Excel, Markdown


### 3. Pautas

Lista de ideias editoriais organizada por seções temáticas, com suporte a drag-and-drop. As pautas funcionam como propostas a serem avaliadas pela equipe editorial. É possível organizar as pautas em diferentes seções e atribuir tags a elas, a fim de organizar suas ideias. Caso entrem em produção, as pautas podem ser encaminhadas diretamente para o módulo Conteúdos com um único clique.

![Pautas](screenshots/03-pautas.png)

- Seções customizáveis (criar, reordenar, excluir)
- Itens com título, corpo em Markdown, tags coloridas, data, responsável e @menções
- Reordenação de itens por DnD dentro e entre seções
- Quick-add por Enter direto na lista
- Botão **"Encaminhar para Conteúdos"** (ícone →) em cada item envia a pauta ao módulo Conteúdos
- **Export**: PDF, Excel, CSV, Markdown


### 4. Conteúdos

Visão geral de todos os conteúdos em produção. O módulo Conteúdos é um controle geral de fluxo de produção, em que o editor ou a editora têm um panorama sobre em que pautas a equipe está trabalhando no momento. A tabela de Conteúdos apresenta cada item em seu respectivo estágio de produção. Em formato que se assemelha a apps de roadmap ou bug tracker para desenvolvedores, o módulo recebe as ideias encaminhadas do módulo Pautas e envia itens concluídos automaticamente para o Kanban.

![Conteúdos](screenshots/04b-conteudos.png)

- **Tabela editável inline** com as colunas: Descrição, Atribuição, Prazo, Tipo, Importância, Dependência, Progresso, Criado em
- **Atribuição e Dependência**: seletor com autocompletar por @, exibe avatar colorido + nome do colaborador; dispara notificação por e-mail ao usuário marcado
- **Tipos customizáveis**: o usuário define sua própria lista de tipos de conteúdo (Artigo, Resenha etc.) via "Gerenciar Tipos"
- **Importância**: pílulas Urgente · Alta · Média · Baixa
- **Progresso**: seletor cíclico clicável — Aguardando na Fila → Em Produção → Em Revisão → Aguardando Aprovação → Atrasado → Pronto
- Ao marcar como **Pronto**, o item migra automaticamente para o Kanban (coluna Planejamento) e vai ao final da lista (ocultável); reverter o status remove o card do Kanban
- Ordenação por qualquer coluna; padrão por data de criação


### 5. Kanban

Quadro de gestão de conteúdo por etapas com timeline visual. Após a produção do conteúdo, o Kanban funciona para gerenciar a divulgação em plataformas digitais de mídias sociais. Organizado em cinco colunas (Planejamento, Criação, Revisão/Aprovação, Agendamento e Publicação), o módulo recebe os conteúdos produzidos e planeja sua divulgação nas redes, permitindo atribuição de funções a membros da equipe, agendamento para publicação futura, e sincronização com Efemérides importantes através do controle da linha do tempo.

![Kanban](screenshots/05-kanban.png)

- **5 colunas**: Planejamento · Criação · Revisão/Aprovação · Agendamento · Publicação (oculta por padrão)
- Cards com: título, descrição Markdown, plataformas de publicação, responsável, revisor, previsão de publicação e data de agendamento
- **Pendências automáticas**: pílula PENDENTE em Agendamento sem data; pílula PENDENTE em Revisão/Aprovação sem revisor
- **Agendamento automático**: quando a data de agendamento é atingida, o card migra para Publicação; arrastar de Publicação de volta apaga a data de agendamento
- Cards com imagens/vídeos anexados via drag-and-drop ou botão de upload; thumbnails exibidos no card e na interface de edição
- Log de auditoria por card (ações timestampadas: criação, movimentação, atribuição, edição)
- **Download individual de card**: Markdown, DOCX ou ZIP (inclui mídia anexada); exporta apenas título e texto
- **Timeline** acima do quadro: chips coloridos por plataforma, zoom in/out, sincronizada com a largura do board
- **Export**: PNG/PDF/Excel/CSV/Markdown do board


### 6. Efemérides

Calendário de eventos importantes, datas comemorativas e lembretes. Importa arquivos ICS ou sincroniza diretamente com o Google Calendar.

![Efemérides](screenshots/06-efemerides.png)

- Grid mensal React puro (sem biblioteca de calendário externa), navegação por meses
- Eventos manuais com recorrência: anual, mensal, semanal, sem recorrência
- **Eventos sintéticos** (faded, não editáveis): cards de Kanban com prazo aparecem automaticamente no calendário
- Lembretes automáticos por e-mail (EmailJS) com 7 e 1 dia de antecedência
- **Import ICS**: importação em lote com deduplicação automática e desfazer por lote; "Limpar tudo" com confirmação
- **Google Calendar**: conexão via OAuth 2.0, token persistido em localStorage com renovação silenciosa
- **Export**: `.ics`, Markdown


### 7. Políticas

Wiki editorial da equipe com documentos de políticas de gestão de conteúdos, manual de redação, entre outros.

![Políticas](screenshots/07-politicas.png)

- Lista de documentos com título e corpo em Markdown (editor com preview)
- Criação, edição e exclusão de políticas
- **Export por documento**: Markdown, DOCX, PDF
- **Exportar Tudo**: gera PDF, DOCX ou Markdown com todos os documentos concatenados


### 8. Recursos

Central de links úteis, documentação e arquivos de template. Armazene aqui logomarcas, arquivos vetoriais de ilustrações, e mais.

![Recursos](screenshots/08-recursos.png)

- **Aba Links**: lista de recursos externos com título, URL, descrição e categoria; auto-fetch do título da página
- **Aba Templates**: upload de arquivos para o repositório GitHub (`recursos/templates/`); download autenticado via GitHub API; aviso para arquivos >50MB
- Ordenação e organização por categorias


### 9. Equipe

Visão consolidada das atribuições e menções por colaborador. Exibe também tarefas atribuídas via Conteúdos.

![Equipe](screenshots/09-equipe.png)

- Lista todos os membros do projeto (cadastrados no `meta.yaml`)
- Para cada membro: avatar com iniciais colorido, lista de @menções em Avisos/Pautas/Kanban/Políticas, atribuições no Kanban e dependências em Conteúdos
- Calculado em runtime via `useMemo` (sem storage próprio)


### 10. Senhas

Cofre de credenciais armazenadas no repositório GitHub privado.

![Senhas](screenshots/10-senhas.png)

- Tabela com linhas expansíveis (serviço pai + múltiplas contas filho)
- Colunas: plataforma, serviço, URL, login, senha (oculta por padrão com toggle), notas
- Suporte a plataformas customizadas ("Outra…") com campo de texto livre
- Adição e edição inline ou via dialog
- Armazenado em `senhas/senhas.yaml` no repositório privado da equipe
- **Sem exportação** (por segurança)

---

# 🚀 Instalação do pqLAB — Passo a passo

## Estrutura de Dados no GitHub

```
projects/
  {project-id}/
    meta.yaml               # name, createdBy, users: [email...]
    avisos/{card-id}.yaml
    pautas/pautas.yaml      # { sections, items, tags }
    conteudos/conteudos.yaml # { items, types }
    kanban/{card-id}.yaml
    efemerides/eventos.yaml
    politicas/{policy-id}.yaml
    recursos/recursos.yaml
    recursos/templates/{file}
    senhas/senhas.yaml
users/
  index.yaml               # emails registrados (autocomplete de @menções)
```

---

## Instalação

### Opção 1 — Deploy próprio via Fork (recomendado)

Hospede sua própria instância no GitHub Pages em menos de 5 minutos.

#### PASSO 1. Fork do repositório

Acesse [github.com/ombudsmanviktor/xoxolab](https://github.com/ombudsmanviktor/xoxolab) e clique em **Fork**.

#### PASSO 2. Habilitar GitHub Actions no fork

- Acesse *Settings → Actions → General*
- Selecione **Allow all actions and reusable workflows**
- Clique em **Save**

#### PASSO 3. Configurar GitHub Pages

- Acesse *Settings → Pages*
- Em *Source*, selecione **GitHub Actions**
- Clique em **Save**

#### PASSO 4. Disparar o primeiro deploy

- Acesse *Actions → Deploy to GitHub Pages*
- Clique em **Run workflow → Run workflow**

#### PASSO 5. Aguardar (~2 minutos)

A aplicação estará disponível em:

```
https://SEU_USUARIO.github.io/xoxolab/
```

#### PASSO 6. Domínio customizado (opcional)

1. Edite `public/CNAME` com o seu domínio
2. Configure o DNS apontando para `SEU_USUARIO.github.io`
3. Em *Settings → Pages*, informe o domínio customizado

#### **ATUALIZAÇÕES**

Use *Sync fork → Update branch* na página do fork. O deploy ocorre automaticamente a cada sincronização.

---

### Opção 2 — Desenvolvimento local

#### PRÉ-REQUISITOS

- **Node.js** 18 ou superior
- **npm** 9 ou superior
- Conta no **GitHub** com um repositório privado para armazenar os dados
- **GitHub Personal Access Token (PAT)** com escopo `repo`

#### PASSO 1.

```bash
# 1. Clonar o repositório
git clone https://github.com/ombudsmanviktor/xoxolab.git
cd xoxolab

# 2. Instalar dependências
npm install

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

A aplicação abrirá em `http://localhost:5173`.

**Scripts disponíveis:**

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build de produção (saída em `./dist`) |
| `npm run preview` | Visualização local do build de produção |
| `npm run lint` | Verificação de código com ESLint |

---

## Configuração de Notificações por E-mail (opcional)

O xoxoLAB suporta notificações por @menção e lembretes de efemérides via **EmailJS**.

1. Crie uma conta em [emailjs.com](https://www.emailjs.com) (plano gratuito permite 200 e-mails/mês)
   
2. Em **Email Services**, conecte sua conta de e-mail (Gmail, Outlook etc.). Em **Email Templates**, crie um template com as variáveis:
   - De: `{{from_email}}` — remetente
   - Para: `{{to_email}}` — destinatário
   - Assunto: @menção em `{{project_name}}` — {{module_name}}
   - Corpo: `{{excerpt}}` — trecho do texto com a menção

3. Anote os três valores: Service ID, Template ID e Public Key (em Account → API Keys)
   
4. Na tela de login do xoxoLAB, expanda a seção **Notificações por Email** e informe:
   - Service ID
   - Template ID
   - Public Key
  
5. A partir daí, sempre que alguém usar @email em Avisos, Pautas, Kanban ou Políticas, o usuário mencionado receberá um e-mail automaticamente. Lembretes de Efemérides (7 dias e 1 dia antes) também são enviados quando o app está aberto.


## Configuração da integração com o Google Calendar (opcional)

A integração é opcional e requer um Client ID OAuth do Google Cloud. Siga os passos:

1. Acesse console.cloud.google.com

2. Crie um projeto (ou selecione um existente)

3. Ative a Google Calendar API em APIs e Serviços → Biblioteca

4. Em APIs e Serviços → Credenciais, clique em Criar credenciais → ID do cliente OAuth

5. Tipo de aplicativo: Aplicativo da Web

6. Em Origens JavaScript autorizadas, adicione a URL da sua instância do xoxoLAB (ex: https://xoxolab.ombudsmanviktor.me)

7. Copie o Client ID gerado

8. No xoxoLAB, acesse o módulo Efemérides e clique em Google Calendar

9. Cole o Client ID e clique em Conectar — uma janela do Google pedirá autorização

10. A partir daí, o calendário do Google aparece no módulo Efemérides, e novos eventos criados no xoxoLAB são inseridos automaticamente no Google Calendar.

**Atenção: o token de acesso expira após algumas horas. Ao expirar, o xoxoLAB avisa e basta clicar em Conectar novamente.**

---

## Módulos

| Módulo | Descrição |
|---|---|
| **Quadro de Avisos** | Matriz Eisenhower para priorização de avisos por iminência e empenho |
| **Pautas** | Lista de ideias editoriais por seções com DnD, encaminhamento para Conteúdos |
| **Conteúdos** | Tabela-roadmap de conteúdos em produção; integra Pautas → Kanban |
| **Kanban** | Quadro editorial com 5 colunas, agendamento automático, mídia e timeline |
| **Efemérides** | Calendário com recorrências, import ICS com undo e Google Calendar |
| **Políticas** | Wiki editorial com exportação em PDF, DOCX e Markdown |
| **Recursos** | Links úteis, documentação e templates de arquivos |
| **Equipe** | Visão consolidada de atribuições e menções por colaborador |
| **Senhas** | Cofre de credenciais armazenadas no repositório privado |

---

*xoxoLAB — Gestão editorial colaborativa · um projeto desenvolvido por [coLAB/UFF](https://colab-uff.github.io/)*
