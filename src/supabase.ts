// Capa mínima que imita la API de "documentos" que usaba el artifact original (collection/doc/onSnapshot),
// guardando todo en una sola tabla `docs` de Supabase (ver supabase/schema.sql).
import { createClient, type Session } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, MEMBERS } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})

type Data = Record<string, any>
interface Row { path: string; coll: string; data: Data }
const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'))
const idOf = (path: string) => path.slice(path.lastIndexOf('/') + 1)
const fail = (error: { message: string } | null) => { if (error) throw Object.assign(new Error(error.message), { code: 'unavailable' }) }

// Un solo canal en tiempo real; cada suscripción vuelve a leer su colección cuando cambia algo en ella.
type Listener = { coll: string; path?: string; refresh: () => void }
const listeners = new Set<Listener>()
let channelStarted = false
function ensureChannel() {
  if (channelStarted) return
  channelStarted = true
  supabase.channel('docs-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, payload => {
      const row = (payload.new && 'coll' in payload.new ? payload.new : payload.old) as Partial<Row>
      listeners.forEach(l => { if (!row.coll || l.coll === row.coll) l.refresh() })
    })
    .subscribe()
}

function listen(l: Listener) {
  ensureChannel()
  listeners.add(l)
  l.refresh()
  return () => { listeners.delete(l) }
}

const docSnap = (r: Row) => ({ id: idOf(r.path), data: () => r.data })

function collection(coll: string, order?: { field: string; dir: 'asc' | 'desc' }, max?: number) {
  const fetchAll = async () => {
    const { data, error } = await supabase.from('docs').select('path, coll, data').eq('coll', coll)
    fail(error)
    let rows = (data ?? []) as Row[]
    if (order) {
      const s = order.dir === 'desc' ? -1 : 1
      rows = [...rows].sort((a, b) => String(a.data[order.field] ?? '').localeCompare(String(b.data[order.field] ?? '')) * s)
    }
    if (max) rows = rows.slice(0, max)
    return { docs: rows.map(docSnap) }
  }
  return {
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => collection(coll, { field, dir }, max),
    limit: (n: number) => collection(coll, order, n),
    get: fetchAll,
    onSnapshot(cb: (snap: { docs: ReturnType<typeof docSnap>[] }) => void, onErr?: (e: unknown) => void) {
      let alive = true
      const unsub = listen({ coll, refresh: () => fetchAll().then(s => alive && cb(s), e => alive && onErr?.(e)) })
      return () => { alive = false; unsub() }
    },
    async add(body: Data) {
      const path = `${coll}/${crypto.randomUUID()}`
      const { error } = await supabase.from('docs').insert({ path, coll, data: body })
      fail(error)
      return { id: idOf(path) }
    },
  }
}

function doc(path: string) {
  const coll = parentOf(path)
  const fetchOne = async () => {
    const { data, error } = await supabase.from('docs').select('data').eq('path', path).maybeSingle()
    fail(error)
    return { exists: !!data, data: () => (data?.data ?? {}) as Data }
  }
  return {
    get: fetchOne,
    onSnapshot(cb: (snap: { exists: boolean; data: () => Data }) => void, onErr?: (e: unknown) => void) {
      let alive = true
      const unsub = listen({ coll, path, refresh: () => fetchOne().then(s => alive && cb(s), e => alive && onErr?.(e)) })
      return () => { alive = false; unsub() }
    },
    async set(body: Data) {
      const { error } = await supabase.from('docs').upsert({ path, coll, data: body })
      fail(error)
    },
    // Fusiona solo los campos enviados (en el servidor), para que dos ediciones simultáneas no se pisen.
    async update(body: Data) {
      const { error } = await supabase.rpc('merge_doc', { p_path: path, p_data: body })
      fail(error)
    },
  }
}

export const db = { collection: (c: string) => collection(c), doc }

export const memberFor = (email?: string | null) =>
  MEMBERS.find(m => m.email.toLowerCase() === (email ?? '').toLowerCase()) ?? null

export function makeUser(session: Session) {
  const u = session.user
  const name = memberFor(u.email)?.name ?? u.email ?? 'Tú'
  db.doc(`profiles/${u.id}`).set({ name }).catch(() => {})
  return {
    me: async () => ({ id: u.id, name, avatarUrl: '' }),
    isOwner: async () => false,
    can: async () => true,
    async profiles(ids: string[]) {
      const { data } = await supabase.from('docs').select('path, data').in('path', ids.map(id => `profiles/${id}`))
      return Object.fromEntries((data ?? []).map((r: any) => [idOf(r.path), { name: r.data.name, avatarUrl: '' }]))
    },
  }
}
