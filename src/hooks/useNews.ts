import { useEffect, useRef, useState } from 'react'
import type { BaseTask, ProjectMeta } from '../data'
import type { useStore } from '../store'
import type { NewsItem } from '../components/WhatsNew'

type Store = ReturnType<typeof useStore>

// Builds "what changed since your last visit" once per load, from other people's changes to the viewer's own work.
export function useNews(store: Store, myOwner: string | null, projectMetas: ProjectMeta[], baseByKey: Record<string, BaseTask>,
  nameFor: (id: string | null) => string, targetLabel: (key: string) => string) {
  const [news, setNews] = useState<{ items: NewsItem[]; since: string } | null>(null)
  const checked = useRef(false)

  useEffect(() => {
    if (checked.current || store.sync !== 'live' || store.prefs === null || !store.me.id) return
    checked.current = true
    const now = new Date().toISOString()
    const since = store.prefs.lastSeen
    if (!since) { store.savePrefs({ lastSeen: now }); return }
    const mine = (key: string) => {
      if (!myOwner) return true
      if (key.startsWith('project:')) return projectMetas.find(p => p.id === key.slice(8))?.owner === myOwner
      const t = baseByKey[key]
      return !!t && (t.owner === myOwner || t.coOwner === myOwner)
    }
    const items: NewsItem[] = []
    store.comments.filter(c => c.at > since && c.authorId !== store.me.id && mine(c.taskKey))
      .forEach(c => items.push({ id: 'c' + c.id, at: c.at, who: nameFor(c.authorId), kind: 'comment', target: targetLabel(c.taskKey), detail: c.text, taskKey: c.taskKey }))
    store.reschedules.filter(r => r.at > since && r.by !== store.me.id && mine(r.kind === 'project' ? `project:${r.ref}` : r.ref))
      .forEach(r => items.push({ id: 'r' + r.id, at: r.at, who: nameFor(r.by), kind: 'reschedule', target: targetLabel(r.kind === 'project' ? `project:${r.ref}` : r.ref), detail: `Fecha ${r.from} → ${r.to} · ${r.reason}`, taskKey: r.kind === 'task' ? r.ref : undefined }))
    store.activity.filter(a => a.at > since && a.authorId !== store.me.id && a.field !== 'Compromiso' && mine(a.taskKey))
      .forEach(a => items.push({ id: 'a' + a.id, at: a.at, who: nameFor(a.authorId), kind: /Creada|creado/.test(a.field) ? 'create' : 'edit', target: targetLabel(a.taskKey),
        detail: /Creada|creado/.test(a.field) ? a.field : `${a.field}: ${a.from} → ${a.to}`, taskKey: a.taskKey.startsWith('project:') ? undefined : a.taskKey }))
    items.sort((x, y) => y.at.localeCompare(x.at))
    if (items.length) setNews({ items: items.slice(0, 60), since })
    else store.savePrefs({ lastSeen: now })
  }, [store.sync, store.prefs, store.me.id, store.comments, store.activity, store.reschedules, myOwner, projectMetas, baseByKey, nameFor, targetLabel, store])

  const dismiss = () => { setNews(null); store.savePrefs({ lastSeen: new Date().toISOString() }) }
  return { news, dismiss }
}
