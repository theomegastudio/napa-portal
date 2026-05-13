'use client'

import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CardFrame } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Download, FileText, Activity, TrendingUp, UserCheck } from "lucide-react"

interface AuditLog {
  id: string
  createdAt: string
  userId: string
  userEmail: string
  organization: string
  action: string
  resourceId: string | null
  resourceTitle: string | null
  resourceType: string | null
  metadata: Record<string, unknown>
}

interface ExtendedUser {
  isAdmin?: boolean
  role?: string
  organizationName?: string
}

export default function AuditLogPage() {
  const { data: session } = useSession()
  const user = session?.user as ExtendedUser | undefined

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)

  const [action, setAction] = useState("all")
  const [organization, setOrganization] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(0)

  const isNapaUser = (user?.role === 'napaBoard' || user?.role === 'napaDirector')
  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    fetchLogs()
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, organization, startDate, endDate, page])

  const buildQueryParams = () => {
    const params = new URLSearchParams()
    params.set('limit', ITEMS_PER_PAGE.toString())
    params.set('offset', (page * ITEMS_PER_PAGE).toString())
    if (action !== "all") params.set('action', action)
    if (startDate) params.set('startDate', new Date(startDate).toISOString())
    if (endDate) params.set('endDate', new Date(endDate).toISOString())
    if (organization !== "all") params.set('organization', organization)
    return params
  }

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/v2/admin/audit?${buildQueryParams()}`)
      if (!response.ok) throw new Error('Failed to fetch audit logs')
      const result = await response.json()
      setLogs(result.logs)
      setTotal(result.total)
    } catch (error) {
      toast.error("Failed to load audit logs")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ stats: 'true' })
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) params.set('endDate', new Date(endDate).toISOString())
      if (organization !== "all") params.set('organization', organization)
      const response = await fetch(`/api/v2/admin/audit?${params}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      setStats(await response.json())
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleExport = async () => {
    try {
      const params = buildQueryParams()
      params.set('export', 'csv')
      const response = await fetch(`/api/v2/admin/audit?${params}`)
      if (!response.ok) throw new Error('Failed to export')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString()}.csv`
      a.click()
      toast.success("Audit logs exported successfully")
    } catch (error) {
      toast.error("Failed to export audit logs")
      console.error(error)
    }
  }

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      created: 'bg-green-600 text-white',
      updated: 'bg-blue-600 text-white',
      deleted: 'bg-red-600 text-white',
      downloaded: 'bg-purple-600 text-white',
      viewed: 'bg-gray-600 text-white',
      signup: 'bg-emerald-600 text-white',
      invited: 'bg-indigo-600 text-white',
      approved: 'bg-teal-600 text-white',
      rejected: 'bg-orange-600 text-white',
      banned: 'bg-rose-600 text-white',
      unbanned: 'bg-amber-600 text-white',
    }
    return colors[action] ?? 'bg-gray-600 text-white'
  }

  const actionCounts = (stats?.actionCounts ?? {}) as Record<string, number>
  const orgCounts = (stats?.orgCounts ?? {}) as Record<string, number>
  const userEventsCount =
    (actionCounts.signup ?? 0) +
    (actionCounts.invited ?? 0) +
    (actionCounts.approved ?? 0) +
    (actionCounts.rejected ?? 0) +
    (actionCounts.banned ?? 0) +
    (actionCounts.unbanned ?? 0)

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Showing {logs.length} of {total} total entries</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Select value={action} onValueChange={(val) => { setAction(val); setPage(0) }}>
          <SelectTrigger>
            <span>{action === 'all' ? 'All Actions' : action.charAt(0).toUpperCase() + action.slice(1)}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="downloaded">Downloaded</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="signup">Signup</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
            <SelectItem value="unbanned">Unbanned</SelectItem>
          </SelectContent>
        </Select>

        {isNapaUser && (
          <Select value={organization} onValueChange={(val) => { setOrganization(val); setPage(0) }}>
            <SelectTrigger>
              <span>{organization === 'all' ? 'All Organizations' : organization}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {Object.keys(orgCounts).map(org => (
                <SelectItem key={org} value={org}>{org}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0) }} />
        <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0) }} />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No audit logs found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <CardFrame className="w-full">
            <Table variant="card">
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  {isNapaUser && <TableHead>Organization</TableHead>}
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{log.userEmail}</TableCell>
                    {isNapaUser && <TableCell className="text-sm">{log.organization}</TableCell>}
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.resourceTitle || 'N/A'}</TableCell>
                    <TableCell className="text-sm">
                      {log.resourceType === 'user' ? (
                        <Badge variant="outline" className="text-indigo-600 border-indigo-300">User</Badge>
                      ) : (
                        log.resourceType || 'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardFrame>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
