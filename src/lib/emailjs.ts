import emailjs from '@emailjs/browser'

export interface EmailJSConfig {
  serviceId: string
  templateId: string
  publicKey: string
}

const EMAILJS_KEY = 'xoxolab_emailjs_config'

export function getEmailJSConfig(): EmailJSConfig | null {
  try {
    const raw = localStorage.getItem(EMAILJS_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as EmailJSConfig
    return cfg.serviceId && cfg.templateId && cfg.publicKey ? cfg : null
  } catch {
    return null
  }
}

export function saveEmailJSConfig(cfg: EmailJSConfig): void {
  localStorage.setItem(EMAILJS_KEY, JSON.stringify(cfg))
}

export function clearEmailJSConfig(): void {
  localStorage.removeItem(EMAILJS_KEY)
}

export async function sendMentionNotification(params: {
  mentionerEmail: string
  mentionedEmail: string
  projectName: string
  moduleName: string
  excerpt: string
}): Promise<void> {
  const cfg = getEmailJSConfig()
  if (!cfg) return

  try {
    await emailjs.send(
      cfg.serviceId,
      cfg.templateId,
      {
        from_email: params.mentionerEmail,
        to_email: params.mentionedEmail,
        project_name: params.projectName,
        module_name: params.moduleName,
        excerpt: params.excerpt.slice(0, 300),
        notification_type: 'mention',
      },
      cfg.publicKey
    )
  } catch (err) {
    console.error('EmailJS mention notification failed:', err)
  }
}

export async function sendCalendarReminder(params: {
  recipientEmail: string
  eventTitle: string
  eventDate: string
  projectName: string
  daysAhead: number
}): Promise<void> {
  const cfg = getEmailJSConfig()
  if (!cfg) return

  try {
    await emailjs.send(
      cfg.serviceId,
      cfg.templateId,
      {
        from_email: 'xoxolab@noreply',
        to_email: params.recipientEmail,
        project_name: params.projectName,
        module_name: 'Efemérides',
        excerpt: `Evento "${params.eventTitle}" acontece em ${params.daysAhead} dia(s) — ${params.eventDate}`,
        notification_type: 'calendar_reminder',
      },
      cfg.publicKey
    )
  } catch (err) {
    console.error('EmailJS calendar reminder failed:', err)
  }
}
