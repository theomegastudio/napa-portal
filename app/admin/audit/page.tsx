'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAuditLogs, getAuditLogStats, exportAuditLogsToCSV, type AuditLog } from "@/lib/services/audit"
import { getUserProfile, isNapaAdmin } from "@/lib/services/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { ArrowLeft, Download, FileText, Activity, Users, TrendingUp } from "lucide-react"

export default function AuditLogPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
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
  const [isNapaUser, setIsNapaUser] = useState(false)

  const ITEMS_PER_PAGE = 50

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchLogs()
      fetchStats()
    }
  }, [user, action, organization, startDate, endDate, page])

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const profile = await getUserProfile(authUser.id)
      const adminStatus = await isNapaAdmin(authUser.id)

      if (!profile.is_admin) {
        toast.error("Access denied: Admin privileges required")
        router.push('/')
        return
      }

      setUser(profile)
      setIsNapaUser(adminStatus)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    } finally {
      setAuthLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const params: any = {
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE
      }

      if (action !== "all") params.action = action
      if (startDate) params.startDate = new Date(startDate).toISOString()
      if (endDate) params.endDate = new Date(endDate).toISOString()

      // If user is not NAPA admin, filter by their organization
      if (!isNapaUser && user?.organization_name) {
        params.organization = user.organization_name
      } else if (organization !== "all") {
        params.organization = organization
      }

      const result = await getAuditLogs(params)
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
      const params: any = {}
      if (startDate) params.startDate = new Date(startDate).toISOString()
      if (endDate) params.endDate = new Date(endDate).toISOString()

      if (!isNapaUser && user?.organization_name) {
        params.organization = user.organization_name
      } else if (organization !== "all") {
        params.organization = organization
      }

      const result = await getAuditLogStats(params)
      setStats(result)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleExport = async () => {
    try {
      const params: any = {}
      if (action !== "all") params.action = action
      if (startDate) params.startDate = new Date(startDate).toISOString()
      if (endDate) params.endDate = new Date(endDate).toISOString()

      if (!isNapaUser && user?.organization_name) {
        params.organization = user.organization_name
      } else if (organization !== "all") {
        params.organization = organization
      }

      const csvContent = await exportAuditLogsToCSV(params)
      const blob = new Blob([csvContent], { type: 'text/csv' })
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-12 w-64" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Audit Logs</h1>
                <p className="text-sm text-muted-foreground">
                  {isNapaUser ? 'System-wide activity log' : `Activity log for ${user.organization_name}`}
                </p>
              </div>
            </div>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
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
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">{log.user_email}</TableCell>
                          {isNapaUser && <TableCell className="text-sm">{log.organization}</TableCell>}
                          <TableCell>
                            <Badge className={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.resource_title || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{log.resource_type || 'N/A'}</TableCell>
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
      </main>
    </div>
  )
}
