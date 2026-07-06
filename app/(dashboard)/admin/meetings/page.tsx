'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { AlertTriangle, CalendarPlus, FileDown, FileUp } from 'lucide-react'
import { formatDateOnly } from '@/lib/format'
import { NAPA_ORG_NAME } from '@/lib/constants'

type MeetingType = 'monthly' | 'annual' | 'general' | 'board' | 'committee' | 'special'

interface Meeting {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  notes: string | null
  attendance: { id: string; organizationName: string; attended: boolean }[]
}

const MIN_ATTENDEES = 2

const TYPE_LABEL: Record<MeetingType, string> = {
  monthly: 'Monthly',
  annual: 'NAPAAM',
  general: 'General',
  board: 'Board',
  committee: 'Committee',
  special: 'Special',
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [year, setYear] = useState<string>(String(new Date().getFullYear()))

  const [form, setForm] = useState({
    title: '',
    meetingType: 'monthly' as MeetingType,
    meetingDate: '',
    notes: '',
  })
  const [csvText, setCsvText] = useState('')

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/v2/admin/meetings')
      if (!res.ok) throw new Error('Failed')
      setMeetings(await res.json())
    } catch {
      toast.error('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMeetings() }, [])

  const openCreate = () => {
    setForm({ title: '', meetingType: 'monthly', meetingDate: '', notes: '' })
    setCreateOpen(true)
  }

  const exportCsv = () => {
    const header = 'Title,Type,Date,Notes'
    const rows = meetings.filter(m => m.meetingDate.slice(0, 4) === year).map(m => {
      const cells = [m.title, m.meetingType, m.meetingDate.slice(0, 10), m.notes ?? '']
      return cells.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meetings-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/v2/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          meetingType: form.meetingType,
          meetingDate: form.meetingDate,
          notes: form.notes || undefined,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Meeting created')
      setCreateOpen(false)
      fetchMeetings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async () => {
    const rows = csvText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.toLowerCase().startsWith('title,'))
      .map(line => {
        const [title, date, ...notesParts] = line.split(',').map(s => s.trim())
        return { title, date, notes: notesParts.join(',').trim() || undefined }
      })
      .filter(r => r.title && r.date)

    if (rows.length === 0) {
      toast.error('No valid rows. Format: Title,YYYY-MM-DD,Notes')
      return
    }

    setSaving(true)
    let created = 0
    let failed = 0
    for (const r of rows) {
      try {
        const res = await fetch('/api/v2/admin/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: r.title,
            meetingType: 'monthly',
            meetingDate: r.date,
            notes: r.notes,
          }),
        })
        if (res.ok) created++
        else failed++
      } catch {
        failed++
      }
    }
    setSaving(false)
    if (created) toast.success(`Imported ${created} meeting${created === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}`)
    if (!created && failed) toast.error(`Failed to import ${failed} row(s)`)
    setImportOpen(false)
    setCsvText('')
    fetchMeetings()
  }

  const attendeesFor = (m: Meeting) =>
    m.attendance.filter(a => a.attended && a.organizationName !== NAPA_ORG_NAME).length

  // Years present in the data, plus the current year, newest first.
  const availableYears = Array.from(
    new Set([String(new Date().getFullYear()), ...meetings.map(m => m.meetingDate.slice(0, 4))])
  ).sort((a, b) => Number(b) - Number(a))

  const displayed = meetings.filter(m => m.meetingDate.slice(0, 4) === year)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meetings</h2>
          <p className="text-sm text-muted-foreground">Monthly meetings, NAPAAM, and other gatherings. Click a row to manage attendance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28"><span>{year}</span></SelectTrigger>
            <SelectContent>
              {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv}>
            <FileDown className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileUp className="h-4 w-4 mr-2" />Import CSV
          </Button>
          <Button onClick={openCreate}>
            <CalendarPlus className="h-4 w-4 mr-2" />Add Meeting
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No meetings in {year}</h3>
          <p className="text-sm text-muted-foreground">
            {meetings.length === 0 ? 'Create a meeting or import a CSV to get started.' : 'Try selecting a different year, or add a meeting.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting</TableHead>
                <TableHead className="w-32">Type</TableHead>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="w-32 text-right">Attended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map(m => {
                const attendees = attendeesFor(m)
                const isLow = (m.meetingType === 'monthly' || m.meetingType === 'annual') && attendees < MIN_ATTENDEES
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/admin/meetings/${m.id}`} className="font-medium hover:underline hover:text-primary">
                        {m.title}
                      </Link>
                      {m.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.notes}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TYPE_LABEL[m.meetingType]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDateOnly(m.meetingDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="tabular-nums">{attendees}</span>
                        {isLow && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Meeting</DialogTitle>
              <DialogDescription>Attendance is managed from the meeting detail page after creation.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-title">Title *</Label>
                <Input id="meeting-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-type">Type</Label>
                  <Select value={form.meetingType} onValueChange={(v) => setForm({ ...form, meetingType: v as MeetingType })}>
                    <SelectTrigger id="meeting-type">
                      <span>{TYPE_LABEL[form.meetingType]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">NAPAAM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meeting-date">Date *</Label>
                  <Input id="meeting-date" type="date" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-notes">Notes</Label>
                <Textarea id="meeting-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim() || !form.meetingDate}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import monthly meetings</DialogTitle>
            <DialogDescription>
              Paste rows in <code className="px-1 py-0.5 bg-muted rounded text-xs">Title,YYYY-MM-DD,Notes</code> format. One per line. All imports are tagged as monthly meetings.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={10}
            placeholder={"Title,2026-01-15,Optional notes\nMonthly Meeting Feb,2026-02-12"}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={saving || !csvText.trim()}>
              {saving ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
