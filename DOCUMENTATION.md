# xoxoLAB — Documentação

**Gestão colaborativa de mídias sociais**

xoxoLAB é uma aplicação web para equipes de comunicação e redes sociais organizarem pautas, aprovações, políticas editoriais e muito mais — sem depender de servidores próprios. Todos os dados são armazenados em um repositório GitHub privado no formato YAML.

🔗 **Demo:** [xoxolab.ombudsmanviktor.me](https://xoxolab.ombudsmanviktor.me)

---

## Descrição Geral

O xoxoLAB é uma ferramenta de gestão editorial colaborativa voltada para equipes de comunicação e mídias sociais. Ele permite que múltiplos colaboradores trabalhem juntos na organização de pautas, conteúdos, calendários e políticas editoriais, com persistência de dados via GitHub API — sem necessidade de backend próprio ou banco de dados.

**Principais características:**
- **Zero backend**: todos os dados ficam no repositório GitHub privado da equipe
- **Multi-projeto**: cada equipe pode criar e gerenciar múltiplos projetos
- **Multi-usuário**: colaboradores são convidados por e-mail; cada um acessa com seu próprio GitHub PAT
- **Notificações por @menção**: sistema de menções com notificações via EmailJS
- **Modo demonstração**: permite explorar o app sem criar conta
- **Deploy facilitado**: qualquer pessoa pode hospedar uma instância própria via GitHub Pages com um simples Fork

---

## Stack Técnica

| Categoria | Tecnologia | Versão |
|---|---|---|
| **Linguagem** | TypeScript | ~5.9.3 |
| **UI Framework** | React | 19.x |
| **Build Tool** | Vite | 7.x |
| **Estilização** | Tailwind CSS | 4.x |
| **Componentes** | Radix UI | (múltiplos) |
| **Ícones** | Lucide React | 0.577.x |
| **Roteamento** | React Router v7 | HashRouter |
| **Estado/Cache** | TanStack React Query | v5 |
| **Storage** | GitHub REST API (YAML) | — |
| **YAML parser** | js-yaml | 4.x |
| **Drag & Drop** | @hello-pangea/dnd | 18.x |
| **Notificações** | @emailjs/browser | 4.x |
| **Markdown** | react-markdown + remark-gfm | 9.x / 4.x |
| **Datas** | date-fns | 4.x |
| **Export PDF** | jsPDF + jspdf-autotable | 4.x |
| **Export Excel** | xlsx | 0.18.x |
| **Export Word** | docx | 9.x |
| **Export PNG** | html2canvas | 1.4.x |
| **Deploy** | gh-pages / GitHub Actions | — |

---

## Screenshots

### Login
![Login](screenshots/00-login.png)

### Meus Projetos
![Projetos](screenshots/01-projects.png)

### Quadro de Avisos
![Avisos](screenshots/02-avisos.png)

### Pautas
![Pautas](screenshots/03-pautas.png)

### Kanban
![Kanban](screenshots/04-kanban.png)

### Efemérides
![Efemérides](screenshots/05-efemerides.png)

### Políticas
![Políticas](screenshots/06-politicas.png)

### Recursos
![Recursos](screenshots/07-recursos.png)

### Equipe
![Equipe](screenshots/08-equipe.png)

### Senhas
![Senhas](screenshots/09-senhas.png)

---

## Módulos e Funcionalidades

### 1. Quadro de Avisos
Matriz Eisenhower para priorização de comunicados internos da equipe.

- **4 quadrantes** organizados por eixos de Iminência (horizontal) e Empenho (vertical): Crítico, Estrutural, Operacional, Residual
- Cards com título, descrição em Markdown, prioridade, suporte a @menções
- Click no marcador colorido arquiva o card na área "Concluídos" (colapsável)
- **Export**: PNG, PDF (paisagem), Excel, Markdown

### 2. Pautas
Lista editorial organizada por seções, com suporte a drag-and-drop.

- Seções customizáveis (criar, reordenar, excluir)
- Itens com título, corpo em Markdown, tags coloridas, data, responsável e @menções
- Reordenação de itens por DnD dentro e entre seções
- Quick-add por Enter direto na lista
- Sincronização com Kanban: itens de Pauta aparecem automaticamente na coluna "Pautas" do Kanban
- **Export**: PDF, Excel, CSV, Markdown

### 3. Kanban
Quadro de gestão de conteúdo por etapas com timeline visual.

- **6 colunas**: Pautas · Em Construção · Em Revisão · Aguardando Aprovação · Divulgação · Finalizadas
- Colunas "Pautas" e "Finalizadas" retráteis; demais sempre visíveis
- Cards com: título, descrição Markdown, prioridade, plataformas de publicação, responsável, prazo, imagens/vídeos
- Contorno `border-l-4` colorido pela plataforma primária do card
- Log de auditoria por card (ações timestampadas: criação, movimentação, atribuição, edição)
- Botão de compartilhamento direto nas plataformas configuradas
- **Timeline** acima do quadro: chips coloridos por plataforma, sincronizada com a largura do board, zoom in/out
- **Export**: PDF da timeline (retrato), PNG/PDF/Excel/CSV/Markdown do board

### 4. Efemérides
Calendário de eventos importantes, datas comemorativas e lembretes.

- Grid mensal React puro (sem biblioteca de calendário externa), navegação por meses
- Eventos manuais com recorrência: anual, mensal, semanal, sem recorrência
- **Eventos sintéticos** (faded, não editáveis): itens de Pautas com prazo e cards de Kanban com prazo aparecem automaticamente no calendário
- Lembretes automáticos por e-mail (EmailJS) com 7 e 1 dia de antecedência
- **Import**: arquivos `.ics` (Google Calendar, Apple Calendar etc.)
- **Export**: `.ics`, Markdown

### 5. Políticas
Wiki editorial da equipe com documentos em Markdown.

- Lista de documentos com título e corpo em Markdown (editor com preview)
- Criação, edição e exclusão de políticas
- **Export por documento**: Markdown, DOCX, PDF
- **Exportar Tudo**: gera PDF, DOCX ou Markdown com todos os documentos concatenados

### 6. Recursos
Central de links úteis, documentação e arquivos de template.

- **Aba Links**: lista de recursos externos com título, URL, descrição e categoria; auto-fetch do título da página
- **Aba Templates**: upload de arquivos para o repositório GitHub (`recursos/templates/`); download direto; aviso para arquivos >50MB
- Ordenação e organização por categorias

### 7. Equipe
Visão consolidada das atribuições e menções por colaborador.

- Lista todos os membros do projeto (cadastrados no `meta.yaml`)
- Para cada membro: avatar com iniciais, lista de @menções em Avisos/Pautas/Kanban/Políticas e atribuições no Kanban
- Calculado em runtime via `useMemo` (sem storage próprio)

### 8. Senhas
Cofre de credenciais armazenadas no repositório GitHub privado.

- Tabela com linhas expansíveis (serviço pai + múltiplas contas filho)
- Colunas: plataforma, serviço, URL, login, senha (oculta por padrão com toggle), notas
- Adição e edição inline ou via dialog
- Armazenado em `senhas/senhas.yaml` no repositório privado da equipe
- **Sem exportação** (por segurança)

---

## Estrutura de Dados no GitHub

```
projects/
  {project-id}/
    meta.yaml               # name, createdBy, users: [email...]
    avisos/{card-id}.yaml
    pautas/pautas.yaml      # { sections, items, tags }
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

### Pré-requisitos

- **Node.js** 18 ou superior
- **npm** 9 ou superior
- Conta no **GitHub** com um repositório privado para armazenar os dados
- **GitHub Personal Access Token (PAT)** com escopo `repo`

### Opção 1 — Uso da instância pública

Acesse diretamente [xoxolab.ombudsmanviktor.me](https://xoxolab.ombudsmanviktor.me) e informe seu e-mail, PAT e o endereço do repositório de dados.

Nenhuma instalação necessária.

---

### Opção 2 — Deploy próprio via Fork (recomendado)

Hospede sua própria instância no GitHub Pages em menos de 5 minutos.

**1. Fork do repositório**

Acesse [github.com/ombudsmanviktor/xoxolab](https://github.com/ombudsmanviktor/xoxolab) e clique em **Fork**.

**2. Habilitar GitHub Actions no fork**

- Acesse *Settings → Actions → General*
- Selecione **Allow all actions and reusable workflows**
- Clique em **Save**

**3. Configurar GitHub Pages**

- Acesse *Settings → Pages*
- Em *Source*, selecione **GitHub Actions**
- Clique em **Save**

**4. Disparar o primeiro deploy**

- Acesse *Actions → Deploy to GitHub Pages*
- Clique em **Run workflow → Run workflow**

**5. Aguardar (~2 minutos)**

A aplicação estará disponível em:
```
https://SEU_USUARIO.github.io/xoxolab/
```

**Domínio customizado (opcional)**

1. Edite `public/CNAME` com o seu domínio
2. Configure o DNS apontando para `SEU_USUARIO.github.io`
3. Em *Settings → Pages*, informe o domínio customizado

**Atualizações**

Use *Sync fork → Update branch* na página do fork. O deploy ocorre automaticamente a cada sincronização.

---

### Opção 3 — Desenvolvimento local

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

1. Crie uma conta em [emailjs.com](https://www.emailjs.com)
2. Configure um **Email Service** e um **Email Template** com as variáveis:
   - `{{from_email}}` — remetente
   - `{{to_email}}` — destinatário
   - `{{project_name}}` — nome do projeto
   - `{{module_name}}` — módulo onde a menção ocorreu
   - `{{excerpt}}` — trecho do texto com a menção
3. Na tela de login do xoxoLAB, expanda a seção **Notificações por Email** e informe:
   - Service ID
   - Template ID
   - Public Key

---

## Licença

MIT — livre para uso, modificação e distribuição.
