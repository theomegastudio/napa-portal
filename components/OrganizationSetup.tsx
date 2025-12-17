'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Loader2 } from "lucide-react"
import { getOrganizations, updateUserOrganization } from "@/lib/services/organizations"
import { getCurrentUser } from "@/lib/services/auth"
import { toast } from "sonner"
import type { Organization } from "@/lib/types"

interface OrganizationSetupProps {
  onComplete: () => void
}

export default function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const data = await getOrganizations()
      setOrganizations(data)
    } catch (error) {
      toast.error("Failed to load organizations")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedOrg) {
      toast.error("Please select your organization")
      return
    }

    setIsSubmitting(true)

    try {
      const user = await getCurrentUser()
      if (!user) throw new Error("No user found")
      
      await updateUserOrganization(user.id, selectedOrg)
      toast.success("Profile completed successfully!")
      onComplete()
    } catch (error) {
      toast.error("Failed to update profile")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome to NAPA Resource Hub</DialogTitle>
          <DialogDescription className="text-center">
            Please select your organization to continue
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization *</Label>
              <Select value={selectedOrg} onValueChange={setSelectedOrg} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your organization" />
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
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}