'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, SquarePen, Trash2, Search, UserPlus, Shield, MoreHorizontal, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Member } from '@/lib/types'

interface OrganizationMembersClientProps {
  organizationName: string
  currentUserId: string
}

export default function OrganizationMembersClient({ organizationName, currentUserId }: OrganizationMembersClientProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Invite dialog state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteAsAdmin, setInviteAsAdmin] = useState(false)
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
      const response = await fetch('/api/v2/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          organizationName,
          isAdmin: inviteAsAdmin
        })
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
      const response = await fetch(`/api/v2/members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: editingMember.isAdmin })
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'} in {organizationName}
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search members by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full md:w-64"
                />
              </div>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">
                {searchTerm ? 'No members found' : 'No members yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search.' : 'Invite members to your organization.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
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
                        {member.isAdmin ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            Member
                          </span>
                        )}
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
                          <span className="text-xs text-muted-foreground">—</span>
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

            <div className="flex items-center space-x-2">
              <Checkbox
                id="invite-admin"
                checked={inviteAsAdmin}
                onCheckedChange={(checked) => setInviteAsAdmin(checked as boolean)}
              />
              <Label htmlFor="invite-admin" className="text-sm cursor-pointer font-normal">
                Make Admin
              </Label>
            </div>

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
