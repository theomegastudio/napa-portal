'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Download, FileText, Activity, Users, TrendingUp } from "lucide-react"
import AdminLayout from "@/components/AdminLayout"

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
  metadata: Record<string, any>
}

export default function AuditLogPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  // Filters
  const [action, setAction] = useState("all")
  const [organization, setOrganization] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(0)

  const isNapaUser = session?.user?.isNapaAdmin || false
  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    if (!session.user.isAdmin) {
      toast.error("Access denied: Admin privileges required")
      router.push('/')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchLogs()
      fetchStats()
    }
  }, [session, status, action, organization, startDate, endDate, page])

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
      const params = buildQueryParams()
      const response = await fetch(`/api/v2/admin/audit?${params}`)
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
      const params = new URLSearchParams()
      params.set('stats', 'true')
      if (startDate) params.set('startDate', new Date(startDate).toISOString())
      if (endDate) params.set('endDate', new Date(endDate).toISOString())
      if (organization !== "all") params.set('organization', organization)

      const response = await fetch(`/api/v2/admin/audit?${params}`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      const result = await response.json()
      setStats(result)
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
    switch (action) {
      case 'created':
        return 'bg-green-600 text-white'
      case 'updated':
        return 'bg-blue-600 text-white'
      case 'deleted':
        return 'bg-red-600 text-white'
      case 'downloaded':
        return 'bg-purple-600 text-white'
      case 'viewed':
        return 'bg-gray-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-64" />
      </div>
    )
  }

  if (!session?.user?.isAdmin) {
    return null
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <AdminLayout
      title="Audit Logs"
      description={isNapaUser ? 'System-wide activity log' : `Activity log for ${session.user.organizationName}`}
    >
        {/* Export Button */}
        <div className="flex justify-end mb-6">
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalActions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <FileText className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actionCounts.created || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updated</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actionCounts.updated || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deleted</CardTitle>
                <Users className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.actionCounts.deleted || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter audit logs by action, date range, and organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Action</label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="downloaded">Downloaded</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isNapaUser && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Organization</label>
                  <Select value={organization} onValueChange={setOrganization}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {stats && Object.keys(stats.orgCounts).map(org => (
                        <SelectItem key={org} value={org}>{org}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>
              Showing {logs.length} of {total} total entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
                <p className="text-muted-foreground">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        {isNapaUser && <TableHead>Organization</TableHead>}
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
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
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.resourceTitle || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{log.resourceType || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
    </AdminLayout>
  )
}
