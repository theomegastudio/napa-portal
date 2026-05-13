'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { CardFrame } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronLeft, Trash } from 'lucide-react'

type MeetingType = 'monthly' | 'annual' | 'general' | 'board' | 'committee' | 'special'

interface MeetingDetail {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  notes: string | null
  attendance: { id: string; organizationName: string; attended: boolean; attendeeCount: number }[]
}

interface Org {
  organizationName: string
}

const NAPA_ORG_NAME = 'National APIDA Panhellenic Association'

const TYPE_LABEL: Record<MeetingType, string> = {
  monthly: 'Monthly',
  annual: 'NAPAAM',
  general: 'General',
  board: 'Board',
  committee: 'Committee',
  special: 'Special',
}

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', meetingType: 'monthly' as MeetingType, meetingDate: '', notes: '' })
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAll = async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch('/api/v2/admin/meetings'),
        fetch('/api/v2/admin/organizations'),
      ])
      if (!mRes.ok || !oRes.ok) throw new Error('Failed')
      const meetings = await mRes.json() as MeetingDetail[]
      const m = meetings.find(x => x.id === id) ?? null
      setMeeting(m)
      if (m) setForm({
        title: m.title,
        meetingType: m.meetingType,
        meetingDate: m.meetingDate.slice(0, 10),
        notes: m.notes ?? '',
      })
      const orgList: Org[] = await oRes.json()
      setOrgs(orgList.filter(o => o.organizationName !== NAPA_ORG_NAME))
    } catch {
      toast.error('Failed to load meeting')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  const toggleAttended = async (organizationName: string, attended: boolean) => {
    if (!meeting) return
    setMeeting({
      ...meeting,
      attendance: (() => {
        const existing = meeting.attendance.find(a => a.organizationName === organizationName)
        if (existing) return meeting.attendance.map(a => a.organizationName === organizationName ? { ...a, attended } : a)
        return [...meeting.attendance, { id: 'optimistic', organizationName, attended, attendeeCount: 0 }]
      })(),
    })
    try {
      const res = await fetch(`/api/v2/admin/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: [{ organizationName, attended }] }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      toast.error('Failed to update attendance')
      fetchAll()
    }
  }

  const saveDetails = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/meetings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          meetingType: form.meetingType,
          meetingDate: form.meetingDate,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Meeting updated')
      setEditing(false)
      fetchAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/meetings/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Meeting deleted')
      router.push('/admin/meetings')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>
  if (!meeting) return (
    <div className="text-center py-16">
      <p className="text-sm text-muted-foreground mb-3">Meeting not found.</p>
      <Button variant="outline" render={<Link href="/admin/meetings" />}>Back to meetings</Button>
    </div>
  )

  const attendeeCount = meeting.attendance.filter(a => a.attended && a.organizationName !== NAPA_ORG_NAME).length

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/admin/meetings" />}>
        <ChevronLeft className="h-4 w-4" /> Back to meetings
      </Button>

      {editing ? (
        <CardFrame className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ty">Type</Label>
              <Select value={form.meetingType} onValueChange={(v) => setForm({ ...form, meetingType: v as MeetingType })}>
                <SelectTrigger id="ty"><span>{TYPE_LABEL[form.meetingType]}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">NAPAAM</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d">Date</Label>
              <Input id="d" type="date" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="n">Notes</Label>
            <Textarea id="n" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveDetails} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </CardFrame>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{meeting.title}</h2>
              <Badge variant="outline">{TYPE_LABEL[meeting.meetingType]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(meeting.meetingDate).toLocaleDateString()} · {attendeeCount} attended
            </p>
            {meeting.notes && <p className="text-sm">{meeting.notes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="destructive" onClick={() => setDeleting(true)}><Trash className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <CardFrame className="w-full">
        <Table variant="card">
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="w-28 text-center">Attended</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs.map(org => {
              const attended = meeting.attendance.find(a => a.organizationName === org.organizationName)?.attended ?? false
              return (
                <TableRow key={org.organizationName}>
                  <TableCell>
                    <Link href={`/admin/organizations/${encodeURIComponent(org.organizationName)}`} className="hover:underline hover:text-primary">
                      {org.organizationName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={attended}
                      onCheckedChange={(v) => toggleAttended(org.organizationName, !!v)}
                      aria-label={`${org.organizationName} attended ${meeting.title}`}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardFrame>

      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {meeting.title}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently deletes the meeting and all attendance records.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
