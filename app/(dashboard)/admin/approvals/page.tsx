'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Check, X, Search, UserPlus, Building2, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface PendingUser {
  id: string
  email: string
  name: string | null
  organizationName: string | null
  createdAt: string
  isFirstUserInOrg: boolean
}

export default function AdminApprovalsPage() {
  const { data: session } = useSession()

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [userToApprove, setUserToApprove] = useState<PendingUser | null>(null)
  const [makeOrgAdmin, setMakeOrgAdmin] = useState(false)
  const [approving, setApproving] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [userToReject, setUserToReject] = useState<PendingUser | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(pendingUsers.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.name?.toLowerCase().includes(query) ||
        u.organizationName?.toLowerCase().includes(query)
      ))
    } else {
      setFilteredUsers(pendingUsers)
    }
    setPage(0)
  }, [searchQuery, pendingUsers])

  const fetchPendingUsers = async () => {
    try {
      const response = await fetch('/api/v2/admin/approvals')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setPendingUsers(data)
      setFilteredUsers(data)
    } catch (error) {
      toast.error('Failed to load pending approvals')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!userToApprove) return
    setApproving(true)
    try {
      const response = await fetch(`/api/v2/admin/approvals/${userToApprove.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ makeOrgAdmin }),
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to approve') }
      toast.success(`${userToApprove.email} has been approved`)
      setPendingUsers(prev => prev.filter(u => u.id !== userToApprove.id))
      setApproveDialogOpen(false)
      setUserToApprove(null)
      setMakeOrgAdmin(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve user')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!userToReject) return
    setRejecting(true)
    try {
      const response = await fetch(`/api/v2/admin/approvals/${userToReject.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason || null }),
      })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to reject') }
      toast.success(`${userToReject.email} has been rejected`)
      setPendingUsers(prev => prev.filter(u => u.id !== userToReject.id))
      setRejectDialogOpen(false)
      setUserToReject(null)
      setRejectionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject user')
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pending Requests</h2>
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} awaiting approval
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 border rounded-lg">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">No pending approvals</h3>
            <p className="text-sm text-muted-foreground">All user registration requests have been processed.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.name && <p className="text-sm text-muted-foreground">{user.name}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{user.organizationName || 'No organization'}</span>
                          {user.isFirstUserInOrg && <Badge variant="outline" className="text-xs">First user</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setUserToApprove(user); setMakeOrgAdmin(user.isFirstUserInOrg); setApproveDialogOpen(true) }}>
                              <Check className="h-4 w-4 text-green-600" />Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setUserToReject(user); setRejectionReason(''); setRejectDialogOpen(true) }} variant="destructive">
                              <X className="h-4 w-4" />Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={filteredUsers.length}
                onPageChange={setPage}
              />
            
          </div>
        )}
      </div>

      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve User</DialogTitle>
            <DialogDescription>Are you sure you want to approve this user?</DialogDescription>
          </DialogHeader>
          {userToApprove && (
            <div className="py-4">
              <div className="rounded-lg border bg-muted/50 p-4 mb-4">
                <p><strong>Email:</strong> {userToApprove.email}</p>
                {userToApprove.name && <p><strong>Name:</strong> {userToApprove.name}</p>}
                <p><strong>Organization:</strong> {userToApprove.organizationName || 'None'}</p>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-primary/5 border-primary/20">
                <Checkbox id="makeOrgAdmin" checked={makeOrgAdmin} onCheckedChange={(c) => setMakeOrgAdmin(c as boolean)} />
                <label htmlFor="makeOrgAdmin" className="text-sm font-medium leading-none cursor-pointer">
                  Make this user an organization admin
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700">
              {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>Are you sure you want to reject this user&apos;s registration?</DialogDescription>
          </DialogHeader>
          {userToReject && (
            <div className="py-4">
              <div className="rounded-lg border bg-muted/50 p-4 mb-4">
                <p><strong>Email:</strong> {userToReject.email}</p>
                {userToReject.name && <p><strong>Name:</strong> {userToReject.name}</p>}
                <p><strong>Organization:</strong> {userToReject.organizationName || 'None'}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for rejection (optional)</label>
                <Input placeholder="Enter reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                <p className="text-xs text-muted-foreground">This will be shared with the user in their rejection notification.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} disabled={rejecting} variant="destructive">
              {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
