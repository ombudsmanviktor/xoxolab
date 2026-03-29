// ─── In-memory demo store ──────────────────────────────────────────────────
// All data is reset on page reload — no persistence in demo mode.

import type {
  ProjectMeta,
  Aviso,
  PautaData,
  KanbanCard,
  Evento,
  Politica,
  RecursosData,
  SenhaRow,
  Attachment,
} from '@/types'

export const DEMO_PROJECT_ID = 'demo'
export const DEMO_EMAIL = 'demo@xoxolab.app'

const NOW = '2026-03-28T12:00:00.000Z'
const COLEGA = 'ana@equipe.com'

// ─── Seed data ─────────────────────────────────────────────────────────────

const DEMO_META: ProjectMeta = {
  id: DEMO_PROJECT_ID,
  name: 'coLAB Social · Demo',
  createdBy: DEMO_EMAIL,
  users: [DEMO_EMAIL, COLEGA],
  createdAt: NOW,
  updatedAt: NOW,
}

const DEMO_AVISOS: Aviso[] = [
  {
    id: 'av1', priority: 'critico',
    title: 'Crise de imagem — comentários negativos viralizando no Instagram',
    body: 'Um post antigo foi resgatado e está gerando repercussão negativa. Precisamos de **nota de resposta urgente** e planejamento de contenção.\n\n@ana@equipe.com pode coordenar a resposta?',
    author: DEMO_EMAIL, done: false, mentions: [COLEGA], attachments: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'av2', priority: 'estrutural',
    title: 'Planejamento do calendário editorial Q2 2026',
    body: 'Definir temas e datas de publicação para Abril, Maio e Junho. Incluir datas comemorativas e campanhas sazonais.',
    author: DEMO_EMAIL, done: false, mentions: [], attachments: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'av3', priority: 'operacional',
    title: 'Publicar Reels de quinta-feira até às 18h',
    body: 'O vídeo já está aprovado e editado. Subir no Instagram e Tiktok com legendas e hashtags padronizadas.',
    author: COLEGA, done: false, mentions: [], attachments: [],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'av4', priority: 'residual',
    title: 'Atualizar bio do perfil no LinkedIn',
    body: 'Bio está desatualizada — não menciona o novo serviço de consultoria lançado em janeiro.',
    author: DEMO_EMAIL, done: false, mentions: [], attachments: [],
    createdAt: NOW, updatedAt: NOW,
  },
]

const DEMO_PAUTAS: PautaData = {
  sections: [
    { id: 's1', title: 'Conteúdo Orgânico', order: 0 },
    { id: 's2', title: 'Campanhas Pagas', order: 1 },
  ],
  tags: [
    { id: 't1', label: 'Instagram', color: '#e1306c' },
    { id: 't2', label: 'LinkedIn', color: '#0077b5' },
    { id: 't3', label: 'Urgente', color: '#ef4444' },
  ],
  items: [
    {
      id: 'pi1', title: 'Post sobre o Dia do Trabalho', sectionId: 's1',
      body: 'Carrossel com reflexões sobre trabalho criativo e cultura colaborativa. Tom leve e inspiracional.',
      tags: ['t1', 't2'], attachments: [], mentions: [], order: 0,
      dueDate: '2026-05-01', createdAt: NOW, updatedAt: NOW,
    },
    {
      id: 'pi2', title: 'Carrossel: 5 dicas para equipes de conteúdo', sectionId: 's1',
      body: 'Dicas práticas de organização, ferramentas e processos para equipes pequenas de comunicação.',
      tags: ['t1'], attachments: [], mentions: [], order: 1,
      createdAt: NOW, updatedAt: NOW,
    },
    {
      id: 'pi3', title: 'Brief para campanha do Dia das Mães', sectionId: 's2',
      body: 'Desenvolver conceito criativo e textos para os anúncios. Orçamento: R$1.200. @ana@equipe.com responsável.',
      tags: ['t3'], attachments: [], mentions: [COLEGA], order: 0,
      dueDate: '2026-05-11', createdAt: NOW, updatedAt: NOW,
    },
  ],
}

const logEntry = (action: string, author = DEMO_EMAIL) => ({
  id: Math.random().toString(36).slice(2),
  timestamp: NOW,
  action,
  author,
})

const DEMO_KANBAN: KanbanCard[] = [
  {
    id: 'kc1', title: 'Reels sobre bastidores do evento anual', column: 'criacao', order: 0,
    description: 'Vídeo de 30s mostrando a equipe e o processo criativo do evento. Edição em andamento.',
    priority: 'media', platforms: ['instagram', 'tiktok'], assignee: COLEGA,
    dueDate: '2026-04-10', attachments: [], mentions: [], pautaId: undefined,
    log: [logEntry('Criado por demo@xoxolab.app'), logEntry('Movido para Em Construção', COLEGA)],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'kc2', title: 'Post comemorativo — 10k seguidores', column: 'revisao-aprovacao', order: 0,
    description: 'Agradecimento à comunidade pelos 10 mil seguidores no Instagram. Incluir enquete nos stories.',
    priority: 'alta', platforms: ['instagram'], assignee: DEMO_EMAIL,
    attachments: [], mentions: [], pautaId: undefined,
    log: [logEntry('Criado por demo@xoxolab.app'), logEntry('Movido para Em Revisão')],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'kc3', title: 'Campanha Dia das Mães — criativos', column: 'agendamento', order: 0,
    description: 'Pacote de 4 artes + 2 vídeos curtos para feed e stories. Aprovação pendente do cliente.',
    priority: 'alta', platforms: ['instagram', 'facebook'], assignee: COLEGA,
    dueDate: '2026-05-09', attachments: [], mentions: [COLEGA], pautaId: 'pi3',
    log: [logEntry('Criado por demo@xoxolab.app'), logEntry('Movido para Ag. Aprovação', COLEGA)],
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'kc4', title: 'Stories de Semana Santa', column: 'publicacao', order: 0,
    description: 'Série de 5 stories com mensagem institucional. Publicado com sucesso.',
    priority: 'baixa', platforms: ['instagram'], assignee: DEMO_EMAIL,
    attachments: [], mentions: [], pautaId: undefined,
    log: [logEntry('Criado por demo@xoxolab.app'), logEntry('Finalizado')],
    createdAt: NOW, updatedAt: NOW,
  },
]

const DEMO_EVENTOS: Evento[] = [
  {
    id: 'ev1', title: 'Tiradentes', date: '2026-04-21', tags: ['feriado'],
    recurrence: 'yearly', description: 'Feriado nacional. Programar posts temáticos com antecedência.',
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'ev2', title: 'Dia do Trabalho', date: '2026-05-01', tags: ['feriado'],
    recurrence: 'yearly', description: 'Publicar carrossel inspiracional sobre trabalho criativo.',
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'ev3', title: 'Dia das Mães', date: '2026-05-11', tags: ['campanha'],
    recurrence: 'yearly', description: 'Campanha principal do mês. Ver kanban para detalhes dos criativos.',
    createdAt: NOW, updatedAt: NOW,
  },
  {
    id: 'ev4', title: 'Reunião Editorial Mensal', date: '2026-04-04', tags: ['reunião'],
    recurrence: 'monthly', description: 'Alinhamento de pauta, revisão de métricas e planejamento do mês seguinte.',
    createdAt: NOW, updatedAt: NOW,
  },
]

const DEMO_POLITICAS: Politica[] = [
  {
    id: 'pol1',
    title: 'Tom de Voz',
    body: `## Como nos comunicamos

Nossa comunicação é **próxima, direta e autêntica** — falamos com pessoas, não para elas.

### Princípios

- **Clareza antes de tudo**: frases curtas, vocabulário acessível
- **Sem jargões corporativos**: "reunião" em vez de "meetup", "objetivo" em vez de "KPI" quando falando com o público
- **Emojis com moderação**: um ou dois por post, quando reforçam a mensagem
- **Evitamos**: clichês de marketing, superlativos vazios ("o melhor", "revolucionário")

### Por plataforma

| Plataforma | Tom | Formato preferido |
|---|---|---|
| Instagram | Descontraído, visual | Carrosséis, Reels curtos |
| LinkedIn | Profissional mas humano | Artigos, posts de texto |
| Facebook | Comunitário | Posts com imagem, lives |

### Respostas a comentários

Sempre responder em **até 2 horas** em dias úteis. Em situações de crise, escalar imediatamente para @${DEMO_EMAIL}.`,
    mentions: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'pol2',
    title: 'Fluxo de Aprovação de Conteúdo',
    body: `## Etapas obrigatórias antes de publicar

\`\`\`
Criação → Revisão interna → Aprovação do cliente → Publicação
\`\`\`

### 1. Criação
- Seguir o briefing aprovado
- Usar sempre os assets do Drive de Criativos

### 2. Revisão interna
- Ortografia e gramática (use o Languagetool)
- Aderência ao tom de voz
- Links e @menções corretos

### 3. Aprovação do cliente
- Enviar via WhatsApp com antecedência mínima de **48h**
- Aguardar confirmação **por escrito**

### 4. Publicação
- Horários preferenciais: 8h, 12h, 18h
- Registrar no Kanban como "Finalizado" após publicar`,
    mentions: [],
    createdAt: NOW,
    updatedAt: NOW,
  },
]

const DEMO_RECURSOS: RecursosData = {
  recursos: [
    {
      id: 'r1', title: 'Drive de Criativos',
      url: 'https://drive.google.com',
      description: 'Pasta compartilhada com todos os assets, logos e templates de arte.',
      category: 'Drive', order: 0, createdAt: NOW,
    },
    {
      id: 'r2', title: 'Relatório de Analytics',
      url: 'https://analytics.google.com',
      description: 'Dashboard de métricas das redes sociais — atualizado semanalmente.',
      category: 'Analytics', order: 1, createdAt: NOW,
    },
    {
      id: 'r3', title: 'Canva — Workspace da equipe',
      url: 'https://www.canva.com',
      description: 'Templates de posts, stories e apresentações da marca.',
      category: 'Design', order: 2, createdAt: NOW,
    },
  ],
  templates: [],
}

const DEMO_SENHAS: SenhaRow[] = [
  {
    id: 'sn1', service: 'Instagram', url: 'https://instagram.com',
    login: 'colab.social', password: 'demo-password-123',
    platformId: 'instagram', notes: 'Conta principal da marca', order: 0,
    children: [
      {
        id: 'sn1a', service: 'Instagram — conta pessoal do gestor',
        login: 'ana.gestora', password: 'demo-senha-456',
        platformId: 'instagram', order: 0,
      },
    ],
  },
  {
    id: 'sn2', service: 'Facebook', url: 'https://facebook.com',
    login: 'colab.social@gmail.com', password: 'demo-pass-789',
    platformId: 'facebook', order: 1,
  },
  {
    id: 'sn3', service: 'Canva', url: 'https://canva.com',
    login: 'social@colab.com.br', password: 'canva-demo-000',
    notes: 'Plano Pro — 5 licenças', order: 2,
  },
]

// ─── Mutable store ─────────────────────────────────────────────────────────

interface DemoStore {
  meta: ProjectMeta
  avisos: Aviso[]
  pautas: PautaData
  kanban: KanbanCard[]
  eventos: Evento[]
  politicas: Politica[]
  recursos: RecursosData
  senhas: SenhaRow[]
}

function buildInitialStore(): DemoStore {
  return {
    meta: { ...DEMO_META },
    avisos: DEMO_AVISOS.map(a => ({ ...a })),
    pautas: JSON.parse(JSON.stringify(DEMO_PAUTAS)),
    kanban: DEMO_KANBAN.map(c => ({ ...c, log: [...c.log] })),
    eventos: DEMO_EVENTOS.map(e => ({ ...e })),
    politicas: DEMO_POLITICAS.map(p => ({ ...p })),
    recursos: JSON.parse(JSON.stringify(DEMO_RECURSOS)),
    senhas: JSON.parse(JSON.stringify(DEMO_SENHAS)),
  }
}

let _isDemoMode = false
let _store: DemoStore = buildInitialStore()

export function isDemoMode(): boolean {
  return _isDemoMode
}

export function setDemoMode(enabled: boolean): void {
  _isDemoMode = enabled
  if (enabled) _store = buildInitialStore()
}

// ─── Store accessors ────────────────────────────────────────────────────────

export function demoListProjects(): ProjectMeta[] {
  return [_store.meta]
}

export function demoLoadProjectMeta(): ProjectMeta {
  return _store.meta
}

export function demoSaveProjectMeta(meta: ProjectMeta): void {
  _store.meta = meta
}

export function demoLoadAvisos(): Aviso[] {
  return [..._store.avisos]
}

export function demoSaveAviso(aviso: Aviso): void {
  const idx = _store.avisos.findIndex(a => a.id === aviso.id)
  if (idx >= 0) _store.avisos[idx] = aviso
  else _store.avisos.push(aviso)
}

export function demoDeleteAviso(id: string): void {
  _store.avisos = _store.avisos.filter(a => a.id !== id)
}

export function demoLoadPautas(): PautaData {
  return JSON.parse(JSON.stringify(_store.pautas))
}

export function demoSavePautas(data: PautaData): void {
  _store.pautas = JSON.parse(JSON.stringify(data))
}

export function demoLoadKanban(): KanbanCard[] {
  return _store.kanban.map(c => ({ ...c }))
}

export function demoSaveKanbanCard(card: KanbanCard): void {
  const idx = _store.kanban.findIndex(c => c.id === card.id)
  if (idx >= 0) _store.kanban[idx] = card
  else _store.kanban.push(card)
}

export function demoDeleteKanbanCard(id: string): void {
  _store.kanban = _store.kanban.filter(c => c.id !== id)
}

export function demoLoadEventos(): Evento[] {
  return _store.eventos.map(e => ({ ...e }))
}

export function demoSaveEventos(eventos: Evento[]): void {
  _store.eventos = eventos.map(e => ({ ...e }))
}

export function demoLoadPoliticas(): Politica[] {
  return [..._store.politicas]
}

export function demoSavePolitica(politica: Politica): void {
  const idx = _store.politicas.findIndex(p => p.id === politica.id)
  if (idx >= 0) _store.politicas[idx] = politica
  else _store.politicas.push(politica)
}

export function demoDeletPolitica(id: string): void {
  _store.politicas = _store.politicas.filter(p => p.id !== id)
}

export function demoLoadRecursos(): RecursosData {
  return JSON.parse(JSON.stringify(_store.recursos))
}

export function demoSaveRecursos(data: RecursosData): void {
  _store.recursos = JSON.parse(JSON.stringify(data))
}

export function demoLoadSenhas(): SenhaRow[] {
  return JSON.parse(JSON.stringify(_store.senhas))
}

export function demoSaveSenhas(senhas: SenhaRow[]): void {
  _store.senhas = JSON.parse(JSON.stringify(senhas))
}

export function demoUploadAttachment(file: File): Attachment {
  return {
    id: Math.random().toString(36).slice(2),
    name: file.name,
    size: file.size,
    type: file.type,
    path: `demo/${file.name}`,
    url: URL.createObjectURL(file),
  }
}
