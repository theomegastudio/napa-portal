'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Loader2, Shield } from "lucide-react"
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
      const response = await fetch(`/api/v2/members?organization=${encodeURIComponent(organizationName)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      const data = await response.json()
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
      const response = await fetch('/api/v2/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          organizationName,
          isAdmin
        })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to invite member')
      }
      toast.success("Invitation sent! They'll receive an email to get started.")
      setEmail("")
      setIsAdmin(false)
      fetchMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite member")
      console.error(error)
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Users className="mr-2 h-4 w-4" />
        Org Users
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">Manage Organization Members</DialogTitle>
          <DialogDescription className="text-sm">
            Invite new members to your organization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleInvite} className="space-y-4 border-b pb-6 mt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@napahq.org"
                className="h-10 border-gray-300"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin"
                checked={isAdmin}
                onCheckedChange={(checked) => setIsAdmin(checked as boolean)}
              />
              <Label htmlFor="admin" className="text-sm cursor-pointer font-normal">
                Make Admin
              </Label>
            </div>
          </div>
          <Button type="submit" disabled={isInviting} variant="outline" className="h-10">
            {isInviting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            Invite Member
          </Button>
        </form>

        <div className="space-y-3 pt-2">
          <h4 className="font-semibold text-sm">Current Members</h4>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No members found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <p className="text-sm font-medium truncate mr-2 min-w-0">{member.email}</p>
                  {member.isAdmin && (
                    <Badge variant="secondary" className="text-xs">
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