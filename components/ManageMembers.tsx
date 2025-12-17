'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Loader2, Shield } from "lucide-react"
import { inviteUser, getOrgMembers } from "@/lib/services/members"
import { toast } from "sonner"
import type { Member } from "@/lib/types"

interface ManageMembersProps {
  organizationName: string
}

export default function ManageMembers({ organizationName }: ManageMembersProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (open) {
      fetchMembers()
    }
  }, [open])

  const fetchMembers = async () => {
    setIsLoading(true)
    try {
      const data = await getOrgMembers(organizationName)
      setMembers(data)
    } catch (error) {
      toast.error("Failed to load members")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email?.toLowerCase() === email.toLowerCase())
    if (existingMember) {
      toast.error("This email is already a member of your organization")
      return
    }

    setIsInviting(true)
    try {
      await inviteUser(email, organizationName, isAdmin)
      toast.success("Invitation sent! They'll receive a magic link via email.")
      setEmail("")
      setIsAdmin(false)
      fetchMembers()
    } catch (error) {
      toast.error("Failed to invite member")
      console.error(error)
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" />
          Manage Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Organization Members</DialogTitle>
          <DialogDescription>
            Invite new members to your organization
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleInvite} className="space-y-4 border-b pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin"
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
              />
              <Label htmlFor="admin" className="cursor-pointer">
                Make admin
              </Label>
            </div>
          </div>
          <Button type="submit" disabled={isInviting}>
            {isInviting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Invite Member
          </Button>
        </form>

        <div className="space-y-2">
          <h4 className="font-semibold">Current Members</h4>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{member.email}</p>
                  </div>
                  {member.is_admin && (
                    <Badge variant="secondary">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}