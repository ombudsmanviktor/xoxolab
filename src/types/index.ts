// ─── Shared ───────────────────────────────────────────────────────────────

export interface Attachment {
  id: string
  name: string
  size: number
  type: string
  path: string
  url?: string
}

// ─── Projects ─────────────────────────────────────────────────────────────

export interface ProjectMeta {
  id: string
  name: string
  createdBy: string
  users: string[]
  createdAt: string
  updatedAt: string
}

export interface UsersIndex {
  emails: string[]
}

// ─── Avisos (Quadro de Avisos) ────────────────────────────────────────────

export type AvisoPriority = 'critico' | 'estrutural' | 'operacional' | 'residual'

export interface Aviso {
  id: string
  title: string
  body: string
  priority: AvisoPriority
  author: string
  done: boolean
  doneAt?: string
  mentions: string[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

// ─── Pautas ───────────────────────────────────────────────────────────────

export interface PautaTag {
  id: string
  label: string
  color: string
}

export interface PautaItem {
  id: string
  title: string
  body?: string
  order: number
  sectionId?: string
  tags: string[]
  attachments: Attachment[]
  mentions: string[]
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface PautaSection {
  id: string
  title: string
  order: number
}

export interface PautaData {
  sections: PautaSection[]
  items: PautaItem[]
  tags: PautaTag[]
}

// ─── Kanban ───────────────────────────────────────────────────────────────

export type KanbanColumn =
  | 'pautas'
  | 'em-construcao'
  | 'em-revisao'
  | 'aguardando-aprovacao'
  | 'divulgacao'
  | 'finalizado'

export type KanbanPriority = 'baixa' | 'media' | 'alta' | 'urgente'

export interface KanbanLogEntry {
  id: string
  timestamp: string
  action: string
  author: string
}

export interface KanbanCard {
  id: string
  title: string
  description: string
  column: KanbanColumn
  order: number
  priority?: KanbanPriority
  platforms: string[]
  assignee?: string
  dueDate?: string
  attachments: Attachment[]
  log: KanbanLogEntry[]
  mentions: string[]
  pautaId?: string
  createdAt: string
  updatedAt: string
}

// ─── Efemérides ───────────────────────────────────────────────────────────

export type RecurrenceType = 'none' | 'yearly' | 'monthly' | 'weekly'

export interface Evento {
  id: string
  title: string
  date: string
  endDate?: string
  tags: string[]
  recurrence: RecurrenceType
  description?: string
  sourceModule?: 'pautas' | 'avisos' | 'kanban' | 'google'
  sourceId?: string
  notified7?: boolean
  notified1?: boolean
  createdAt: string
  updatedAt: string
}

// ─── Políticas ────────────────────────────────────────────────────────────

export interface Politica {
  id: string
  title: string
  body: string
  mentions: string[]
  createdAt: string
  updatedAt: string
}

// ─── Recursos e Templates ─────────────────────────────────────────────────

export interface Recurso {
  id: string
  title: string
  url: string
  description?: string
  category?: string
  order: number
  createdAt: string
}

export interface Template {
  id: string
  name: string
  path: string
  url?: string
  size: number
  type: string
  uploadedAt: string
}

export interface RecursosData {
  recursos: Recurso[]
  templates: Template[]
}

// ─── Senhas ───────────────────────────────────────────────────────────────

export interface SenhaRow {
  id: string
  service: string
  url?: string
  login: string
  password: string
  notes?: string
  platformId?: string
  order: number
  children?: SenhaRow[]
}
