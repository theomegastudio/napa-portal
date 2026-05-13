'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { CardFrame } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { AlertTriangle, CalendarPlus, MoreHorizontal, SquarePen, Trash, Users } from 'lucide-react'

type MeetingType = 'monthly' | 'annual' | 'general' | 'board' | 'committee' | 'special'

interface MeetingAttendance {
  id: string
  organizationName: string
  attended: boolean
}

interface Meeting {
  id: string
  title: string
  meetingType: MeetingType
  meetingDate: string
  notes: string | null
  attendance: MeetingAttendance[]
}

interface Org {
  id: string
  organizationName: string
  displayOrder: number
}

const NAPA_ORG_NAME = 'National APIDA Panhellenic Association'
const MIN_ATTENDEES = 2

const TYPE_LABEL: Record<MeetingType, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  general: 'General',
  board: 'Board',
  committee: 'Committee',
  special: 'Special',
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [deleting, setDeleting] = useState<Meeting | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    meetingType: 'monthly' as MeetingType,
    meetingDate: '',
    notes: '',
  })

  const fetchMeetings = async () => {
    try {
      const [mRes, oRes] = await Promise.all([
        fetch('/api/v2/admin/meetings'),
        fetch('/api/v2/admin/organizations'),
      ])
      if (!mRes.ok || !oRes.ok) throw new Error('Failed')
      setMeetings(await mRes.json())
      const orgList: Org[] = await oRes.json()
      setOrgs(orgList.filter(o => o.organizationName !== NAPA_ORG_NAME))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMeetings() }, [])

  const openCreate = () => {
    setForm({ title: '', meetingType: 'monthly', meetingDate: '', notes: '' })
    setCreateOpen(true)
  }

  const openEdit = (m: Meeting) => {
    setForm({
      title: m.title,
      meetingType: m.meetingType,
      meetingDate: m.meetingDate.slice(0, 10),
      notes: m.notes ?? '',
    })
    setEditing(m)
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/meetings/${editing.id}`, {
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
      setEditing(null)
      fetchMeetings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update meeting')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/meetings/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Meeting deleted')
      setDeleting(null)
      fetchMeetings()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete meeting')
    } finally {
      setSaving(false)
    }
  }

  const toggleAttendance = async (meeting: Meeting, organizationName: string, attended: boolean) => {
    // optimistic
    setMeetings(prev => prev.map(m => {
      if (m.id !== meeting.id) return m
      const existing = m.attendance.find(a => a.organizationName === organizationName)
      const newAttendance = existing
        ? m.attendance.map(a => a.organizationName === organizationName ? { ...a, attended } : a)
        : [...m.attendance, { id: 'optimistic', organizationName, attended }]
      return { ...m, attendance: newAttendance }
    }))
    try {
      const res = await fetch(`/api/v2/admin/meetings/${meeting.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance: [{ organizationName, attended }] }),
      })
      if (!res.ok) throw new Error('Failed to update attendance')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update attendance')
      fetchMeetings()
    }
  }

  const attendeesFor = (m: Meeting) =>
    m.attendance.filter(a => a.attended && a.organizationName !== NAPA_ORG_NAME).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meetings</h2>
          <p className="text-sm text-muted-foreground">Schedule monthly and annual meetings and track which orgs attended.</p>
        </div>
        <Button onClick={openCreate}>
          <CalendarPlus className="h-4 w-4 mr-2" />Add Meeting
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No meetings yet</h3>
          <p className="text-sm text-muted-foreground">Create a meeting to start tracking attendance.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map(m => {
            const attendees = attendeesFor(m)
            const isLow = (m.meetingType === 'monthly' || m.meetingType === 'annual') && attendees < MIN_ATTENDEES
            return (
              <CardFrame key={m.id} className="w-full">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{TYPE_LABEL[m.meetingType]}</Badge>
                    <div>
                      <p className="font-medium">{m.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(m.meetingDate).toLocaleDateString()} · {attendees} attendee{attendees === 1 ? '' : 's'}
                      </p>
                    </div>
                    {isLow && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <AlertTriangle className="h-3 w-3 mr-1" /> below minimum
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(m)}>
                        <SquarePen className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(m)}>
                        <Trash className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Table variant="card" className="border-t-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="w-28 text-center">Attended</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map(org => {
                      const attended = m.attendance.find(a => a.organizationName === org.organizationName)?.attended ?? false
                      return (
                        <TableRow key={org.organizationName}>
                          <TableCell>{org.organizationName}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox
                              checked={attended}
                              onCheckedChange={(v) => toggleAttendance(m, org.organizationName, !!v)}
                              aria-label={`${org.organizationName} attended ${m.title}`}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {orgs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">
                          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          No organizations to track attendance for.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardFrame>
            )
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Meeting</DialogTitle>
              <DialogDescription>Create a meeting record. Track attendance from the row that appears in the list.</DialogDescription>
            </DialogHeader>
            <MeetingFormFields form={form} setForm={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim() || !form.meetingDate}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Meeting</DialogTitle>
              <DialogDescription>Update meeting details. Attendance is managed inline in the list.</DialogDescription>
            </DialogHeader>
            <MeetingFormFields form={form} setForm={setForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.title.trim() || !form.meetingDate}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.title}?</DialogTitle>
            <DialogDescription>
              This deletes the meeting and all its attendance records. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface MeetingForm {
  title: string
  meetingType: MeetingType
  meetingDate: string
  notes: string
}

function MeetingFormFields({
  form,
  setForm,
}: {
  form: MeetingForm
  setForm: (next: MeetingForm) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="meeting-title">Title *</Label>
        <Input
          id="meeting-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          autoFocus
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="meeting-type">Type</Label>
          <Select value={form.meetingType} onValueChange={(v) => setForm({ ...form, meetingType: v as MeetingType })}>
            <SelectTrigger id="meeting-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="committee">Committee</SelectItem>
              <SelectItem value="special">Special</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meeting-date">Date *</Label>
          <Input
            id="meeting-date"
            type="date"
            value={form.meetingDate}
            onChange={(e) => setForm({ ...form, meetingDate: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meeting-notes">Notes</Label>
        <Textarea
          id="meeting-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </div>
  )
}
