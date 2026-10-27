import { useCallback, useEffect, useRef, useState } from 'react'
import { type BaseTask, type ProjectMeta, type Comment, type Activity, type Reschedule, type SavedView, ALL_OWNERS } from './data'
import type { FinanceAccount } from './finance'

import { db as supaDb } from './supabase'
import type { AppUser } from './supabase'

type Cap = any

export type SyncState = 'connecting' | 'live' | 'local' | 'readonly'

export interface Change { field: string; from: string; to: string }
export type TaskPatch = Partial<BaseTask> & { key: string }
export type ProjectPatch = Partial<ProjectMeta> & { id: string }
export interface WeeklyMetric { date: string; total: number; open: number; overdue: number; atRisk: number; dueWeek: number; waiting: number; progress: number }
export interface AuditEvent { id: string; at: string; by: string | null; action: string; target: string; field: string; from: string; to: string }
export interface Prefs { savedViews?: SavedView[]; lastSeen?: string; tourDone?: boolean }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function matchOwner(displayName: string): string | null {
  return ALL_OWNERS.find(o => norm(o) === norm(displayName)) ?? null
}

const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== 'daysLeft' && k !== 'health'))

export function useStore(user: AppUser) {
  const [overrides, setOverrides] = useState<Record<string, TaskPatch>>({})
  const [projectOverrides, setProjectOverrides] = useState<Record<string, ProjectPatch>>({})
  const [metrics, setMetrics] = useState<WeeklyMetric[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [reschedules, setReschedules] = useState<Reschedule[]>([])
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [sync, setSync] = useState<SyncState>('connecting')
  const [me, setMe] = useState<{ id: string | null; name: string; avatarUrl: string }>({ id: null, name: '', avatarUrl: '' })
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<{ wipLimit?: number }>({})
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const dbRef = useRef<Cap | null>(null)
  const userRef = useRef<Cap | null>(null)
  const uidRef = useRef<string | null>(null)
  const queues = useRef<Record<string, Promise<void>>>({})
  const readonlyRef = useRef(false)

  useEffect(() => {
    const unsubs: (() => void)[] = []
    let cancelled = false
    ;(async () => {
      const db = supaDb
      if (cancelled) return
      userRef.current = user
      const m = await user.me()
      uidRef.current = m.id
      user.isOwner().then((o: boolean) => { if (!cancelled) setIsOwner(o) })
      if (!cancelled) setMe({ id: m.id, name: m.name, avatarUrl: m.avatarUrl })
      if ((await user.can('data.write')) === false) readonlyRef.current = true
      dbRef.current = db
      const onErr = () => { if (!cancelled) setSync('local') }
      unsubs.push(db.collection('tasks').onSnapshot((snap: Cap) => {
        const o: Record<string, TaskPatch> = {}
        snap.docs.forEach((d: Cap) => { o[d.id] = { ...(d.data() as Partial<BaseTask>), key: d.id } })
        setOverrides(o)
        setSync(readonlyRef.current ? 'readonly' : 'live')
      }, onErr))
      unsubs.push(db.collection('projects').onSnapshot((snap: Cap) => {
        const o: Record<string, ProjectPatch> = {}
        snap.docs.forEach((d: Cap) => { o[d.id] = { ...(d.data() as Partial<ProjectMeta>), id: d.id } })
        setProjectOverrides(o)
      }, onErr))
      unsubs.push(db.doc('settings/team').onSnapshot((snap: Cap) => setSettings(snap.exists ? snap.data() : {}), () => {}))
      unsubs.push(db.collection('metrics').orderBy('date', 'asc').limit(104).onSnapshot((snap: Cap) => {
        setMetrics(snap.docs.map((d: Cap) => d.data() as WeeklyMetric))
      }, onErr))
      unsubs.push(db.collection('comments').orderBy('at', 'asc').limit(1000).onSnapshot((snap: Cap) => {
        setComments(snap.docs.map((d: Cap) => ({ ...(d.data() as Comment), id: d.id, authorName: '' })))
      }, onErr))
      unsubs.push(db.collection('activity').orderBy('at', 'desc').limit(500).onSnapshot((snap: Cap) => {
        setActivity(snap.docs.map((d: Cap) => ({ ...(d.data() as Activity), id: d.id, authorName: '' })))
      }, onErr))
      unsubs.push(db.collection('reschedules').orderBy('at', 'desc').limit(1000).onSnapshot((snap: Cap) => {
        setReschedules(snap.docs.map((d: Cap) => ({ ...(d.data() as Reschedule), id: d.id })))
      }, onErr))
      unsubs.push(db.collection('finance_accounts').onSnapshot((snap: Cap) => {
        setFinanceAccounts(snap.docs.map((d: Cap) => ({ ...(d.data() as FinanceAccount), id: d.id }))
          .sort((a: FinanceAccount, b: FinanceAccount) => a.owner.localeCompare(b.owner, 'es') || a.institution.localeCompare(b.institution, 'es')))
      }, onErr))
      if (uidRef.current) {
        unsubs.push(db.doc(`data/users/${uidRef.current}/prefs`).onSnapshot(
          (snap: Cap) => setPrefs(snap.exists ? (snap.data() as Prefs) : {}),
          () => setPrefs({}),
        ))
      } else setPrefs({})
    })()
    return () => { cancelled = true; unsubs.forEach(u => u()) }
  }, [user])

  const handleWriteError = useCallback((e: Cap) => {
    if (e?.code === 'invalid_argument') { readonlyRef.current = true; setSync('readonly'); setError('Tu acceso es de solo lectura: los cambios no se guardaron.') }
    else if (e?.code === 'quota_exceeded') setError('Se llenó el almacenamiento de la base de datos.')
    else setError('No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.')
  }, [])

  // Merges only the edited fields, so two people editing different fields of the same task don't overwrite each other.
  const writeFields = useCallback((path: string, fields: Record<string, unknown>, create: boolean) => {
    const db = dbRef.current
    if (!db || readonlyRef.current) return
    const body = clean(fields)
    const prev = queues.current[path] ?? Promise.resolve()
    queues.current[path] = prev.then(async () => {
      const ref = db.doc(path)
      if (create) return ref.set(body)
      try { await ref.update(body) } catch (e: Cap) {
        if (e?.code !== 'invalid_argument') throw e
        await ref.set(body)
      }
    }).catch(handleWriteError)
  }, [handleWriteError])

  // Sin bitácora en la versión personal; se conserva la firma para no tocar a quienes la llaman.
  const logAudit = useCallback((_action: string, _target: string, _c: Partial<Change> = {}) => {}, [])

  const logChanges = useCallback((key: string, changes: Change[]) => {
    changes.forEach(c => logAudit(
      /creada|creado/i.test(c.field) ? 'Creó' : c.field === 'Eliminada' ? 'Eliminó' : /plantilla/i.test(c.field) ? 'Copió plantilla' : 'Editó',
      key, c))
    const db = dbRef.current
    if (!db || readonlyRef.current || !changes.length) return
    db.collection('activity').add({
      taskKey: key, authorId: me.id, at: new Date().toISOString(),
      field: changes.map(c => c.field).join(', '),
      from: changes.map(c => c.from).join(' · '), to: changes.map(c => c.to).join(' · '),
    }).catch(() => {})
  }, [me.id, logAudit])

  const saveTask = useCallback((key: string, fields: Partial<BaseTask>, changes: Change[], create = false) => {
    setOverrides(prev => ({ ...prev, [key]: { ...(prev[key] ?? {}), ...fields, key } }))
    writeFields(`tasks/${key}`, { ...fields, key }, create)
    logChanges(key, changes)
  }, [writeFields, logChanges])

  const saveProject = useCallback((id: string, fields: Partial<ProjectMeta>, changes: Change[], create = false) => {
    setProjectOverrides(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...fields, id } }))
    writeFields(`projects/${id}`, { ...fields, id }, create)
    logChanges(`project:${id}`, changes)
  }, [writeFields, logChanges])

  const logActivity = useCallback((key: string, c: Change) => logChanges(key, [c]), [logChanges])

  const addReschedule = useCallback((r: Omit<Reschedule, 'id' | 'by' | 'at'>) => {
    const entry = { ...r, by: me.id, at: new Date().toISOString() }
    const db = dbRef.current
    if (!db || readonlyRef.current) {
      setReschedules(prev => [{ ...entry, id: `local-${Date.now()}` }, ...prev])
      return
    }
    db.collection('reschedules').add(entry).catch(handleWriteError)
    logAudit('Reprogramó', r.kind === 'project' ? `project:${r.ref}` : r.ref, { field: r.reason, from: r.from, to: r.to + (r.note ? ` (${r.note})` : '') })
  }, [handleWriteError, me.id, logAudit])

  const prefsRef = useRef<Prefs | null>(null)
  useEffect(() => { prefsRef.current = prefs }, [prefs])
  const savePrefs = useCallback((patch: Prefs) => {
    const next = { ...(prefsRef.current ?? {}), ...patch }
    prefsRef.current = next
    setPrefs(next)
    const db = dbRef.current, uid = uidRef.current
    if (!db || !uid) return
    const path = `data/users/${uid}/prefs`
    const prevQ = queues.current[path] ?? Promise.resolve()
    queues.current[path] = prevQ.then(() => db.doc(path).set(next)).catch(() => {})
    if (patch.savedViews) logAudit('Cambió sus vistas guardadas', 'vistas', { to: String(next.savedViews?.length ?? 0) + ' vistas' })
  }, [logAudit])

  const addComment = useCallback((taskKey: string, text: string) => {
    const at = new Date().toISOString()
    const db = dbRef.current
    if (!db || readonlyRef.current) {
      setComments(prev => [...prev, { id: `local-${Date.now()}`, taskKey, authorId: me.id, authorName: me.name || 'Tú', text, at }])
      return
    }
    db.collection('comments').add({ taskKey, authorId: me.id, text, at }).catch(handleWriteError)
    logAudit('Comentó', taskKey, { to: text.slice(0, 300) })
  }, [handleWriteError, me.id, me.name, logAudit])

  // Solo para el owner: lee la bitácora de todas las personas.
  const loadAudit = useCallback(async (): Promise<AuditEvent[] | null> => {
    const db = dbRef.current, user = userRef.current
    if (!db || !user || !(await user.isOwner())) return null
    const people = await db.collection('audit').limit(200).get()
    const all = await Promise.all(people.docs.map((d: Cap) =>
      db.collection(`audit/${d.id}/events`).orderBy('at', 'desc').limit(1000).get()
        .then((q: Cap) => q.docs.map((e: Cap) => ({ ...(e.data() as AuditEvent), id: e.id })))))
    return all.flat().sort((a: AuditEvent, b: AuditEvent) => b.at.localeCompare(a.at))
  }, [])

  const saveSettings = useCallback((patch: { wipLimit?: number }) => {
    setSettings(prev => ({ ...prev, ...patch }))
    writeFields('settings/team', patch, false)
    logAudit('Cambió configuración', 'settings', { field: 'Límite WIP', to: String(patch.wipLimit ?? '') })
  }, [writeFields, logAudit])

  const saveFinanceAccount = useCallback((account: FinanceAccount, create = false) => {
    setFinanceAccounts(prev => {
      const next = prev.filter(a => a.id !== account.id).concat(account)
      return next.sort((a, b) => a.owner.localeCompare(b.owner, 'es') || a.institution.localeCompare(b.institution, 'es'))
    })
    writeFields(`finance_accounts/${account.id}`, { ...account }, create)
  }, [writeFields])

  return {
    settings, saveSettings,
    overrides, projectOverrides, metrics, comments, activity, reschedules, prefs, sync, me, error, userRef, isOwner,
    financeAccounts, saveFinanceAccount,
    saveTask, saveProject, logActivity, loadAudit, addReschedule, savePrefs, addComment, clearError: () => setError(null),
  }
}

export function useProfiles(userRef: React.MutableRefObject<Cap | null>, ids: (string | null)[]) {
  const [map, setMap] = useState<Record<string, { name: string; avatarUrl: string }>>({})
  const key = [...new Set(ids.filter(Boolean) as string[])].sort().join('|')
  useEffect(() => {
    const user = userRef.current
    if (!user || !key) return
    let alive = true
    user.profiles(key.split('|')).then((ps: Cap) => { if (alive) setMap(ps) })
    return () => { alive = false }
  }, [key, userRef])
  return map
}

export async function saveFile(filename: string, data: string): Promise<'saved' | 'copied' | 'failed'> {
  try {
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return 'saved'
  } catch {
    try { await navigator.clipboard.writeText(data); return 'copied' } catch { return 'failed' }
  }
}
