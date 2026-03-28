export interface Platform {
  id: string
  label: string
  borderColor: string
  bgColor: string
  textColor: string
  composeUrl?: (text: string) => string
}

export const PLATFORMS: Platform[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    borderColor: 'border-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    composeUrl: (t) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(t)}`,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-700',
  },
  {
    id: 'threads',
    label: 'Threads',
    borderColor: 'border-gray-900',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-900',
    composeUrl: (t) => `https://www.threads.net/intent/post?text=${encodeURIComponent(t)}`,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    composeUrl: (t) => `https://api.whatsapp.com/send?text=${encodeURIComponent(t)}`,
  },
  {
    id: 'x',
    label: 'X / Twitter',
    borderColor: 'border-sky-500',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    composeUrl: (t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    borderColor: 'border-blue-700',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    composeUrl: (t) => `https://www.linkedin.com/sharing/share-offsite/?summary=${encodeURIComponent(t)}`,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    borderColor: 'border-neutral-900',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-900',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    borderColor: 'border-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    borderColor: 'border-blue-400',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    composeUrl: (t) => `https://bsky.app/intent/compose?text=${encodeURIComponent(t)}`,
  },
  {
    id: 'mastodon',
    label: 'Mastodon',
    borderColor: 'border-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
  },
  {
    id: 'academia',
    label: 'Academia.edu',
    borderColor: 'border-slate-600',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-700',
  },
  {
    id: 'researchgate',
    label: 'ResearchGate',
    borderColor: 'border-teal-600',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
  },
]

export function getPlatform(id: string): Platform | undefined {
  return PLATFORMS.find(p => p.id === id)
}

export function getPlatformBorderColor(platformId: string | undefined): string {
  if (!platformId) return 'border-gray-200'
  const p = getPlatform(platformId)
  return p?.borderColor ?? 'border-gray-200'
}
