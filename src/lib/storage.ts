// ─── Project-scoped GitHub YAML storage ───────────────────────────────────

import yaml from 'js-yaml'
import {
  getGitHubConfig,
  readFile,
  writeTextFile,
  deleteFile,
  listDirectory,
  writeBinaryFile,
  getRawUrl,
  decodeContent,
  type GitHubConfig,
} from './github'
import type {
  ProjectMeta,
  UsersIndex,
  Aviso,
  PautaData,
  KanbanCard,
  Evento,
  Politica,
  RecursosData,
  SenhaRow,
  Attachment,
} from '@/types'
import { generateId } from './utils'
import {
  isDemoMode,
  demoListProjects, demoLoadProjectMeta, demoSaveProjectMeta,
  demoLoadAvisos, demoSaveAviso, demoDeleteAviso,
  demoLoadPautas, demoSavePautas,
  demoLoadKanban, demoSaveKanbanCard, demoDeleteKanbanCard,
  demoLoadEventos, demoSaveEventos,
  demoLoadPoliticas, demoSavePolitica, demoDeletPolitica,
  demoLoadRecursos, demoSaveRecursos,
  demoLoadSenhas, demoSaveSenhas,
  demoUploadAttachment,
} from './demoStore'

// ─── SHA cache ────────────────────────────────────────────────────────────

const shaCache = new Map<string, string>()

function cfg(): GitHubConfig {
  const c = getGitHubConfig()
  if (!c) throw new Error('GitHub not configured')
  return c
}

// ─── YAML helpers ─────────────────────────────────────────────────────────

async function readYaml<T>(path: string): Promise<T | null> {
  try {
    const file = await readFile(cfg(), path)
    shaCache.set(path, file.sha)
    const text = decodeContent(file.content)
    return yaml.load(text) as T
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Not Found') || msg.includes('404') || msg.toLowerCase().includes('empty')) return null
    throw err
  }
}

async function writeYaml<T>(path: string, data: T, message: string): Promise<void> {
  const text = yaml.dump(data, { lineWidth: -1 })
  const sha = shaCache.get(path)
  const res = await writeTextFile(cfg(), path, text, message, sha)
  shaCache.set(path, res.content.sha)
}

async function removeYaml(path: string, message: string): Promise<void> {
  const sha = shaCache.get(path)
  if (!sha) {
    try {
      const file = await readFile(cfg(), path)
      await deleteFile(cfg(), path, file.sha, message)
    } catch {
      return
    }
    return
  }
  await deleteFile(cfg(), path, sha, message)
  shaCache.delete(path)
}

// ─── Users index ──────────────────────────────────────────────────────────

export async function loadUsersIndex(): Promise<string[]> {
  if (isDemoMode()) return []
  const data = await readYaml<UsersIndex>('users/index.yaml')
  return data?.emails ?? []
}

export async function registerUserEmail(email: string): Promise<void> {
  if (isDemoMode()) return
  const emails = await loadUsersIndex()
  if (emails.includes(email)) return
  await writeYaml<UsersIndex>('users/index.yaml', { emails: [...emails, email] }, `Register user ${email}`)
}

// ─── Projects ─────────────────────────────────────────────────────────────

export async function listProjects(currentEmail: string): Promise<ProjectMeta[]> {
  if (isDemoMode()) return demoListProjects()
  try {
    const entries = await listDirectory(cfg(), 'projects')
    const dirs = entries.filter(e => e.type === 'dir')
    const metas = await Promise.all(
      dirs.map(d => readYaml<ProjectMeta>(`projects/${d.name}/meta.yaml`))
    )
    return metas
      .filter((m): m is ProjectMeta => m !== null)
      .filter(m => m.users.includes(currentEmail))
  } catch {
    return []
  }
}

export async function loadProjectMeta(projectId: string): Promise<ProjectMeta | null> {
  if (isDemoMode()) return demoLoadProjectMeta()
  return readYaml<ProjectMeta>(`projects/${projectId}/meta.yaml`)
}

export async function saveProjectMeta(meta: ProjectMeta): Promise<void> {
  if (isDemoMode()) { demoSaveProjectMeta(meta); return }
  await writeYaml(
    `projects/${meta.id}/meta.yaml`,
    meta,
    `Update project ${meta.name}`
  )
}

export async function createProject(
  name: string,
  createdBy: string,
  users: string[]
): Promise<ProjectMeta> {
  const id = generateId()
  const now = new Date().toISOString()
  const meta: ProjectMeta = {
    id,
    name,
    createdBy,
    users: [...new Set([createdBy, ...users])],
    createdAt: now,
    updatedAt: now,
  }
  await saveProjectMeta(meta)
  return meta
}

export async function deleteProject(projectId: string): Promise<void> {
  if (isDemoMode()) return
  // Delete meta; other files orphan (private repo, acceptable)
  const path = `projects/${projectId}/meta.yaml`
  await removeYaml(path, `Delete project ${projectId}`)
}

// ─── Avisos ───────────────────────────────────────────────────────────────

export async function loadAvisos(projectId: string): Promise<Aviso[]> {
  if (isDemoMode()) return demoLoadAvisos()
  try {
    const entries = await listDirectory(cfg(), `projects/${projectId}/avisos`)
    const files = entries.filter(e => e.type === 'file' && e.name.endsWith('.yaml'))
    const avisos = await Promise.all(
      files.map(f => readYaml<Aviso>(`projects/${projectId}/avisos/${f.name}`))
    )
    return avisos
      .filter((a): a is Aviso => a !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch {
    return []
  }
}

export async function saveAviso(projectId: string, aviso: Aviso): Promise<void> {
  if (isDemoMode()) { demoSaveAviso(aviso); return }
  const path = `projects/${projectId}/avisos/${aviso.id}.yaml`
  await writeYaml(path, aviso, `Save aviso ${aviso.id}`)
}

export async function deleteAviso(projectId: string, avisoId: string): Promise<void> {
  if (isDemoMode()) { demoDeleteAviso(avisoId); return }
  await removeYaml(`projects/${projectId}/avisos/${avisoId}.yaml`, `Delete aviso ${avisoId}`)
}

// ─── Pautas ───────────────────────────────────────────────────────────────

const EMPTY_PAUTAS: PautaData = { sections: [], items: [], tags: [] }

export async function loadPautas(projectId: string): Promise<PautaData> {
  if (isDemoMode()) return demoLoadPautas()
  const data = await readYaml<PautaData>(`projects/${projectId}/pautas/pautas.yaml`)
  return data ?? EMPTY_PAUTAS
}

export async function savePautas(projectId: string, data: PautaData): Promise<void> {
  if (isDemoMode()) { demoSavePautas(data); return }
  await writeYaml(`projects/${projectId}/pautas/pautas.yaml`, data, 'Update pautas')
}

// ─── Kanban ───────────────────────────────────────────────────────────────

export async function loadKanbanCards(projectId: string): Promise<KanbanCard[]> {
  if (isDemoMode()) return demoLoadKanban()
  try {
    const entries = await listDirectory(cfg(), `projects/${projectId}/kanban`)
    const files = entries.filter(e => e.type === 'file' && e.name.endsWith('.yaml'))
    const cards = await Promise.all(
      files.map(f => readYaml<KanbanCard>(`projects/${projectId}/kanban/${f.name}`))
    )
    return cards
      .filter((c): c is KanbanCard => c !== null)
      .sort((a, b) => a.order - b.order)
  } catch {
    return []
  }
}

export async function saveKanbanCard(projectId: string, card: KanbanCard): Promise<void> {
  if (isDemoMode()) { demoSaveKanbanCard(card); return }
  const path = `projects/${projectId}/kanban/${card.id}.yaml`
  await writeYaml(path, card, `Save kanban card ${card.id}`)
}

export async function deleteKanbanCard(projectId: string, cardId: string): Promise<void> {
  if (isDemoMode()) { demoDeleteKanbanCard(cardId); return }
  await removeYaml(`projects/${projectId}/kanban/${cardId}.yaml`, `Delete kanban card ${cardId}`)
}

// ─── Efemérides ───────────────────────────────────────────────────────────

export async function loadEventos(projectId: string): Promise<Evento[]> {
  if (isDemoMode()) return demoLoadEventos()
  const data = await readYaml<{ eventos: Evento[] }>(`projects/${projectId}/efemerides/eventos.yaml`)
  return data?.eventos ?? []
}

export async function saveEventos(projectId: string, eventos: Evento[]): Promise<void> {
  if (isDemoMode()) { demoSaveEventos(eventos); return }
  await writeYaml(
    `projects/${projectId}/efemerides/eventos.yaml`,
    { eventos },
    'Update efemérides'
  )
}

// ─── Políticas ────────────────────────────────────────────────────────────

export async function loadPoliticas(projectId: string): Promise<Politica[]> {
  if (isDemoMode()) return demoLoadPoliticas()
  try {
    const entries = await listDirectory(cfg(), `projects/${projectId}/politicas`)
    const files = entries.filter(e => e.type === 'file' && e.name.endsWith('.yaml'))
    const politicas = await Promise.all(
      files.map(f => readYaml<Politica>(`projects/${projectId}/politicas/${f.name}`))
    )
    return politicas
      .filter((p): p is Politica => p !== null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  } catch {
    return []
  }
}

export async function savePolitica(projectId: string, politica: Politica): Promise<void> {
  if (isDemoMode()) { demoSavePolitica(politica); return }
  await writeYaml(
    `projects/${projectId}/politicas/${politica.id}.yaml`,
    politica,
    `Save política ${politica.id}`
  )
}

export async function deletePolitica(projectId: string, politicaId: string): Promise<void> {
  if (isDemoMode()) { demoDeletPolitica(politicaId); return }
  await removeYaml(
    `projects/${projectId}/politicas/${politicaId}.yaml`,
    `Delete política ${politicaId}`
  )
}

// ─── Recursos ─────────────────────────────────────────────────────────────

const EMPTY_RECURSOS: RecursosData = { recursos: [], templates: [] }

export async function loadRecursos(projectId: string): Promise<RecursosData> {
  if (isDemoMode()) return demoLoadRecursos()
  const data = await readYaml<RecursosData>(`projects/${projectId}/recursos/recursos.yaml`)
  return data ?? EMPTY_RECURSOS
}

export async function saveRecursos(projectId: string, data: RecursosData): Promise<void> {
  if (isDemoMode()) { demoSaveRecursos(data); return }
  await writeYaml(`projects/${projectId}/recursos/recursos.yaml`, data, 'Update recursos')
}

export async function uploadTemplate(
  projectId: string,
  file: File
): Promise<Attachment> {
  if (isDemoMode()) return demoUploadAttachment(file)
  const id = generateId()
  const path = `projects/${projectId}/recursos/templates/${id}-${file.name}`
  const res = await writeBinaryFile(cfg(), path, file, `Upload template ${file.name}`)
  shaCache.set(path, res.content.sha)
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    url: getRawUrl(cfg(), path),
  }
}

// ─── Senhas ───────────────────────────────────────────────────────────────

export async function loadSenhas(projectId: string): Promise<SenhaRow[]> {
  if (isDemoMode()) return demoLoadSenhas()
  const data = await readYaml<{ senhas: SenhaRow[] }>(`projects/${projectId}/senhas/senhas.yaml`)
  return data?.senhas ?? []
}

export async function saveSenhas(projectId: string, senhas: SenhaRow[]): Promise<void> {
  if (isDemoMode()) { demoSaveSenhas(senhas); return }
  await writeYaml(`projects/${projectId}/senhas/senhas.yaml`, { senhas }, 'Update senhas')
}

// ─── Kanban attachments ───────────────────────────────────────────────────

export async function uploadKanbanAttachment(
  projectId: string,
  cardId: string,
  file: File
): Promise<Attachment> {
  if (isDemoMode()) return demoUploadAttachment(file)
  const id = generateId()
  const path = `projects/${projectId}/kanban/attachments/${cardId}/${id}-${file.name}`
  const res = await writeBinaryFile(cfg(), path, file, `Upload attachment ${file.name}`)
  shaCache.set(path, res.content.sha)
  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    path,
    url: getRawUrl(cfg(), path),
  }
}
