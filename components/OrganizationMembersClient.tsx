'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, SquarePen, Trash2, Search, UserPlus, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { getOrgMembers, inviteUser } from '@/lib/services/members'
import { createClient } from '@/lib/supabase/client'
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
      const data = await getOrgMembers(organizationName)
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
      await inviteUser(inviteEmail, organizationName, inviteAsAdmin)
      toast.success('Invitation sent! They\'ll receive a magic link via email.')
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteAsAdmin(false)
      fetchMembers()
    } catch (error) {
      toast.error('Failed to invite member')
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
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .update({ is_admin: editingMember.is_admin })
        .eq('id', editingMember.id)

      if (error) throw error

      toast.success('Member updated successfully')
      setEditDialogOpen(false)
      setEditingMember(null)
      fetchMembers()
    } catch (error) {
      toast.error('Failed to update member')
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
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', deletingMember.id)

      if (error) throw error

      toast.success('Member removed successfully')
      setDeleteDialogOpen(false)
      setDeletingMember(null)
      fetchMembers()
    } catch (error) {
      toast.error('Failed to remove member')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search members by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg border">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'No members found matching your search' : 'No members in your organization yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{member.email}</span>
                        {member.id === currentUserId && (
                          <span className="text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {member.is_admin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Member
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(member)}
                          className="hover:bg-gray-200"
                          disabled={member.id === currentUserId}
                        >
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(member)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                          disabled={member.id === currentUserId}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  checked={editingMember.is_admin}
                  onCheckedChange={(checked) =>
                    setEditingMember({ ...editingMember, is_admin: checked as boolean })
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
