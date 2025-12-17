'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Loader2 } from "lucide-react"
import { uploadFile } from "@/lib/services/storage"
import { updateResource } from "@/lib/services/resources"
import { toast } from "sonner"
import type { Resource } from "@/lib/types"

interface EditResourceDialogProps {
  resource: Resource
  onSuccess: () => void
}

export default function EditResourceDialog({ resource, onSuccess }: EditResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [resourceType, setResourceType] = useState("")
  const [externalLink, setExternalLink] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  useEffect(() => {
    if (open) {
      setTitle(resource.title || "")
      setDescription(resource.description || "")
      setResourceType(resource.resource_type || "")
      setExternalLink(resource.external_link || "")
      setSelectedFiles([])
    }
  }, [open, resource])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !resourceType) {
      toast.error("Please fill in required fields")
      return
    }

    setIsUpdating(true)

    try {
      const newUploadedFiles: { url: string; name: string }[] = []
      
      for (const file of selectedFiles) {
        const result = await uploadFile(file)
        newUploadedFiles.push(result)
      }

      await updateResource({
        resourceId: resource.id,
        title,
        description,
        resourceType,
        files: newUploadedFiles.length > 0 ? newUploadedFiles : undefined,
        externalLink: externalLink || undefined
      })

      toast.success("Resource updated successfully!")
      setOpen(false)
      onSuccess()
    } catch (error) {
      toast.error("Failed to update resource")
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-gray-200">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update the details of your resource.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resource title"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about this resource"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="edit-type">Resource Type *</Label>
            <Select value={resourceType} onValueChange={setResourceType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Policy">Policy</SelectItem>
                <SelectItem value="Procedure">Procedure</SelectItem>
                <SelectItem value="Document">Document</SelectItem>
                <SelectItem value="Vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-files">Add More Files</Label>
            <Input
              id="edit-files"
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFiles.length} new file(s) selected
              </p>
            )}
            {resource.files && resource.files.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Keeping {resource.files.length} existing file(s)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-link">External Link</Label>
            <Input
              id="edit-link"
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}