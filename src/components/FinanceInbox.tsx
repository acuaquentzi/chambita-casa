import { useMemo, useRef, useState } from 'react'
import { Check, ClipboardPaste, FileUp, NotebookPen, Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  EXPENSE_CATEGORIES, money, parseMovementText, suggestCategory, transactionFingerprint,
  type FinanceAccount, type FinanceTransaction, type FinanceTransactionSource,
} from '@/finance'

interface Props {
  accounts: FinanceAccount[]
  owners: string[]
  today: string
  transactions: FinanceTransaction[]
  onSave: (transaction: FinanceTransaction, create?: boolean) => void
}

const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm'

export function FinanceInbox({ accounts, owners, today, transactions, onSave }: Props) {
  const [quickOpen, setQuickOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [owner, setOwner] = useState(owners[0] ?? '')
  const [notice, setNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [quick, setQuick] = useState({ date: today, description: '', amount: '', category: 'Sin categoría', accountId: accounts[0]?.id ?? '', owner: owners[0] ?? '' })

  const pending = transactions.filter(t => t.status === 'Por revisar')
  const confirmed = transactions.filter(t => t.status === 'Confirmado')
  const parsed = useMemo(() => parseMovementText(text, today), [text, today])
  const existing = useMemo(() => new Set(transactions.map(t => t.fingerprint)), [transactions])

  const openImport = (mode: 'paste' | 'file') => {
    setImportMode(mode); setText(''); setFileName(''); setNotice('')
    setAccountId(accounts[0]?.id ?? ''); setOwner(owners[0] ?? '')
    setImportOpen(true)
  }
  const importParsed = (source: FinanceTransactionSource) => {
    let added = 0, duplicates = 0
    parsed.forEach(p => {
      const fingerprint = transactionFingerprint(p.date, p.description, p.amount, accountId)
      if (existing.has(fingerprint)) { duplicates++; return }
      existing.add(fingerprint)
      onSave({
        id: `mov-${crypto.randomUUID()}`, accountId, owner, date: p.date, description: p.description,
        amount: p.amount, kind: p.kind, category: p.category, status: 'Por revisar', source,
        fingerprint, createdAt: new Date().toISOString(),
      }, true)
      added++
    })
    setImportOpen(false)
    setNotice(`${added} movimiento${added === 1 ? '' : 's'} agregado${added === 1 ? '' : 's'} para revisar${duplicates ? ` · ${duplicates} duplicado${duplicates === 1 ? '' : 's'} omitido${duplicates === 1 ? '' : 's'}` : ''}.`)
  }
  const readFile = (file?: File) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }
  const saveQuick = () => {
    const amount = Number(quick.amount)
    if (!quick.description.trim() || !amount) return
    const category = quick.category === 'Sin categoría' ? suggestCategory(quick.description) : quick.category
    const fingerprint = transactionFingerprint(quick.date, quick.description, amount, quick.accountId)
    if (existing.has(fingerprint)) { setNotice('Ese gasto ya parece estar registrado.'); setQuickOpen(false); return }
    onSave({
      id: `mov-${crypto.randomUUID()}`, accountId: quick.accountId, owner: quick.owner, date: quick.date,
      description: quick.description.trim(), amount: Math.abs(amount), kind: 'Gasto', category,
      status: 'Confirmado', source: 'Registro rápido', fingerprint, createdAt: new Date().toISOString(),
    }, true)
    setQuick({ date: today, description: '', amount: '', category: 'Sin categoría', accountId: accounts[0]?.id ?? '', owner: owners[0] ?? '' })
    setQuickOpen(false); setNotice('Gasto guardado.')
  }
  const patch = (transaction: FinanceTransaction, changes: Partial<FinanceTransaction>) => onSave({ ...transaction, ...changes })

  return <div className="space-y-4">
    <section className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:from-amber-950/30 dark:to-orange-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3"><NotebookPen className="mt-0.5 h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" /><div><h3 className="font-semibold">Bandeja semanal</h3><p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">Como un cuaderno: reúne todo primero y ordena después. Marea propone categorías; ustedes solo revisan lo dudoso.</p></div></div>
        <div className="rounded-lg bg-background/80 px-4 py-2 text-center"><p className="text-2xl font-bold tabular-nums">{pending.length}</p><p className="text-[11px] uppercase tracking-wide text-muted-foreground">por revisar</p></div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3">
      <Action icon={FileUp} title="Subir archivo" text="CSV o texto del banco" onClick={() => openImport('file')} />
      <Action icon={ClipboardPaste} title="Pegar movimientos" text="Desde la app o el cuaderno" onClick={() => openImport('paste')} />
      <Action icon={Plus} title="Registro rápido" text="Concepto y cantidad" onClick={() => setQuickOpen(true)} />
    </section>

    {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><Check className="h-4 w-4" />{notice}<button className="ml-auto" onClick={() => setNotice('')} aria-label="Cerrar"><X className="h-4 w-4" /></button></div>}

    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">Por revisar</h3><p className="text-sm text-muted-foreground">Confirma la categoría o marca lo que no deba contarse.</p></div>{pending.some(t => t.category !== 'Sin categoría') && <Button size="sm" variant="outline" onClick={() => pending.filter(t => t.category !== 'Sin categoría').forEach(t => patch(t, { status: 'Confirmado' }))}>Confirmar clasificados</Button>}</div>
      {pending.length ? <div className="divide-y">{pending.map(t => <ReviewRow key={t.id} transaction={t} accounts={accounts} onPatch={c => patch(t, c)} />)}</div> : <div className="p-8 text-center"><Sparkles className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 font-medium">Todo revisado</p><p className="mt-1 text-sm text-muted-foreground">Sube un archivo, pega una lista o registra un gasto rápido.</p></div>}
    </section>

    {confirmed.length > 0 && <section className="rounded-xl border bg-card p-4"><p className="text-sm font-semibold">Confirmados recientemente</p><div className="mt-3 space-y-2">{confirmed.slice(0, 5).map(t => <div key={t.id} className="flex items-center gap-3 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="min-w-0 flex-1 truncate">{t.description}</span><span className="text-muted-foreground">{t.category}</span><strong className="tabular-nums">{money(t.amount)}</strong></div>)}</div></section>}

    <Dialog open={quickOpen} onOpenChange={setQuickOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Registro rápido</DialogTitle><DialogDescription>La versión simple del cuaderno. Solo concepto y cantidad son obligatorios.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><Field label="Concepto"><Input autoFocus value={quick.description} onChange={e => setQuick(q => ({ ...q, description: e.target.value }))} placeholder="Ej. comida, farmacia, transporte" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Cantidad"><Input type="number" inputMode="decimal" value={quick.amount} onChange={e => setQuick(q => ({ ...q, amount: e.target.value }))} placeholder="0.00" /></Field><Field label="Fecha"><Input type="date" value={quick.date} onChange={e => setQuick(q => ({ ...q, date: e.target.value }))} /></Field></div><Field label="Categoría (opcional)"><select className={selectClass} value={quick.category} onChange={e => setQuick(q => ({ ...q, category: e.target.value }))}>{EXPENSE_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Persona"><select className={selectClass} value={quick.owner} onChange={e => setQuick(q => ({ ...q, owner: e.target.value }))}>{owners.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Cuenta"><AccountSelect value={quick.accountId} accounts={accounts} onChange={v => setQuick(q => ({ ...q, accountId: v }))} /></Field></div></div><DialogFooter><Button variant="outline" onClick={() => setQuickOpen(false)}>Cancelar</Button><Button onClick={saveQuick} disabled={!quick.description.trim() || !Number(quick.amount)}>Guardar gasto</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={importOpen} onOpenChange={setImportOpen}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{importMode === 'file' ? 'Subir movimientos' : 'Pegar movimientos'}</DialogTitle><DialogDescription>Formato: fecha, concepto, cantidad. También acepta punto y coma o tabulaciones.</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="grid grid-cols-2 gap-3"><Field label="Persona"><select className={selectClass} value={owner} onChange={e => setOwner(e.target.value)}>{owners.map(x => <option key={x}>{x}</option>)}</select></Field><Field label="Cuenta"><AccountSelect value={accountId} accounts={accounts} onChange={setAccountId} /></Field></div>{importMode === 'file' ? <div><input ref={fileRef} type="file" className="hidden" accept=".csv,.txt,text/csv,text/plain" onChange={e => readFile(e.target.files?.[0])} /><button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed p-8 text-center hover:bg-muted/50"><FileUp className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-medium">{fileName || 'Seleccionar CSV o TXT'}</p><p className="mt-1 text-xs text-muted-foreground">El archivo se prepara localmente antes de confirmar.</p></button></div> : <Field label="Lista de movimientos"><Textarea rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={'27/10/2026; Walmart; 850.50\n27/10/2026; Uber; 125.00'} /></Field>}{text && <div className="rounded-lg bg-muted px-4 py-3 text-sm"><strong>{parsed.length}</strong> movimientos reconocidos · <strong>{parsed.filter(p => p.category === 'Sin categoría').length}</strong> necesitan categoría</div>}</div><DialogFooter><Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button><Button onClick={() => importParsed(importMode === 'file' ? 'Archivo' : 'Texto pegado')} disabled={!parsed.length}>Agregar a revisión</Button></DialogFooter></DialogContent></Dialog>
  </div>
}

function Action({ icon: Icon, title, text, onClick }: { icon: typeof FileUp; title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/30"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span><strong className="block text-sm">{title}</strong><span className="text-xs text-muted-foreground">{text}</span></span></button> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div> }
function AccountSelect({ value, accounts, onChange }: { value: string; accounts: FinanceAccount[]; onChange: (v: string) => void }) { return <select className={selectClass} value={value} onChange={e => onChange(e.target.value)}><option value="">Sin asignar</option>{accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> }
function ReviewRow({ transaction: t, accounts, onPatch }: { transaction: FinanceTransaction; accounts: FinanceAccount[]; onPatch: (c: Partial<FinanceTransaction>) => void }) {
  const account = accounts.find(a => a.id === t.accountId)
  return <div className="grid gap-3 p-4 sm:grid-cols-[1fr_170px_auto] sm:items-center"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate font-medium">{t.description}</p><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.source}</span></div><p className="mt-1 text-xs text-muted-foreground">{t.date} · {t.owner}{account ? ` · ${account.name}` : ''}</p></div><div><select aria-label="Categoría" className={selectClass} value={t.category} onChange={e => onPatch({ category: e.target.value })}>{EXPENSE_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select><p className="mt-1 text-right text-sm font-bold tabular-nums">{t.kind === 'Ingreso' ? '+' : '−'} {money(t.amount)}</p></div><div className="flex gap-1 sm:flex-col"><Button size="sm" onClick={() => onPatch({ status: 'Confirmado' })} disabled={t.category === 'Sin categoría'}><Check className="mr-1 h-4 w-4" /> Confirmar</Button><Button size="sm" variant="ghost" onClick={() => onPatch({ status: 'Ignorado' })}>Ignorar</Button></div></div>
}
