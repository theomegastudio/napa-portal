'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, SquarePen, Trash2, Search, MoreHorizontal, Users, UserPlus, Ban, ShieldCheck, Shield } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface User {
  id: string
  email: string
  name: string | null
  organizationName: string | null
  isAdmin: boolean
  isNapaAdmin: boolean
  approvalStatus: string
  banned: boolean | null
  banReason: string | null
  createdAt: string
}

interface Organization {
  id: string
  organizationName: string
  createdAt: string
}

interface ExtendedUser {
  id?: string
  role?: string
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const currentUser = session?.user as ExtendedUser | undefined

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteOrg, setInviteOrg] = useState('')
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ email: '', organizationName: '', isAdmin: false })
  const [isSaving, setIsSaving] = useState(false)

  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banningUser, setBanningUser] = useState<User | null>(null)
  const [banReason, setBanReason] = useState('')
  const [isBanning, setIsBanning] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = users
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (u.organizationName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    }
    if (selectedOrg !== 'all') filtered = filtered.filter(u => u.organizationName === selectedOrg)
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'banned') filtered = filtered.filter(u => u.banned)
      else filtered = filtered.filter(u => u.approvalStatus === selectedStatus && !u.banned)
    }
    setFilteredUsers(filtered)
  }, [searchQuery, selectedOrg, selectedStatus, users])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/v2/admin/users?includeOrgs=true')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.users)
      setFilteredUsers(data.users)
      setOrganizations(data.organizations)
    } catch (error) {
      toast.error('Failed to load user data')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail || !inviteOrg) { toast.error('Please enter an email and select an organization'); return }
    setIsInviting(true)
    try {
      const response = await fetch('/api/v2/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, organizationName: inviteOrg, isAdmin: inviteAsAdmin }),
      })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to invite user') }
      toast.success('Invitation sent successfully!')
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteOrg('')
      setInviteAsAdmin(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite user')
    } finally {
      setIsInviting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/v2/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editForm.email, organizationName: editForm.organizationName, isAdmin: editForm.isAdmin }),
      })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to update user') }
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u))
      toast.success('User updated successfully')
      setEditDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmBan = async () => {
    if (!banningUser) return
    setIsBanning(true)
    try {
      const response = await fetch(`/api/v2/admin/users/${banningUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', banReason: banReason || undefined }),
      })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to ban user') }
      setUsers(users.map(u => u.id === banningUser.id ? { ...u, banned: true, banReason: banReason || null } : u))
      toast.success(`${banningUser.email} has been banned`)
      setBanDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to ban user')
    } finally {
      setIsBanning(false)
    }
  }

  const handleUnban = async (user: User) => {
    try {
      const response = await fetch(`/api/v2/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unban' }),
      })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to unban user') }
      setUsers(users.map(u => u.id === user.id ? { ...u, banned: false, banReason: null } : u))
      toast.success(`${user.email} has been unbanned`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unban user')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingUser) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v2/admin/users/${deletingUser.id}`, { method: 'DELETE' })
      if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Failed to delete user') }
      setUsers(users.filter(u => u.id !== deletingUser.id))
      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (user: User) => {
    if (user.banned) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><Ban className="h-3 w-3 mr-1" />Banned</span>
    switch (user.approvalStatus) {
      case 'approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>
      case 'pending': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
      case 'rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>
      default: return null
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>All Users</CardTitle>
              <CardDescription>Showing {filteredUsers.length} of {users.length} users</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by email, name, or org..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-full md:w-64" />
              </div>
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Filter by organization" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => <SelectItem key={org.id} value={org.organizationName}>{org.organizationName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />Invite User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No users found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.banned ? 'opacity-60' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          {user.name && <p className="text-sm text-muted-foreground">{user.name}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.organizationName || <span className="italic">Not set</span>}</TableCell>
                      <TableCell>
                        {user.isNapaAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><ShieldCheck className="h-3 w-3 mr-1" />NAPA Admin</span>
                        ) : user.isAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"><Shield className="h-3 w-3 mr-1" />Admin</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Member</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {user.id !== currentUser?.id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingUser(user); setEditForm({ email: user.email, organizationName: user.organizationName || '', isAdmin: user.isAdmin }); setEditDialogOpen(true) }}>
                                <SquarePen className="h-4 w-4" />Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.banned ? (
                                <DropdownMenuItem onClick={() => handleUnban(user)}>
                                  <ShieldCheck className="h-4 w-4" />Unban User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => { setBanningUser(user); setBanReason(''); setBanDialogOpen(true) }} variant="destructive">
                                  <Ban className="h-4 w-4" />Ban User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => { setDeletingUser(user); setDeleteDialogOpen(true) }} variant="destructive">
                                <Trash2 className="h-4 w-4" />Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">(You)</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite User to Organization</DialogTitle>
            <DialogDescription>Send an invitation to join a specific organization. The user will be pre-approved.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-org">Organization</Label>
              <Select value={inviteOrg} onValueChange={setInviteOrg} required>
                <SelectTrigger id="invite-org"><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => <SelectItem key={org.id} value={org.organizationName}>{org.organizationName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="invite-admin" checked={inviteAsAdmin} onCheckedChange={(c) => setInviteAsAdmin(c as boolean)} />
              <Label htmlFor="invite-admin" className="text-sm cursor-pointer font-normal">Make Admin</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organization">Organization</Label>
              <Select value={editForm.organizationName} onValueChange={(v) => setEditForm({ ...editForm, organizationName: v })} disabled={isSaving}>
                <SelectTrigger id="edit-organization"><SelectValue placeholder="Select organization" /></SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => <SelectItem key={org.id} value={org.organizationName}>{org.organizationName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="edit-admin" checked={editForm.isAdmin} onCheckedChange={(c) => setEditForm({ ...editForm, isAdmin: c as boolean })} disabled={isSaving} />
              <Label htmlFor="edit-admin" className="cursor-pointer">Admin privileges</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>This user will be immediately logged out and unable to access the application.</DialogDescription>
          </DialogHeader>
          {banningUser && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">You are about to ban <strong>{banningUser.email}</strong>. All active sessions will be revoked immediately.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ban-reason">Reason (optional)</Label>
                <Textarea id="ban-reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter a reason for banning this user..." rows={3} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBanDialogOpen(false)} disabled={isBanning}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirmBan} disabled={isBanning}>
                  {isBanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ban User
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete this user? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800"><strong>{deletingUser.email}</strong> will be permanently removed.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete User
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
