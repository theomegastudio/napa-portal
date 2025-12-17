'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllUsers, getCurrentUser, isNapaAdmin, updateUser, deleteUser } from '@/lib/services/auth'
import { getOrganizations } from '@/lib/services/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Loader2, SquarePen, Trash2, Search, ArrowLeft } from 'lucide-react'
import type { User, Organization } from '@/lib/types'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string>('all')

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ email: '', organization_name: '', is_admin: false })
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push('/login')
          return
        }

        const isAdmin = await isNapaAdmin(currentUser.id)
        if (!isAdmin) {
          toast.error('You do not have permission to access this page')
          router.push('/')
          return
        }

        setIsAuthorized(true)

        const [usersData, orgsData] = await Promise.all([
          getAllUsers(),
          getOrganizations()
        ])

        setUsers(usersData)
        setFilteredUsers(usersData)
        setOrganizations(orgsData)
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load user data')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  // Filter users based on search and organization
  useEffect(() => {
    let filtered = users

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
    }

    // Filter by organization
    if (selectedOrg !== 'all') {
      filtered = filtered.filter(user => user.organization_name === selectedOrg)
    }

    setFilteredUsers(filtered)
  }, [searchQuery, selectedOrg, users])

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditForm({
      email: user.email,
      organization_name: user.organization_name || '',
      is_admin: user.is_admin
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return

    setIsSaving(true)
    try {
      await updateUser(editingUser.id, {
        email: editForm.email,
        organization_name: editForm.organization_name,
        is_admin: editForm.is_admin
      })

      // Update local state
      setUsers(users.map(u =>
        u.id === editingUser.id
          ? { ...u, email: editForm.email, organization_name: editForm.organization_name, is_admin: editForm.is_admin }
          : u
      ))

      toast.success('User updated successfully')
      setEditDialogOpen(false)
    } catch (error) {
      console.error('Failed to update user:', error)
      toast.error('Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingUser) return

    setIsDeleting(true)
    try {
      await deleteUser(deletingUser.id)

      // Update local state
      setUsers(users.filter(u => u.id !== deletingUser.id))

      toast.success('User deleted successfully')
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast.error('Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">User Management</CardTitle>
          <CardDescription>
            Manage all users across organizations (NAPA Admin Only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email or organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.organization_name}>
                      {org.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* User count */}
          <div className="mb-4 text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>

          {/* Users table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.organization_name || 'Not set'}</TableCell>
                      <TableCell>
                        {user.is_admin ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            User
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(user)}
                            className="hover:bg-gray-200"
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-organization">Organization</Label>
              <Select
                value={editForm.organization_name}
                onValueChange={(value) => setEditForm({ ...editForm, organization_name: value })}
                disabled={isSaving}
              >
                <SelectTrigger id="edit-organization">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.organization_name}>
                      {org.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-admin"
                checked={editForm.is_admin}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_admin: checked as boolean })}
                disabled={isSaving}
              />
              <Label htmlFor="edit-admin" className="cursor-pointer">
                Admin privileges
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="py-4">
              <p className="text-sm">
                <strong>Email:</strong> {deletingUser.email}
              </p>
              <p className="text-sm">
                <strong>Organization:</strong> {deletingUser.organization_name || 'Not set'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
