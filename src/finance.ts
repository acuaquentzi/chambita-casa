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

const splitDelimitedLine = (line: string, delimiter: string) => {
  const cells: string[] = []
  let value = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (char === delimiter && !quoted) { cells.push(value.trim()); value = ''; continue }
    value += char
  }
  cells.push(value.trim())
  return cells
}

const normalizedHeader = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const findColumn = (headers: string[], options: RegExp[]) => headers.findIndex(header => options.some(option => option.test(header)))

export function parseMovementText(text: string, fallbackDate: string): ParsedMovement[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ','
  const rows = lines.map(line => splitDelimitedLine(line, delimiter))
  const headers = rows[0].map(normalizedHeader)
  const dateIndex = findColumn(headers, [/^fecha/, /^date/])
  const descriptionIndex = findColumn(headers, [/concepto/, /descripcion/, /detalle/, /comercio/, /movimiento/])
  const amountIndex = findColumn(headers, [/^importe$/, /^monto$/, /^cantidad$/, /^amount$/])
  const debitIndex = findColumn(headers, [/cargo/, /debito/, /retiro/])
  const creditIndex = findColumn(headers, [/abono/, /credito/, /deposito/])
  const hasHeaders = dateIndex >= 0 || descriptionIndex >= 0 || amountIndex >= 0 || debitIndex >= 0 || creditIndex >= 0

  return rows.slice(hasHeaders ? 1 : 0).flatMap(cells => {
    if (cells.length < 2) return []
    const firstLooksLikeDate = /^\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}$/.test(cells[0] ?? '')
    const rawDate = dateIndex >= 0 ? cells[dateIndex] : firstLooksLikeDate ? cells[0] : ''
    const date = rawDate ? isoFromInput(rawDate, fallbackDate) : fallbackDate
    const description = descriptionIndex >= 0
      ? cells[descriptionIndex]?.trim()
      : (firstLooksLikeDate ? cells.slice(1, -1) : cells.slice(0, -1)).join(' ').trim()
    const debit = debitIndex >= 0 ? amountFromInput(cells[debitIndex] ?? '') : 0
    const credit = creditIndex >= 0 ? amountFromInput(cells[creditIndex] ?? '') : 0
    const signed = amountIndex >= 0 ? amountFromInput(cells[amountIndex] ?? '') : debit || (credit ? -Math.abs(credit) : amountFromInput(cells[cells.length - 1] ?? ''))
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
