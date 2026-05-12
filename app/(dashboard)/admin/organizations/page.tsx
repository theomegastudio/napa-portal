'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Building2, MoreHorizontal, Plus, SquarePen, Trash } from 'lucide-react'

interface OrgRow {
  id: string
  organizationName: string
  slug: string | null
  logoUrl: string | null
  isActive: boolean
  createdAt: string
  memberCount: number
  resourceCount: number
}

interface FormState {
  organizationName: string
  slug: string
  logoUrl: string
  isActive: boolean
}

const emptyForm: FormState = { organizationName: '', slug: '', logoUrl: '', isActive: true }

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<OrgRow | null>(null)
  const [deleting, setDeleting] = useState<OrgRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/v2/admin/organizations')
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      setOrgs(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchOrgs() }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const openEdit = (org: OrgRow) => {
    setForm({
      organizationName: org.organizationName,
      slug: org.slug ?? '',
      logoUrl: org.logoUrl ?? '',
      isActive: org.isActive,
    })
    setEditing(org)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/v2/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: form.organizationName,
          slug: form.slug || undefined,
          logoUrl: form.logoUrl || undefined,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Organization created')
      setCreateOpen(false)
      fetchOrgs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create organization')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/organizations/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: form.organizationName,
          slug: form.slug || null,
          logoUrl: form.logoUrl || null,
          isActive: form.isActive,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Organization updated')
      setEditing(null)
      fetchOrgs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      const res = await fetch(`/api/v2/admin/organizations/${deleting.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(error)
      }
      toast.success('Organization deleted')
      setDeleting(null)
      fetchOrgs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete organization')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Organizations</h2>
          <p className="text-sm text-muted-foreground">Manage all NAPA member organizations.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button onClick={openCreate} />}>
            <Plus className="h-4 w-4" />
            Add Organization
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add Organization</DialogTitle>
                <DialogDescription>Create a new member organization.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">Organization name *</Label>
                  <Input
                    id="new-name"
                    value={form.organizationName}
                    onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-slug">Slug</Label>
                  <Input
                    id="new-slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="optional-slug"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-logo">Logo URL</Label>
                  <Input
                    id="new-logo"
                    value={form.logoUrl}
                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !form.organizationName.trim()}>
                  {saving ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No organizations yet</h3>
          <p className="text-sm text-muted-foreground">Click &ldquo;Add Organization&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.organizationName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{org.slug ?? '—'}</TableCell>
                  <TableCell className="text-right">{org.memberCount}</TableCell>
                  <TableCell className="text-right">{org.resourceCount}</TableCell>
                  <TableCell>
                    {org.isActive ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(org)}>
                          <SquarePen className="h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(org)}>
                          <Trash className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>Renaming will update all members and resources.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Organization name *</Label>
                <Input
                  id="edit-name"
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-logo">Logo URL</Label>
                <Input
                  id="edit-logo"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.organizationName.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.organizationName}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The organization must have no members and no resources.
            </DialogDescription>
          </DialogHeader>
          {deleting && (deleting.memberCount > 0 || deleting.resourceCount > 0) && (
            <p className="text-sm text-destructive">
              This organization has {deleting.memberCount} member(s) and {deleting.resourceCount} resource(s). Reassign or remove them first.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
