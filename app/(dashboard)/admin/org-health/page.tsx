'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertTriangle, Building2, DollarSign, Plus, Trash } from 'lucide-react'
import { orgSlug } from '@/lib/slug'
import { formatDateOnly } from '@/lib/format'

interface DuesPayment {
  id: string
  amount: number
  paidAt: string
}

interface OrgHealth {
  organizationName: string
  monthlyMeetings: number
  monthlyAttended: number
  napaamAttendees: number
  renewalCompleted: boolean
  renewalCompletedAt: string | null
  oneOnOneCompleted: boolean
  oneOnOneCompletedAt: string | null
  duesPaid: boolean
  duesPartial: boolean
  duesRecordId: string | null
  duesTargetAmount: number | null
  duesPaidAmount: number
  duesPayments: DuesPayment[]
  engagementScore: number
}

interface LowMeeting {
  id: string
  title: string
  meetingDate: string
  attendeeCount: number
}

interface HealthData {
  year: number
  organizations: OrgHealth[]
  monthlyMeetingCount: number
  annualMeetingCount: number
  lowAttendanceMonthly: LowMeeting[]
  minAttendeesPerMeeting: number
  duesTarget: number | null
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
    score >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-red-100 text-red-800 border-red-200'
  return <Badge variant="outline" className={`font-mono ${color}`}>{score}</Badge>
}

/**
 * Recompute the engagement score for optimistic updates. Baseline 16 per
 * dimension when no data exists (so empty orgs start at 80), 20 when fully
 * complete. Server has the authoritative version that uses past-only meetings;
 * this client copy assumes the row data already reflects that.
 */
function computeScore(row: OrgHealth, monthlyMeetingCount: number): number {
  const monthlyScore = monthlyMeetingCount > 0
    ? Math.round((row.monthlyAttended / monthlyMeetingCount) * 20)
    : 16
  // We can't know on the client whether NAPAAM has occurred yet - server already
  // baked that into napaamAttendees, so treat 0 as "no data" => baseline.
  const napaamScore = row.napaamAttendees >= 2 ? 20 : row.napaamAttendees === 1 ? 10 : 16
  const renewalScore = row.renewalCompleted ? 20 : 16
  const duesScore = row.duesPaid ? 20 : row.duesPartial ? 10 : 16
  const oneOnOneScore = row.oneOnOneCompleted ? 20 : 16
  return monthlyScore + napaamScore + renewalScore + duesScore + oneOnOneScore
}

export default function OrgHealthPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [duesOrg, setDuesOrg] = useState<OrgHealth | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/v2/admin/org-health?year=${year}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then(setData)
      .catch(() => toast.error('Failed to load org health data'))
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => { fetchData() }, [fetchData])

  const updateRow = (orgName: string, patch: Partial<OrgHealth>) => {
    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        organizations: prev.organizations.map(o => {
          if (o.organizationName !== orgName) return o
          const next = { ...o, ...patch }
          next.engagementScore = computeScore(next, prev.monthlyMeetingCount)
          return next
        }),
      }
    })
  }

  const setFlag = async (org: OrgHealth, field: 'renewal' | 'oneOnOne', value: boolean) => {
    updateRow(org.organizationName, {
      [`${field}Completed`]: value,
      [`${field}CompletedAt`]: value ? new Date().toISOString() : null,
    } as Partial<OrgHealth>)
    try {
      const res = await fetch('/api/v2/admin/org-compliance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationName: org.organizationName, year: parseInt(year), field, value }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
      fetchData()
    }
  }

  const orgs = data?.organizations ?? []
  // 2025 was the first tracked year. Show 2025 through the current year only.
  const years = Array.from({ length: Math.max(1, currentYear - 2024) }, (_, i) => String(2025 + i)).reverse()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Org Health</h2>
          <p className="text-sm text-muted-foreground">Engagement metrics for {year}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" render={<Link href="/admin/meetings" />}>Manage Meetings</Button>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32"><span>{year}</span></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DuesTargetStrip year={parseInt(year)} target={data?.duesTarget ?? null} onChange={fetchData} />
      <ScoreBreakdown />


      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {data && data.lowAttendanceMonthly.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-900">
                  {data.lowAttendanceMonthly.length} monthly meeting{data.lowAttendanceMonthly.length === 1 ? '' : 's'} below the {data.minAttendeesPerMeeting}-attendee minimum
                </p>
                <p className="text-amber-800 text-xs mt-0.5">
                  {data.lowAttendanceMonthly.map(m => `${m.title} (${m.attendeeCount} attended)`).join(', ')}
                </p>
              </div>
            </div>
          )}

          {orgs.length === 0 ? (
            <div className="text-center py-16 border rounded-lg">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No organizations found</h3>
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-center">Monthly Meetings (YTD)</TableHead>
                    <TableHead className="text-center">NAPAAM</TableHead>
                    <TableHead className="text-center">Renewal &amp; Cert</TableHead>
                    <TableHead className="text-center">Dues</TableHead>
                    <TableHead className="text-center">1×1 w/ NAPA</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map(org => (
                    <TableRow key={org.organizationName}>
                      <TableCell className="font-medium">
                        <Link href={`/org/${orgSlug(org.organizationName)}`} className="hover:underline hover:text-primary">
                          {org.organizationName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {org.monthlyMeetings > 0 ? `${org.monthlyAttended}/${org.monthlyMeetings}` : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {org.napaamAttendees}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={org.renewalCompleted}
                          onCheckedChange={(v) => setFlag(org, 'renewal', !!v)}
                          aria-label={`Renewal & certification for ${org.organizationName}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => setDuesOrg(org)}
                          className="hover:underline"
                        >
                          {org.duesPaid
                            ? <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
                            : org.duesPartial
                            ? <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Partial</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">Unpaid</Badge>
                          }
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={org.oneOnOneCompleted}
                          onCheckedChange={(v) => setFlag(org, 'oneOnOne', !!v)}
                          aria-label={`1×1 with NAPA for ${org.organizationName}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={org.engagementScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <DuesDialog
        org={duesOrg}
        year={parseInt(year)}
        platformTarget={data?.duesTarget ?? null}
        onClose={() => setDuesOrg(null)}
        onLocalUpdate={(patch) => {
          // Update the row in-place so the dialog reflects new payments without
          // refetching or closing.
          if (!duesOrg) return
          setData(prev => prev ? {
            ...prev,
            organizations: prev.organizations.map(o =>
              o.organizationName === duesOrg.organizationName ? { ...o, ...patch } : o
            ),
          } : prev)
          setDuesOrg(o => o ? { ...o, ...patch } : o)
        }}
      />
    </div>
  )
}

function DuesDialog({
  org,
  year,
  platformTarget,
  onClose,
  onLocalUpdate,
}: {
  org: OrgHealth | null
  year: number
  platformTarget: number | null
  onClose: () => void
  onLocalUpdate: (patch: Partial<OrgHealth>) => void
}) {
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (org) {
      setAmount('')
      setPaidAt(new Date().toISOString().slice(0, 10))
    }
  }, [org])

  if (!org) return null

  const target = org.duesTargetAmount ?? platformTarget ?? 0

  // Ensure the dues_records row exists (using the platform target) before
  // adding a payment, so the API has a parent id to attach to.
  const ensureDuesRecord = async (): Promise<string | null> => {
    if (org.duesRecordId) return org.duesRecordId
    const res = await fetch('/api/v2/admin/dues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationName: org.organizationName, year, amount: target }),
    })
    if (!res.ok) return null
    const created = await res.json()
    onLocalUpdate({ duesRecordId: created.id, duesTargetAmount: target })
    return created.id
  }

  const addPayment = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }
    setSaving(true)
    try {
      const recordId = await ensureDuesRecord()
      if (!recordId) throw new Error('Failed to set up dues record')
      const res = await fetch(`/api/v2/admin/dues/${recordId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, paidAt }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      const created = await res.json()
      // Local row update so dialog re-renders without closing/refetching.
      const newPayments = [
        ...org.duesPayments,
        { id: created.id, amount: amt, paidAt: created.paidAt ?? paidAt },
      ]
      const paid = newPayments.reduce((s, p) => s + p.amount, 0)
      onLocalUpdate({
        duesPayments: newPayments,
        duesPaidAmount: paid,
        duesPaid: target > 0 && paid >= target,
        duesPartial: paid > 0 && (target <= 0 || paid < target),
      })
      setAmount('')
      setPaidAt(new Date().toISOString().slice(0, 10))
      toast.success('Payment added')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const deletePayment = async (paymentId: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/dues/payments/${paymentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      const newPayments = org.duesPayments.filter(p => p.id !== paymentId)
      const paid = newPayments.reduce((s, p) => s + p.amount, 0)
      onLocalUpdate({
        duesPayments: newPayments,
        duesPaidAmount: paid,
        duesPaid: target > 0 && paid >= target,
        duesPartial: paid > 0 && (target <= 0 || paid < target),
      })
      toast.success('Payment removed')
    } catch {
      toast.error('Failed to remove payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!org} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dues - {org.organizationName} ({year})</DialogTitle>
          <DialogDescription>Track the target amount and individual payments.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Annual dues for {year}: <strong className="text-foreground tabular-nums">${target.toFixed(2)}</strong>
          </p>

          <div className="rounded-lg border">
            <div className="px-3 py-2 border-b flex items-center justify-between text-sm">
              <span className="font-medium">Payments</span>
              <span className="text-muted-foreground tabular-nums">
                ${org.duesPaidAmount.toFixed(2)} {org.duesTargetAmount != null && (
                  <>/ ${org.duesTargetAmount.toFixed(2)}</>
                )}
              </span>
            </div>
            <div className="divide-y">
              {org.duesPayments.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No payments yet.</div>
              ) : org.duesPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="tabular-nums">${p.amount.toFixed(2)}</span>
                  <span className="text-muted-foreground">{formatDateOnly(p.paidAt)}</span>
                  <Button variant="ghost" size="sm" onClick={() => deletePayment(p.id)} disabled={saving}>
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label htmlFor="dues-amount" className="text-xs">Amount</Label>
                <Input id="dues-amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1 flex-1">
                <Label htmlFor="dues-date" className="text-xs">Date paid</Label>
                <Input id="dues-date" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
              <Button onClick={addPayment} disabled={saving || !org.duesRecordId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DuesTargetStrip({
  year,
  target,
  onChange,
}: {
  year: number
  target: number | null
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(target ?? ''))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValue(String(target ?? '')) }, [target, year])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/v2/admin/dues-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, amount: parseFloat(value) || 0 }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Dues target saved')
      setEditing(false)
      onChange()
    } catch {
      toast.error('Failed to save dues target')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2 text-sm">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <span className="font-medium">Annual Dues for {year}:</span>{' '}
        {editing ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-7 w-32 inline-flex"
              autoFocus
            />
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving' : 'Save'}</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue(String(target ?? '')) }}>Cancel</Button>
          </span>
        ) : (
          <span className="tabular-nums">
            {target != null ? `$${target.toFixed(2)}` : <span className="text-muted-foreground">not set</span>}
            <Button size="sm" variant="ghost" className="ml-2 h-7" onClick={() => setEditing(true)}>Edit</Button>
          </span>
        )}
      </div>
    </div>
  )
}

function ScoreBreakdown() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        How is the score calculated?
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Engagement score breakdown</DialogTitle>
            <DialogDescription>
              5 dimensions, each worth up to 20 points. Unmeasured dimensions sit at 16 (baseline),
              so an org with no activity yet starts the year at 80, not 0.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Monthly meetings.</strong> Only past meetings count toward the score. For each:
              2+ org attendees = full credit, 1 = half, 0 = none. Average x 20.
            </li>
            <li>
              <strong>NAPAAM.</strong> Once the event date passes: 2+ attendees = 20, 1 = 10, 0 = 0.
              Baseline 16 until then.
            </li>
            <li>
              <strong>Renewal &amp; Certification.</strong> Complete = 20, otherwise 16 baseline.
            </li>
            <li>
              <strong>Dues.</strong> Fully paid = 20, partial = 10, baseline 16 when nothing recorded.
            </li>
            <li>
              <strong>1x1 with NAPA.</strong> Complete = 20, otherwise 16 baseline.
            </li>
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
