import { useMemo, useState } from 'react'
import {
  ArrowRight, Building2, CalendarClock, CheckCircle2, CreditCard, Landmark, Plus,
  ReceiptText, RefreshCw, Settings2, Sparkles, WalletCards,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FinanceInbox } from '@/components/FinanceInbox'
import {
  ACCOUNT_TYPES, IMPORT_METHODS, INSTITUTIONS, cardCycle, money,
  type FinanceAccount, type FinanceAccountType, type FinanceImportMethod, type FinanceTransaction,
} from '@/finance'

interface Props {
  accounts: FinanceAccount[]
  transactions: FinanceTransaction[]
  owners: string[]
  today: string
  onSaveAccount: (account: FinanceAccount, create?: boolean) => void
  onSaveTransaction: (transaction: FinanceTransaction, create?: boolean) => void
  onOpenProjects: () => void
}

type Section = 'resumen' | 'cuentas' | 'movimientos' | 'conciliacion'

const EMPTY = {
  owner: '', institution: '', name: '', type: 'Débito' as FinanceAccountType, last4: '', currency: 'MXN' as 'MXN' | 'USD',
  balance: '', creditLimit: '', statementDay: '', paymentDueDay: '', importMethod: 'CSV o Excel' as FinanceImportMethod,
}

export function MoneyHub({ accounts, transactions, owners, today, onSaveAccount, onSaveTransaction, onOpenProjects }: Props) {
  const [section, setSection] = useState<Section>('resumen')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceAccount | null>(null)
  const [draft, setDraft] = useState(EMPTY)

  const active = accounts.filter(a => a.active)
  const totals = useMemo(() => {
    const credit = active.filter(a => a.type === 'Crédito')
    return {
      available: active.filter(a => a.type !== 'Crédito').reduce((sum, a) => sum + Number(a.balance || 0), 0),
      debt: credit.reduce((sum, a) => sum + Number(a.balance || 0), 0),
      limit: credit.reduce((sum, a) => sum + Number(a.creditLimit || 0), 0),
    }
  }, [active])

  const startNew = () => {
    setEditing(null)
    setDraft({ ...EMPTY, owner: owners[0] ?? '' })
    setOpen(true)
  }
  const startEdit = (account: FinanceAccount) => {
    setEditing(account)
    setDraft({
      owner: account.owner, institution: account.institution, name: account.name, type: account.type,
      last4: account.last4, currency: account.currency, balance: String(account.balance ?? ''),
      creditLimit: account.creditLimit === undefined ? '' : String(account.creditLimit),
      statementDay: account.statementDay === undefined ? '' : String(account.statementDay),
      paymentDueDay: account.paymentDueDay === undefined ? '' : String(account.paymentDueDay),
      importMethod: account.importMethod,
    })
    setOpen(true)
  }
  const save = () => {
    if (!draft.owner || !draft.institution || !draft.name) return
    const account: FinanceAccount = {
      id: editing?.id ?? `cuenta-${crypto.randomUUID()}`,
      owner: draft.owner, institution: draft.institution, name: draft.name, type: draft.type,
      last4: draft.last4.replace(/\D/g, '').slice(-4), currency: draft.currency,
      balance: Number(draft.balance || 0), importMethod: draft.importMethod,
      active: editing?.active ?? true, createdAt: editing?.createdAt ?? new Date().toISOString(),
      ...(draft.type === 'Crédito' ? {
        creditLimit: Number(draft.creditLimit || 0), statementDay: Number(draft.statementDay || 0),
        paymentDueDay: Number(draft.paymentDueDay || 0),
      } : {}),
    }
    onSaveAccount(account, !editing)
    setOpen(false)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 px-5 py-6 text-white shadow-sm sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Marea · Finanzas del hogar</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Su dinero, sin capturas diarias.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Primero registramos dónde vive el dinero. Después Marea usará archivos y estados de cuenta para proponer movimientos y ustedes solo confirmarán excepciones.</p>
          </div>
          <Button onClick={startNew} className="shrink-0 gap-2 bg-emerald-400 text-emerald-950 hover:bg-emerald-300">
            <Plus className="h-4 w-4" /> Agregar cuenta o tarjeta
          </Button>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1" aria-label="Secciones financieras">
        {([
          ['resumen', 'Resumen', WalletCards], ['cuentas', 'Cuentas y tarjetas', CreditCard],
          ['movimientos', 'Movimientos', ReceiptText], ['conciliacion', 'Conciliación', RefreshCw],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setSection(id)} className={cn(
            'flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            section === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted',
          )}><Icon className="h-4 w-4" />{label}</button>
        ))}
      </nav>

      {section === 'resumen' && <>
        <section className="grid gap-3 sm:grid-cols-3">
          <Stat label="Dinero disponible" value={money(totals.available)} hint={`${active.filter(a => a.type !== 'Crédito').length} cuentas activas`} />
          <Stat label="Saldo en tarjetas" value={money(totals.debt)} hint="Gasto pendiente de pago" />
          <Stat label="Crédito disponible" value={money(Math.max(totals.limit - totals.debt, 0))} hint={totals.limit ? `de ${money(totals.limit)}` : 'Agrega los límites de crédito'} />
        </section>

        {active.length === 0 ? <EmptyAccounts onAdd={startNew} /> : (
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><h3 className="font-semibold">Próximos cortes y pagos</h3><p className="text-sm text-muted-foreground">Calculados con las fechas configuradas en cada tarjeta.</p></div>
              <Button variant="outline" size="sm" onClick={() => setSection('cuentas')}>Ver todas</Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {active.filter(a => a.type === 'Crédito').slice(0, 4).map(a => <AccountCard key={a.id} account={a} today={today} onEdit={() => startEdit(a)} />)}
              {!active.some(a => a.type === 'Crédito') && <p className="text-sm text-muted-foreground">Aún no hay tarjetas de crédito configuradas.</p>}
            </div>
          </section>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <Roadmap icon={Building2} title="1. Cuentas" text="En curso: instituciones, titulares, saldos y ciclos de tarjeta." done={active.length > 0} />
          <Roadmap icon={Sparkles} title="2. Importación asistida" text="Subir CSV, Excel, PDF o pegar movimientos para clasificarlos." />
          <Roadmap icon={CheckCircle2} title="3. Conciliación" text="Revisar cada 5 o 7 días solo diferencias y movimientos dudosos." />
        </section>
      </>}

      {section === 'cuentas' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold">Cuentas y tarjetas</h3><p className="text-sm text-muted-foreground">Una ficha por producto, aunque una institución tenga varias tarjetas.</p></div><Button onClick={startNew} className="gap-2"><Plus className="h-4 w-4" /> Agregar</Button></div>
          {active.length ? <div className="grid gap-3 md:grid-cols-2">{active.map(a => <AccountCard key={a.id} account={a} today={today} onEdit={() => startEdit(a)} />)}</div> : <EmptyAccounts onAdd={startNew} />}
        </section>
      )}

      {section === 'movimientos' && <FinanceInbox accounts={accounts} owners={owners} today={today} transactions={transactions} onSave={onSaveTransaction} />}
      {section === 'conciliacion' && <ComingSoon icon={RefreshCw} title="Conciliación cada 5 o 7 días" text="Aquí verán únicamente movimientos nuevos, cargos sin categoría y diferencias contra el saldo de cada aplicación bancaria." />}

      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">Proyectos con presupuesto, sin burocracia</p><p className="mt-1 text-sm text-muted-foreground">Vincular un gasto con un proyecto será opcional.</p></div>
        <Button variant="outline" className="shrink-0 gap-2" onClick={onOpenProjects}>Ver proyectos <ArrowRight className="h-4 w-4" /></Button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar cuenta o tarjeta' : 'Agregar cuenta o tarjeta'}</DialogTitle><DialogDescription>Registra el producto una sola vez. Los movimientos se importarán después.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Titular"><select value={draft.owner} onChange={e => setDraft(d => ({ ...d, owner: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona</option>{owners.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Institución"><select value={draft.institution} onChange={e => setDraft(d => ({ ...d, institution: e.target.value }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecciona</option>{INSTITUTIONS.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Nombre para identificarla"><Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Ej. Citi Costco" /></Field>
            <Field label="Tipo"><select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value as FinanceAccountType }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{ACCOUNT_TYPES.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Últimos 4 dígitos"><Input inputMode="numeric" value={draft.last4} onChange={e => setDraft(d => ({ ...d, last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="1234" /></Field>
            <Field label={draft.type === 'Crédito' ? 'Saldo pendiente' : 'Saldo actual'}><Input inputMode="decimal" type="number" value={draft.balance} onChange={e => setDraft(d => ({ ...d, balance: e.target.value }))} placeholder="0.00" /></Field>
            {draft.type === 'Crédito' && <>
              <Field label="Límite de crédito"><Input inputMode="decimal" type="number" value={draft.creditLimit} onChange={e => setDraft(d => ({ ...d, creditLimit: e.target.value }))} placeholder="0.00" /></Field>
              <Field label="Día de corte"><Input inputMode="numeric" type="number" min="1" max="31" value={draft.statementDay} onChange={e => setDraft(d => ({ ...d, statementDay: e.target.value }))} placeholder="Ej. 12" /></Field>
              <Field label="Día límite de pago"><Input inputMode="numeric" type="number" min="1" max="31" value={draft.paymentDueDay} onChange={e => setDraft(d => ({ ...d, paymentDueDay: e.target.value }))} placeholder="Ej. 2" /></Field>
            </>}
            <Field label="Forma habitual de obtener movimientos"><select value={draft.importMethod} onChange={e => setDraft(d => ({ ...d, importMethod: e.target.value as FinanceImportMethod }))} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{IMPORT_METHODS.map(x => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save} disabled={!draft.owner || !draft.institution || !draft.name}>{editing ? 'Guardar cambios' : 'Agregar cuenta'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div> }
function Stat({ label, value, hint }: { label: string; value: string; hint: string }) { return <article className="rounded-xl border bg-card p-5 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></article> }
function Roadmap({ icon: Icon, title, text, done }: { icon: typeof Landmark; title: string; text: string; done?: boolean }) { return <article className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-emerald-600" /><p className="font-semibold">{title}</p>{done && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" />}</div><p className="mt-2 text-sm leading-5 text-muted-foreground">{text}</p></article> }
function EmptyAccounts({ onAdd }: { onAdd: () => void }) { return <section className="rounded-xl border border-dashed bg-card p-8 text-center"><WalletCards className="mx-auto h-9 w-9 text-muted-foreground" /><h3 className="mt-3 font-semibold">Empieza con sus cuentas principales</h3><p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">Agrega cada cuenta o tarjeta. No necesitas capturar movimientos todavía.</p><Button onClick={onAdd} className="mt-4 gap-2"><Plus className="h-4 w-4" /> Agregar la primera</Button></section> }
function AccountCard({ account, today, onEdit }: { account: FinanceAccount; today: string; onEdit: () => void }) {
  const cycle = cardCycle(account, today)
  const used = account.type === 'Crédito' && account.creditLimit ? Math.min(account.balance / account.creditLimit * 100, 100) : 0
  return <button onClick={onEdit} className="rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40">
    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{account.type === 'Crédito' ? <CreditCard className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="truncate font-semibold">{account.name}</p><p className="text-xs text-muted-foreground">{account.institution}{account.last4 ? ` · •••• ${account.last4}` : ''} · {account.owner}</p></div><Settings2 className="h-4 w-4 shrink-0 text-muted-foreground" /></div><p className="mt-3 text-xl font-bold tabular-nums">{money(account.balance, account.currency)}</p>{account.type === 'Crédito' && account.creditLimit !== undefined && <><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${used}%` }} /></div><p className="mt-1 text-[11px] text-muted-foreground">{Math.round(used)}% utilizado de {money(account.creditLimit, account.currency)}</p></>}{cycle && <div className="mt-3 flex gap-4 border-t pt-3 text-xs"><span><CalendarClock className="mr-1 inline h-3.5 w-3.5" />Corte <strong>{cycle.cutoff}</strong></span><span>Pago <strong>{cycle.due}</strong></span></div>}</div></div>
  </button>
}
function ComingSoon({ icon: Icon, title, text }: { icon: typeof ReceiptText; title: string; text: string }) { return <section className="rounded-xl border bg-card p-8 text-center"><Icon className="mx-auto h-10 w-10 text-emerald-600" /><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{text}</p><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-600">Siguiente incremento</p></section> }
