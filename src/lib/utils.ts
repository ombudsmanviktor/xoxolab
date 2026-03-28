import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date.includes('T') ? date : date + 'T00:00:00') : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function extractMentions(text: string): string[] {
  const matches = [...text.matchAll(/@([\w.+-]+@[\w-]+\.[\w.]+)/g)]
  return [...new Set(matches.map(m => m[1]))]
}

export function emailInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
