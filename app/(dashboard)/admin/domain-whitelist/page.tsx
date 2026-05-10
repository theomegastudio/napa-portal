'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Globe, Info, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface WhitelistedDomain {
  id: string
  organizationName: string
  domain: string
  createdAt: string
}

interface ExtendedUser {
  isAdmin?: boolean
  organizationName?: string
}

export default function DomainWhitelistPage() {
  const { data: session } = useSession()
  const [domains, setDomains] = useState<WhitelistedDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [domainToDelete, setDomainToDelete] = useState<WhitelistedDomain | null>(null)
  const [deleting, setDeleting] = useState(false)

  const user = session?.user as ExtendedUser | undefined

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/v2/admin/domain-whitelist')
      if (!response.ok) throw new Error('Failed to fetch')
      setDomains(await response.json())
    } catch (error) {
      toast.error('Failed to load whitelisted domains')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async () => {
    if (!newDomain.trim()) { toast.error('Please enter a domain'); return }
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/
    const cleanDomain = newDomain.trim().toLowerCase().replace(/^@/, '')
    if (!domainPattern.test(cleanDomain)) { toast.error('Please enter a valid domain (e.g., napahq.org)'); return }

    setAdding(true)
    try {
      const response = await fetch('/api/v2/admin/domain-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: cleanDomain }),
      })
      const responseData = await response.json()
      if (!response.ok) { throw new Error(responseData.error || 'Failed to add domain') }
      setDomains(prev => [...prev, responseData])
      toast.success(`Domain "${cleanDomain}" added to whitelist`)
      setAddDialogOpen(false)
      setNewDomain('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add domain')
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteDomain = async () => {
    if (!domainToDelete) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/v2/admin/domain-whitelist/${domainToDelete.id}`, { method: 'DELETE' })
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to delete domain') }
      setDomains(prev => prev.filter(d => d.id !== domainToDelete.id))
      toast.success(`Domain "${domainToDelete.domain}" removed from whitelist`)
      setDeleteDialogOpen(false)
      setDomainToDelete(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete domain')
    } finally {
      setDeleting(false)
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
      <div className="mb-6 p-4 rounded-lg border bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How domain whitelisting works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Users signing up with whitelisted email domains are automatically approved</li>
              <li>Only add domains you trust and control (e.g., your organization&apos;s domain)</li>
              <li>Example: Adding &quot;napahq.org&quot; will auto-approve anyone@napahq.org</li>
            </ul>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Whitelisted Domains</CardTitle>
              <CardDescription>
                {domains.length} {domains.length === 1 ? 'domain' : 'domains'} for {user?.organizationName}
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Domain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No whitelisted domains</h3>
              <p className="text-sm text-muted-foreground mb-4">Add email domains to automatically approve new users.</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add First Domain
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono">{domain.domain}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(domain.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setDomainToDelete(domain); setDeleteDialogOpen(true) }} variant="destructive">
                              <Trash2 className="h-4 w-4" />Remove Domain
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
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Whitelisted Domain</DialogTitle>
            <DialogDescription>Users with this email domain will be automatically approved when they sign up.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-medium">Email Domain</label>
            <Input placeholder="napahq.org" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()} />
            <p className="text-xs text-muted-foreground">Enter the domain without the @ symbol</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDomain} disabled={adding}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Domain</DialogTitle>
            <DialogDescription>Are you sure you want to remove this domain from the whitelist?</DialogDescription>
          </DialogHeader>
          {domainToDelete && (
            <div className="py-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-mono">{domainToDelete.domain}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">New users with this email domain will need manual approval after removal.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteDomain} disabled={deleting} variant="destructive">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Remove Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
