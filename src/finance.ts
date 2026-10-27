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

export const ACCOUNT_TYPES: FinanceAccountType[] = ['Débito', 'Crédito', 'Billetera digital', 'Efectivo', 'Ahorro']
export const IMPORT_METHODS: FinanceImportMethod[] = ['CSV o Excel', 'PDF', 'Copiar y pegar', 'Manual']
export const INSTITUTIONS = [
  'Hey Banco', 'Mercado Pago', 'Stori', 'Citibanamex', 'Bradescard', 'Nu', 'HSBC',
  'RappiCard', 'Falabella Soriana', 'Efectivo', 'Otro',
]

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
