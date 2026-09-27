'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { AlertCircle, CheckCircle2, Copy, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'

type ReferenceUser = { id: string; name: string; email: string; role: string }
type ReferenceProperty = { id: string; title: string; address: string; owner?: { name?: string }; tenant?: { name?: string } | null }
type ImportPreview = {
  success: boolean
  canImport: boolean
  summary: { expenses: number; tenantPayments: number; ownerPayments: number; total: number; skipped: number; recognized: number }
  issues: Array<{ sheet: string; row: number; message: string }>
  rows: Array<{ kind: string; sheet: string; row: number; label: string; amount: number }>
}

export default function ImportarExcelPage() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [processing, setProcessing] = useState(false)
  const [properties, setProperties] = useState<ReferenceProperty[]>([])
  const [users, setUsers] = useState<ReferenceUser[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/properties').then(response => response.json()),
      fetch('/api/users').then(response => response.json()),
    ]).then(([propertyData, userData]) => {
      setProperties(propertyData.properties || propertyData.data || [])
      setUsers(userData.users || [])
    }).catch(() => undefined)
  }, [])

  const tenants = useMemo(() => users.filter(user => user.role === 'INQUILINO'), [users])
  const owners = useMemo(() => users.filter(user => user.role === 'PROPIETARIO'), [users])

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast({ title: 'Identificador copiado' })
  }

  const submitWorkbook = async (commit: boolean) => {
    if (!file) return
    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('commit', String(commit))
      const response = await fetch('/api/imports/finance', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok || (commit && !data.success)) throw new Error(data.error || 'No se pudo importar el archivo')
      if (commit) {
        toast({ title: 'Importación completada', description: `${data.imported.total} registros nuevos guardados y ${data.imported.skipped} existentes omitidos.` })
        setFile(null)
        setPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        setPreview(data)
        toast({
          title: data.canImport ? 'Archivo listo para importar' : data.issues?.length ? 'Revise los errores encontrados' : 'No hay registros nuevos',
          description: `${data.summary?.total || 0} nuevos y ${data.summary?.skipped || 0} existentes omitidos.`,
          variant: data.issues?.length ? 'destructive' : 'default',
        })
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'No se pudo procesar el archivo', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-[#f5f7fa] p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Importar registros desde Excel</h1>
              <p className="text-muted-foreground">Carga gastos, pagos de inquilinos y abonos de propietarios en un solo archivo.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-[#126b73]" />Carga guiada</CardTitle>
                  <CardDescription>La aplicación valida todas las filas antes de guardar. Los registros existentes se omiten y solo se importan los nuevos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <a href="/api/imports/finance/template" download>
                    <Button variant="outline" className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" />Descargar Excel con todos los registros</Button>
                  </a>
                  <div className="rounded-xl border-2 border-dashed border-[#126b73]/25 bg-white p-8 text-center">
                    <Upload className="mx-auto mb-3 h-9 w-9 text-[#126b73]" />
                    <input ref={fileInputRef} type="file" accept=".xlsx" className="mx-auto block max-w-full text-sm" onChange={event => { setFile(event.target.files?.[0] || null); setPreview(null) }} />
                    <p className="mt-2 text-xs text-muted-foreground">Formato .xlsx, máximo 5 MB. Añada los registros nuevos al final de cada hoja.</p>
                  </div>
                  <Button onClick={() => submitWorkbook(false)} disabled={!file || processing} className="bg-[#126b73] hover:bg-[#0f5960]">
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Analizar archivo
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader><CardTitle>Resultado de la validacion</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {!preview ? <p className="text-sm text-muted-foreground">Seleccione un archivo para ver el resumen antes de importarlo.</p> : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-rose-50 p-3"><p className="text-xs text-muted-foreground">Gastos</p><p className="text-2xl font-bold">{preview.summary.expenses}</p></div>
                        <div className="rounded-xl bg-blue-50 p-3"><p className="text-xs text-muted-foreground">Pagos inquilinos</p><p className="text-2xl font-bold">{preview.summary.tenantPayments}</p></div>
                        <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs text-muted-foreground">Pagos propietario</p><p className="text-2xl font-bold">{preview.summary.ownerPayments}</p></div>
                        <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-muted-foreground">Nuevos</p><p className="text-2xl font-bold">{preview.summary.total}</p></div>
                      </div>
                      {preview.summary.skipped > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{preview.summary.skipped} registros existentes o repetidos serán omitidos.</div>}
                      {preview.issues.length ? (
                        <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-red-200 bg-red-50 p-3">
                          {preview.issues.map((issue, index) => <div key={`${issue.sheet}-${issue.row}-${index}`} className="flex gap-2 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{issue.sheet}{issue.row ? `, fila ${issue.row}` : ''}: {issue.message}</span></div>)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />{preview.summary.total > 0 ? 'El archivo está listo para guardar.' : 'No se encontraron registros nuevos.'}</div>
                      )}
                      <Button onClick={() => submitWorkbook(true)} disabled={!preview.canImport || processing} className="w-full bg-emerald-600 hover:bg-emerald-700">Confirmar e importar {preview.summary.total} registros nuevos</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader><CardTitle>Identificadores para completar la plantilla</CardTitle><CardDescription>Use el botón de copiar y pegue el valor en Excel. Así se evitan coincidencias erróneas por nombres repetidos.</CardDescription></CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-3">
                <ReferenceTable title="Propiedades" rows={properties.map(item => ({ id: item.id, name: item.title, detail: item.address }))} onCopy={copy} />
                <ReferenceTable title="Inquilinos" rows={tenants.map(item => ({ id: item.id, name: item.name, detail: item.email }))} onCopy={copy} />
                <ReferenceTable title="Propietarios" rows={owners.map(item => ({ id: item.id, name: item.name, detail: item.email }))} onCopy={copy} />
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  )
}

function ReferenceTable({ title, rows, onCopy }: { title: string; rows: Array<{ id: string; name: string; detail: string }>; onCopy: (id: string) => void }) {
  return <div className="overflow-hidden rounded-xl border bg-white">
    <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3"><h2 className="font-semibold">{title}</h2><Badge variant="secondary">{rows.length}</Badge></div>
    <div className="max-h-80 overflow-auto"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>
      {rows.map(row => <TableRow key={row.id}><TableCell><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.detail}</p></TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => onCopy(row.id)} title={`Copiar ID de ${row.name}`}><Copy className="h-4 w-4" /></Button></TableCell></TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Sin registros</TableCell></TableRow>}
    </TableBody></Table></div>
  </div>
}
