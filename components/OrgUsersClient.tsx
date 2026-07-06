'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, SquarePen, Trash2, Search, UserPlus, Shield, MoreHorizontal, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TablePagination } from '@/components/ui/table-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Member } from '@/lib/types'
import { NAPA_ORG_NAME } from '@/lib/constants'

interface OrgUsersClientProps {
  organizationName: string
  currentUserId: string
}

type NapaRole = 'user' | 'admin' | 'napaBoard' | 'napaDirector'
const NAPA_ROLES: readonly NapaRole[] = ['user', 'admin', 'napaBoard', 'napaDirector']

const ROLE_LABELS: Record<NapaRole, string> = {
  user: 'User',
  admin: 'Admin',
  napaBoard: 'NAPA Board',
  napaDirector: 'NAPA Director',
}

/** Pick the dropdown value that should be selected for a given member. */
function roleSelectValue(role: string | null | undefined, isAdmin: boolean): NapaRole {
  if (role && (NAPA_ROLES as readonly string[]).includes(role)) return role as NapaRole
  return isAdmin ? 'admin' : 'user'
}

/** Labels/colors for the read-only role pill in the members table. */
const ROLE_BADGE_LABELS: Record<NapaRole, string> = {
  user: 'Member',
  admin: 'Admin',
  napaBoard: 'NAPA Board',
  napaDirector: 'NAPA Director',
}

const ROLE_BADGE_STYLES: Record<NapaRole, string> = {
  user: 'bg-muted text-muted-foreground',
  admin: 'bg-sky-100 text-sky-800',
  napaBoard: 'bg-primary/10 text-primary',
  napaDirector: 'bg-purple-100 text-purple-800',
}

/**
 * Read-only role pill for a member row. Resolves the effective role via
 * {@link roleSelectValue} (so it always matches the edit dialog's dropdown) and
 * renders it with the shared color scheme: Board = gold/primary, Director =
 * purple, Admin = sky, User/Member = muted. Elevated roles get a shield icon.
 */
function RoleBadge({ role, isAdmin }: { role?: string | null; isAdmin: boolean }) {
  const key = roleSelectValue(role, isAdmin)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_STYLES[key]}`}>
      {key !== 'user' && <Shield className="h-3 w-3 mr-1" />}
      {ROLE_BADGE_LABELS[key]}
    </span>
  )
}

/**
 * Read-only approval-status pill for a member row. `banned` wins over
 * `status`; otherwise maps approvalStatus → color (Approved green, Pending
 * yellow, Rejected red), falling back to a muted pill for unknown values.
 */
function StatusBadge({ status, banned }: { status?: string | null; banned?: boolean }) {
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  if (banned) return <span className={`${base} bg-red-100 text-red-800`}>Banned</span>
  switch (status) {
    case 'approved': return <span className={`${base} bg-green-100 text-green-800`}>Approved</span>
    case 'pending': return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>
    case 'rejected': return <span className={`${base} bg-red-100 text-red-700`}>Rejected</span>
    default: return <span className={`${base} bg-muted text-muted-foreground`}>{status ?? 'Unknown'}</span>
  }
}

export default function OrgUsersClient({ organizationName, currentUserId }: OrgUsersClientProps) {
  const isNapaOrg = organizationName === NAPA_ORG_NAME
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10
  const [searchTerm, setSearchTerm] = useState('')

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false)
  const [inviteRole, setInviteRole] = useState<'user' | 'admin' | 'napaBoard' | 'napaDirector'>('user')
  const [isInviting, setIsInviting] = useState(false)

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingMember, setDeletingMember] = useState<Member | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredMembers(
        members.filter(member =>
          member.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    } else {
      setFilteredMembers(members)
    }
    setPage(0)
  }, [searchTerm, members])

  const fetchMembers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v2/members?organization=${encodeURIComponent(organizationName)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      const data = await response.json()
      setMembers(data)
      setFilteredMembers(data)
    } catch (error) {
      toast.error('Failed to load members')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email?.toLowerCase() === inviteEmail.toLowerCase())
    if (existingMember) {
      toast.error('This email is already a member of your organization')
      return
    }

    setIsInviting(true)
    try {
      const payload: Record<string, unknown> = {
        email: inviteEmail,
        organizationName,
        isAdmin: isNapaOrg ? (inviteRole === 'admin') : inviteAsAdmin,
      }
      if (isNapaOrg && (inviteRole === 'napaBoard' || inviteRole === 'napaDirector')) {
        payload.role = inviteRole
      }
      const response = await fetch('/api/v2/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite member')
      }
      toast.success('Invitation sent! They\'ll receive an email to get started.')
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteAsAdmin(false)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite member')
      console.error(error)
    } finally {
      setIsInviting(false)
    }
  }

  const handleEditClick = (member: Member) => {
    setEditingMember(member)
    setEditDialogOpen(true)
  }

  const handleUpdateMember = async () => {
    if (!editingMember) return

    setIsUpdating(true)
    try {
      const payload: Record<string, unknown> = { isAdmin: editingMember.isAdmin }
      if (isNapaOrg && editingMember.role && (NAPA_ROLES as readonly string[]).includes(editingMember.role)) {
        payload.role = editingMember.role
      }
      const response = await fetch(`/api/v2/members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update member')
      }

      toast.success('Member updated successfully')
      setEditDialogOpen(false)
      setEditingMember(null)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update member')
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteClick = (member: Member) => {
    setDeletingMember(member)
    setDeleteDialogOpen(true)
  }

  const handleDeleteMember = async () => {
    if (!deletingMember) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/v2/members/${deletingMember.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove member')
      }

      toast.success('Member removed successfully')
      setDeleteDialogOpen(false)
      setDeletingMember(null)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Org Users</h2>
          <p className="text-sm text-muted-foreground">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'user' : 'users'} in {organizationName}
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">
            {searchTerm ? 'No users found' : 'No users yet'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'Try adjusting your search.' : 'Invite users to your organization.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.email}</span>
                          {member.id === currentUserId && (
                            <span className="text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={member.role} isAdmin={member.isAdmin} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={member.approvalStatus} banned={member.banned} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.id !== currentUserId ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(member)}>
                                <SquarePen className="h-4 w-4" />
                                Edit Member
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(member)}
                                variant="destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          
            <TablePagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filteredMembers.length}
              onPageChange={setPage}
            />
          
        </div>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite New Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {organizationName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                className="border-gray-300"
                required
              />
            </div>

            {isNapaOrg ? (
              <div className="space-y-1.5">
                <Label htmlFor="invite-role" className="text-sm font-medium">NAPA Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as NapaRole)}>
                  <SelectTrigger id="invite-role" className="border-gray-300">
                    <span>{ROLE_LABELS[inviteRole]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="napaDirector">NAPA Director</SelectItem>
                    <SelectItem value="napaBoard">NAPA Board</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="invite-admin"
                  checked={inviteAsAdmin}
                  onCheckedChange={(checked) => setInviteAsAdmin(checked as boolean)}
                  className="border-gray-300"
                />
                <Label htmlFor="invite-admin" className="text-sm cursor-pointer font-normal">
                  Make Admin
                </Label>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member role and permissions
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingMember.email || ''} disabled className="bg-gray-50" />
              </div>

              {isNapaOrg ? (
                <div className="space-y-1.5">
                  <Label htmlFor="edit-role">NAPA Role</Label>
                  <Select
                    value={roleSelectValue(editingMember.role, editingMember.isAdmin)}
                    onValueChange={(v) => {
                      const role = v as NapaRole
                      setEditingMember({
                        ...editingMember,
                        role,
                        isAdmin: role === 'admin' ? true : editingMember.isAdmin,
                      })
                    }}
                  >
                    <SelectTrigger id="edit-role">
                      <span>{ROLE_LABELS[roleSelectValue(editingMember.role, editingMember.isAdmin)]}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="napaDirector">NAPA Director</SelectItem>
                      <SelectItem value="napaBoard">NAPA Board</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-admin"
                    checked={editingMember.isAdmin}
                    onCheckedChange={(checked) =>
                      setEditingMember({ ...editingMember, isAdmin: checked as boolean })
                    }
                  />
                  <Label htmlFor="edit-admin" className="text-sm cursor-pointer font-normal">
                    Organization Admin
                  </Label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateMember} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member from your organization?
            </DialogDescription>
          </DialogHeader>
          {deletingMember && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>{deletingMember.email}</strong> will lose access to all organization resources.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteMember}
                  disabled={isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Remove Member
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
