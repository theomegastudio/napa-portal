'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { TrendingUp, Users, Check, X, Building2 } from 'lucide-react'

interface OrgHealth {
  organizationName: string
  slug: string | null
  memberCount: number
  meetingsAttended: number
  totalMeetings: number
  attendanceRate: number
  duesPaid: boolean
  duesAmount: number | null
  duesPaidAt: string | null
  engagementScore: number
}

interface HealthData {
  year: number
  organizations: OrgHealth[]
  totalMeetings: number
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

  useEffect(() => {
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

  const orgs = data?.organizations ?? []
  const avgScore = orgs.length ? Math.round(orgs.reduce((s, o) => s + o.engagementScore, 0) / orgs.length) : 0
  const paidCount = orgs.filter(o => o.duesPaid).length
  const avgAttendance = orgs.length ? Math.round(orgs.reduce((s, o) => s + o.attendanceRate, 0) / orgs.length) : 0

  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <CardTitle className="text-sm font-medium">Dues Paid</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paidCount}<span className="text-sm text-muted-foreground">/{orgs.length}</span></div>
                <p className="text-xs text-muted-foreground mt-1">{orgs.length ? Math.round((paidCount/orgs.length)*100) : 0}% of organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgAttendance}%</div>
                <p className="text-xs text-muted-foreground mt-1">{data?.totalMeetings ?? 0} meetings held</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organization Overview</CardTitle>
              <CardDescription>Engagement metrics for {year}</CardDescription>
            </CardHeader>
            <CardContent>
              {orgs.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No organizations found</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead className="text-center">Members</TableHead>
                        <TableHead className="text-center">Attendance</TableHead>
                        <TableHead className="text-center">Dues Paid</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgs
                        .sort((a, b) => b.engagementScore - a.engagementScore)
                        .map(org => (
                          <TableRow key={org.organizationName}>
                            <TableCell className="font-medium">{org.organizationName}</TableCell>
                            <TableCell className="text-center">{org.memberCount}</TableCell>
                            <TableCell className="text-center">
                              {org.totalMeetings > 0
                                ? `${org.meetingsAttended}/${org.totalMeetings} (${org.attendanceRate}%)`
                                : '—'
                              }
                            </TableCell>
                            <TableCell className="text-center">
                              {org.duesPaid
                                ? <Check className="h-4 w-4 text-green-600 mx-auto" />
                                : <X className="h-4 w-4 text-red-500 mx-auto" />
                              }
                            </TableCell>
                            <TableCell className="text-center">
                              <ScoreBadge score={org.engagementScore} />
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </>
  )
}
