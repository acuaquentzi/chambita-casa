import { parseISO } from './data'

export type FinanceAccountType = 'Débito' | 'Crédito' | 'Billetera digital' | 'Efectivo' | 'Ahorro'
export type FinanceImportMethod = 'CSV o Excel' | 'PDF' | 'Copiar y pegar' | 'Manual'

export interface FinanceAccount {
  id: string
  owner: string
  institution: string
  name: string
  type: FinanceAccountType
  last4: string
  currency: 'MXN' | 'USD'
  balance: number
  creditLimit?: number
  statementDay?: number
  paymentDueDay?: number
  importMethod: FinanceImportMethod
  active: boolean
  createdAt: string
}

export type FinanceTransactionKind = 'Gasto' | 'Ingreso' | 'Transferencia' | 'Pago de tarjeta'
export type FinanceTransactionStatus = 'Por revisar' | 'Confirmado' | 'Ignorado'
export type FinanceTransactionSource = 'Registro rápido' | 'Texto pegado' | 'Archivo'

export interface FinanceTransaction {
  id: string
  accountId: string
  owner: string
  date: string
  description: string
  amount: number
  kind: FinanceTransactionKind
  category: string
  status: FinanceTransactionStatus
  source: FinanceTransactionSource
  fingerprint: string
  createdAt: string
}

export const ACCOUNT_TYPES: FinanceAccountType[] = ['Débito', 'Crédito', 'Billetera digital', 'Efectivo', 'Ahorro']
export const IMPORT_METHODS: FinanceImportMethod[] = ['CSV o Excel', 'PDF', 'Copiar y pegar', 'Manual']
export const INSTITUTIONS = [
  'Hey Banco', 'Mercado Pago', 'Stori', 'Citibanamex', 'Bradescard', 'Nu', 'HSBC',
  'RappiCard', 'Falabella Soriana', 'Efectivo', 'Otro',
]
export const EXPENSE_CATEGORIES = [
  'Sin categoría', 'Supermercado', 'Comida', 'Transporte', 'Hogar', 'Servicios', 'Salud',
  'Educación', 'Entretenimiento', 'Compras', 'Mascotas', 'Viajes', 'Deudas', 'Ahorro', 'Otros',
]

const categoryRules: [RegExp, string][] = [
  [/walmart|soriana|chedraui|costco|sam'?s|super|mercado/i, 'Supermercado'],
  [/uber|didi|gasolin|pemex|estacionamiento|metro/i, 'Transporte'],
  [/restaurant|restaurante|rappi|uber eats|didi food|caf[eé]|starbucks|oxxo/i, 'Comida'],
  [/cfe|telmex|telcel|internet|agua|gas natural|netflix|spotify/i, 'Servicios'],
  [/farmacia|doctor|m[eé]dic|hospital|laboratorio/i, 'Salud'],
  [/amazon|mercado libre|liverpool|palacio|shein/i, 'Compras'],
  [/cine|cinemex|cinepolis|juego/i, 'Entretenimiento'],
]

export const suggestCategory = (description: string) =>
  categoryRules.find(([pattern]) => pattern.test(description))?.[1] ?? 'Sin categoría'

export const transactionFingerprint = (date: string, description: string, amount: number, accountId: string) =>
  `${date}|${description.toLowerCase().replace(/\s+/g, ' ').trim()}|${Math.abs(amount).toFixed(2)}|${accountId}`

const isoFromInput = (raw: string, fallback: string) => {
  const s = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (!m) return fallback
  const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])
  return `${year}-${String(Number(m[2])).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`
}

const amountFromInput = (raw: string) => {
  const negative = raw.includes('-') || /^\s*\(/.test(raw)
  let clean = raw.replace(/[^\d.,]/g, '')
  if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/,/g, '')
  else if (clean.includes(',') && !clean.includes('.')) clean = clean.replace(',', '.')
  const n = Number(clean || 0)
  return negative ? -n : n
}

export interface ParsedMovement { date: string; description: string; amount: number; kind: FinanceTransactionKind; category: string }

export function parseMovementText(text: string, fallbackDate: string): ParsedMovement[] {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).flatMap(line => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
    const cells = line.split(delimiter).map(x => x.trim().replace(/^"|"$/g, ''))
    if (cells.length < 2) return []
    const hasDate = /^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(cells[0])
    const date = hasDate ? isoFromInput(cells[0], fallbackDate) : fallbackDate
    const description = (hasDate ? cells.slice(1, -1) : cells.slice(0, -1)).join(' ').trim()
    const signed = amountFromInput(cells[cells.length - 1])
    if (!description || !Number.isFinite(signed) || signed === 0) return []
    const kind: FinanceTransactionKind = signed > 0 ? 'Gasto' : 'Ingreso'
    return [{ date, description, amount: Math.abs(signed), kind, category: suggestCategory(description) }]
  })
}

export const money = (value: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0)

const dateForDay = (year: number, month: number, day: number) => {
  const last = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(day, 1), last))
}

export function cardCycle(account: FinanceAccount, todayIso: string) {
  if (account.type !== 'Crédito' || !account.statementDay || !account.paymentDueDay) return null
  const today = parseISO(todayIso)
  let cutoff = dateForDay(today.getFullYear(), today.getMonth(), account.statementDay)
  if (cutoff < today) cutoff = dateForDay(today.getFullYear(), today.getMonth() + 1, account.statementDay)
  const dueMonth = account.paymentDueDay > account.statementDay ? cutoff.getMonth() : cutoff.getMonth() + 1
  const due = dateForDay(cutoff.getFullYear(), dueMonth, account.paymentDueDay)
  const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return { cutoff: fmt(cutoff), due: fmt(due) }
}
