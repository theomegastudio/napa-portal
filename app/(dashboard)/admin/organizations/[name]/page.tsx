'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Trash } from 'lucide-react'

interface Leader {
  id: string
  organizationName: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

interface OrgInfo {
  organizationName: string
  isActive: boolean
  inactivatedAt: string | null
  memberCount: number
  resourceCount: number
}

interface MeetingRow {
  id: string
  title: string
  meetingDate: string
  meetingType: string
  attendance: { organizationName: string; attended: boolean }[]
}

export default function OrgDetailPage() {
  const params = useParams<{ name: string }>()
  const organizationName = decodeURIComponent(params.name)

  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false)
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null)
  const [leaderForm, setLeaderForm] = useState({ name: '', role: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const currentYear = new Date().getFullYear()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [orgsRes, leadersRes, meetingsRes] = await Promise.all([
        fetch('/api/v2/admin/organizations'),
        fetch(`/api/v2/admin/org-leaders?organization=${encodeURIComponent(organizationName)}`),
        fetch('/api/v2/admin/meetings'),
      ])
      if (orgsRes.ok) {
        const orgs: OrgInfo[] = await orgsRes.json()
        setOrg(orgs.find(o => o.organizationName === organizationName) ?? null)
      }
      if (leadersRes.ok) setLeaders(await leadersRes.json())
      if (meetingsRes.ok) {
        const all: MeetingRow[] = await meetingsRes.json()
        const yearStart = new Date(currentYear, 0, 1).getTime()
        const yearEnd = new Date(currentYear + 1, 0, 1).getTime()
        setMeetings(all.filter(m => {
          const t = new Date(m.meetingDate).getTime()
          return t >= yearStart && t < yearEnd
        }))
      }
    } catch {
      toast.error('Failed to load organization')
    } finally {
      setLoading(false)
    }
  }, [organizationName, currentYear])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openAddLeader = () => {
    setEditingLeader(null)
    setLeaderForm({ name: '', role: '', email: '', phone: '', notes: '' })
    setLeaderDialogOpen(true)
  }

  const openEditLeader = (l: Leader) => {
    setEditingLeader(l)
    setLeaderForm({
      name: l.name,
      role: l.role ?? '',
      email: l.email ?? '',
      phone: l.phone ?? '',
      notes: l.notes ?? '',
    })
    setLeaderDialogOpen(true)
  }

  const saveLeader = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingLeader) {
        const res = await fetch(`/api/v2/admin/org-leaders/${editingLeader.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leaderForm),
        })
        if (!res.ok) throw new Error('Failed')
      } else {
        const res = await fetch('/api/v2/admin/org-leaders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationName, ...leaderForm }),
        })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Failed' }))
          throw new Error(error)
        }
      }
      toast.success('Saved')
      setLeaderDialogOpen(false)
      fetchAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteLeader = async (l: Leader) => {
    if (!confirm(`Remove ${l.name}?`)) return
    try {
      const res = await fetch(`/api/v2/admin/org-leaders/${l.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Removed')
      fetchAll()
    } catch {
      toast.error('Failed to remove')
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /></div>
  if (!org) return (
    <div className="text-center py-16">
      <p className="text-sm text-muted-foreground mb-3">Organization not found.</p>
      <Button variant="outline" render={<Link href="/admin/organizations" />}>Back to organizations</Button>
    </div>
  )

  const attendedMeetings = meetings.filter(m =>
    m.attendance.find(a => a.organizationName === organizationName && a.attended)
  )

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/admin/organizations" />}>
        <ChevronLeft className="h-4 w-4" /> Back to organizations
      </Button>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{org.organizationName}</h2>
          {org.isActive ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              Inactive{org.inactivatedAt ? ` · ${new Date(org.inactivatedAt).toLocaleDateString()}` : ''}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {org.memberCount} members · {org.resourceCount} resources
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Leaders &amp; contacts</h3>
          <Button size="sm" onClick={openAddLeader}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
        {leaders.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
            No leaders recorded yet.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map(l => (
                  <TableRow key={l.id} onClick={() => openEditLeader(l)} className="cursor-pointer">
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground">{l.role ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.phone ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteLeader(l) }}>
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Meetings attended ({currentYear})</h3>
        {attendedMeetings.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
            No meetings attended this year.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendedMeetings.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/meetings/${m.id}`} className="hover:underline hover:text-primary">{m.title}</Link>
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.meetingType}</Badge></TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{new Date(m.meetingDate).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={leaderDialogOpen} onOpenChange={setLeaderDialogOpen}>
        <DialogContent>
          <form onSubmit={saveLeader} className="space-y-3">
            <DialogHeader>
              <DialogTitle>{editingLeader ? 'Edit leader' : 'Add leader'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ln">Name *</Label>
                <Input id="ln" value={leaderForm.name} onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lr">Role</Label>
                  <Input id="lr" value={leaderForm.role} onChange={(e) => setLeaderForm({ ...leaderForm, role: e.target.value })} placeholder="President" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="le">Email</Label>
                  <Input id="le" type="email" value={leaderForm.email} onChange={(e) => setLeaderForm({ ...leaderForm, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp">Phone</Label>
                <Input id="lp" value={leaderForm.phone} onChange={(e) => setLeaderForm({ ...leaderForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln2">Notes</Label>
                <Textarea id="ln2" rows={2} value={leaderForm.notes} onChange={(e) => setLeaderForm({ ...leaderForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLeaderDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !leaderForm.name.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
