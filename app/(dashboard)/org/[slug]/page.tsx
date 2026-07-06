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
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Trash } from 'lucide-react'
import { formatDateOnly } from '@/lib/format'

interface Leader {
  id: string
  organizationName: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  year: number | null
}

interface MeetingItem {
  id: string
  title: string
  meetingType: string
  meetingDate: string
  attendeeCount: number
}

interface OrgPayload {
  organization: {
    organizationName: string
    slug: string
    isActive: boolean
    inactivatedAt: string | null
    memberCount: number
  }
  year: number
  permissions: {
    canEditLeaders: boolean
    isNapa: boolean
    isOwnOrg: boolean
  }
  metrics: {
    monthlyMeetings: number
    monthlyAttended: number
    napaamAttendees: number
    renewalCompleted: boolean
    oneOnOneCompleted: boolean
    duesPaid: boolean
    duesPartial: boolean
    duesTargetAmount: number | null
    duesPaidAmount: number
    engagementScore: number
  }
  meetings: MeetingItem[]
  leaders: Leader[]
}

const TYPE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'NAPAAM',
  general: 'General',
  board: 'Board',
  committee: 'Committee',
  special: 'Special',
}

export default function OrgDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params.slug)

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [data, setData] = useState<OrgPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [leaderDialogOpen, setLeaderDialogOpen] = useState(false)
  const [editingLeader, setEditingLeader] = useState<Leader | null>(null)
  const [leaderForm, setLeaderForm] = useState({ name: '', role: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const years = Array.from({ length: Math.max(1, currentYear - 2024) }, (_, i) => String(2025 + i)).reverse()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v2/org/${encodeURIComponent(slug)}?year=${year}`)
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        if (res.status === 403) setError('You do not have access to this organization.')
        else if (res.status === 404) setError('Organization not found.')
        else setError(error || 'Failed to load.')
        return
      }
      setData(await res.json())
    } catch {
      setError('Failed to load organization.')
    } finally {
      setLoading(false)
    }
  }, [slug, year])

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
    if (!data) return
    setSaving(true)
    try {
      if (editingLeader) {
        const res = await fetch(`/api/v2/admin/org-leaders/${editingLeader.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...leaderForm, year: parseInt(year) }),
        })
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: 'Failed' }))
          throw new Error(error)
        }
      } else {
        const res = await fetch('/api/v2/admin/org-leaders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationName: data.organization.organizationName,
            year: parseInt(year),
            ...leaderForm,
          }),
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
  if (error || !data) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-sm text-muted-foreground">{error || 'Organization not found.'}</p>
      <Button variant="outline" render={<Link href="/" />}>Back to Resources</Button>
    </div>
  )

  const { organization: org, metrics, permissions, meetings, leaders } = data
  const score = metrics.engagementScore
  const scoreColor = score >= 80 ? 'text-green-700' : score >= 50 ? 'text-yellow-700' : 'text-red-700'

  const backHref = permissions.isNapa ? '/admin/org-health' : '/'
  const backLabel = permissions.isNapa ? 'Back to Org Health' : 'Back to Resources'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" render={<Link href={backHref} />}>
          <ChevronLeft className="h-4 w-4" /> {backLabel}
        </Button>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><span>{year}</span></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{org.organizationName}</h2>
          {org.isActive ? (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
              Inactive{org.inactivatedAt ? ` - ${new Date(org.inactivatedAt).toLocaleDateString()}` : ''}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{org.memberCount} members</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ScoreTile label="Engagement Score" value={`${score}/100`} valueClass={scoreColor} />
        <ScoreTile label="Monthly Meetings (YTD)" value={`${metrics.monthlyAttended}/${metrics.monthlyMeetings}`} />
        <ScoreTile label="NAPAAM Attendees" value={String(metrics.napaamAttendees)} />
        <ScoreTile label="Renewal & Cert" value={metrics.renewalCompleted ? 'Complete' : 'Incomplete'} valueClass={metrics.renewalCompleted ? 'text-green-700' : 'text-muted-foreground'} />
        <ScoreTile label="1x1 with NAPA" value={metrics.oneOnOneCompleted ? 'Complete' : 'Incomplete'} valueClass={metrics.oneOnOneCompleted ? 'text-green-700' : 'text-muted-foreground'} />
        <ScoreTile
          label="Dues"
          value={metrics.duesPaid ? 'Paid' : metrics.duesPartial ? 'Partial' : 'Unpaid'}
          valueClass={metrics.duesPaid ? 'text-green-700' : metrics.duesPartial ? 'text-amber-700' : 'text-muted-foreground'}
          subtitle={metrics.duesTargetAmount != null ? `$${metrics.duesPaidAmount.toFixed(0)} of $${metrics.duesTargetAmount.toFixed(0)}` : undefined}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Leaders &amp; contacts <span className="font-normal text-sm text-muted-foreground">({year})</span></h3>
          {permissions.canEditLeaders && (
            <Button size="sm" onClick={openAddLeader}><Plus className="h-4 w-4 mr-1" />Add</Button>
          )}
        </div>
        {leaders.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
            No leaders recorded for {year}.
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
                  {permissions.canEditLeaders && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaders.map(l => (
                  <TableRow
                    key={l.id}
                    onClick={permissions.canEditLeaders ? () => openEditLeader(l) : undefined}
                    className={permissions.canEditLeaders ? 'cursor-pointer' : ''}
                  >
                    <TableCell className="font-medium">
                      {l.name}
                      {l.year == null && (
                        <Badge variant="outline" className="ml-2 text-xs">Ongoing</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.role ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.email ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.phone ?? '-'}</TableCell>
                    {permissions.canEditLeaders && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteLeader(l) }}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Meetings ({year})</h3>
        {meetings.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
            No meetings recorded for {year}.
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-32">Date</TableHead>
                  <TableHead className="w-32 text-right">Your Attendees</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meetings.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {permissions.isNapa
                        ? <Link href={`/admin/meetings/${m.id}`} className="hover:underline hover:text-primary">{m.title}</Link>
                        : m.title}
                    </TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABEL[m.meetingType] ?? m.meetingType}</Badge></TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{formatDateOnly(m.meetingDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.attendeeCount}</TableCell>
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
              <DialogTitle>{editingLeader ? 'Edit leader' : `Add leader for ${year}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ln">Name *</Label>
                <Input id="ln" value={leaderForm.name} onChange={(e) => setLeaderForm({ ...leaderForm, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

function ScoreTile({
  label,
  value,
  valueClass,
  subtitle,
}: {
  label: string
  value: string
  valueClass?: string
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold mt-0.5 ${valueClass ?? ''}`}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  )
}
