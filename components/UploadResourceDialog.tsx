'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2 } from "lucide-react"
import { uploadFile } from "@/lib/services/storage"
import { createResource } from "@/lib/services/resources"
import { toast } from "sonner"

interface UploadResourceDialogProps {
  onSuccess: () => void
  userEmail: string
  userOrganization: string
}

export default function UploadResourceDialog({ onSuccess, userEmail, userOrganization }: UploadResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [resourceType, setResourceType] = useState("")
  const [externalLink, setExternalLink] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !resourceType) {
      toast.error("Please fill in required fields")
      return
    }

    setIsUploading(true)

    try {
      const uploadedFiles: { url: string; name: string }[] = []
      
      for (const file of selectedFiles) {
        const result = await uploadFile(file)
        uploadedFiles.push(result)
      }

      await createResource({
        title,
        description,
        resourceType,
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        externalLink: externalLink || undefined,
        organization: userOrganization,
        uploadedBy: userEmail
      })

      toast.success("Resource added successfully!")
      setOpen(false)
      resetForm()
      onSuccess()
    } catch (error) {
      toast.error("Failed to add resource")
      console.error(error)
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setResourceType("")
    setExternalLink("")
    setSelectedFiles([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
          <DialogDescription>
            Share a policy, procedure, document, or vendor information with other member organizations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resource title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about this resource"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Resource Type *</Label>
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
            <Label htmlFor="files">Add Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFiles.length} file(s) selected
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="link">External Link</Label>
            <Input
              id="link"
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
            <Button type="submit" disabled={isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}