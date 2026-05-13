'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFrame } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { AlertTriangle, Building2, Check, TrendingUp } from 'lucide-react'

interface OrgHealth {
  organizationName: string
  slug: string | null
  memberCount: number
  displayOrder: number
  monthlyMeetings: number
  monthlyAttended: number
  annualMeetings: number
  annualAttended: number
  renewalCompleted: boolean
  renewalCompletedAt: string | null
  oneOnOneCompleted: boolean
  oneOnOneCompletedAt: string | null
  duesPaid: boolean
  duesAmount: number | null
  duesPaidAt: string | null
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
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-100 text-green-800 border-green-200' :
    score >= 50 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
    'bg-red-100 text-red-800 border-red-200'
  return (
    <Badge variant="outline" className={`font-mono ${color}`}>
      {score}
    </Badge>
  )
}

export default function OrgHealthPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

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

  const setFlag = async (org: OrgHealth, field: 'renewal' | 'oneOnOne', value: boolean) => {
    // optimistic update
    setData(prev => prev ? {
      ...prev,
      organizations: prev.organizations.map(o => o.organizationName === org.organizationName
        ? { ...o, [`${field}Completed`]: value, [`${field}CompletedAt`]: value ? new Date().toISOString() : null }
        : o
      ),
    } : prev)
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
  const avgScore = orgs.length ? Math.round(orgs.reduce((s, o) => s + o.engagementScore, 0) / orgs.length) : 0
  const compliantCount = orgs.filter(o => o.renewalCompleted && o.duesPaid && o.oneOnOneCompleted).length

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Org Health</h2>
          <p className="text-sm text-muted-foreground">Engagement metrics for {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/admin/meetings" />}>Manage Meetings</Button>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgScore}<span className="text-sm text-muted-foreground">/100</span></div>
                <p className="text-xs text-muted-foreground mt-1">Across {orgs.length} organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fully Compliant</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{compliantCount}<span className="text-sm text-muted-foreground">/{orgs.length}</span></div>
                <p className="text-xs text-muted-foreground mt-1">Renewal · Dues · 1×1 with NAPA</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meetings This Year</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.monthlyMeetingCount ?? 0} <span className="text-sm text-muted-foreground">monthly</span></div>
                <p className="text-xs text-muted-foreground mt-1">{data?.annualMeetingCount ?? 0} annual</p>
              </CardContent>
            </Card>
          </div>

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
            <CardFrame className="w-full">
              <Table variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-center">Monthly</TableHead>
                    <TableHead className="text-center">Annual</TableHead>
                    <TableHead className="text-center">Renewal &amp; Cert</TableHead>
                    <TableHead className="text-center">Dues</TableHead>
                    <TableHead className="text-center">1×1 w/ NAPA</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map(org => (
                    <TableRow key={org.organizationName}>
                      <TableCell className="font-medium">{org.organizationName}</TableCell>
                      <TableCell className="text-center tabular-nums">{org.memberCount}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {org.monthlyMeetings > 0 ? `${org.monthlyAttended}/${org.monthlyMeetings}` : '—'}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {org.annualMeetings > 0 ? `${org.annualAttended}/${org.annualMeetings}` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={org.renewalCompleted}
                          onCheckedChange={(v) => setFlag(org, 'renewal', !!v)}
                          aria-label={`Renewal & certification for ${org.organizationName}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {org.duesPaid
                          ? <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Paid</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Unpaid</Badge>
                        }
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
            </CardFrame>
          )}
        </>
      )}
    </div>
  )
}
