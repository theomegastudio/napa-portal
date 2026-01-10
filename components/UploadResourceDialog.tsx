'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { validateFile, formatFileSize, MAX_FILE_SIZE } from "@/lib/utils/file-validation"

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
  const [fileErrors, setFileErrors] = useState<string[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const errors: string[] = []
    const validFiles: File[] = []

    files.forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError.message}`)
      } else {
        validFiles.push(file)
      }
    })

    setFileErrors(errors)
    setSelectedFiles(validFiles)

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) rejected due to validation errors`)
    }
  }

  const uploadFile = async (file: File): Promise<{ url: string; name: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/v2/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    const data = await response.json()
    return { url: data.url, name: data.name || file.name }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !resourceType) {
      toast.error("Please fill in required fields")
      return
    }

    if (fileErrors.length > 0) {
      toast.error("Please fix file validation errors before submitting")
      return
    }

    setIsUploading(true)
    setFileErrors([]) // Clear any previous errors

    try {
      const uploadedFiles: { url: string; name: string }[] = []

      for (const file of selectedFiles) {
        try {
          const result = await uploadFile(file)
          uploadedFiles.push(result)
        } catch (uploadError) {
          // Catch server-side validation errors
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Upload failed"
          setFileErrors(prev => [...prev, `${file.name}: ${errorMessage}`])
          setIsUploading(false)
          return // Stop upload process
        }
      }

      // Create resource via API
      const response = await fetch('/api/v2/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          resourceType,
          externalLink: externalLink || undefined,
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create resource')
      }

      toast.success("Resource added successfully!")
      setOpen(false)
      resetForm()
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add resource"
      toast.error(errorMessage)
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
    setFileErrors([])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl">Add New Resource</DialogTitle>
          <DialogDescription className="text-sm">
            Share a policy, procedure, document, or vendor information with other member organizations.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resource title"
              required
              className="h-10 border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about this resource"
              rows={3}
              maxLength={500}
              className="resize-none border-gray-300"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Resource Type <span className="text-red-500">*</span>
            </Label>
            <Select value={resourceType} onValueChange={setResourceType} required>
              <SelectTrigger className="h-10 border-gray-300">
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

          <div className="space-y-2">
            <Label htmlFor="files" className="text-sm font-medium">Add Files</Label>
            <Input
              id="files"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="h-10 cursor-pointer border-gray-300"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
            />
            <p className="text-xs text-muted-foreground">
              Max {formatFileSize(MAX_FILE_SIZE)} per file. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
            </p>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-green-600">
                ✓ {selectedFiles.length} valid file(s) selected
              </p>
            )}
            {fileErrors.length > 0 && (
              <div className="text-xs text-red-600 space-y-1">
                <div className="flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  <span>{fileErrors.length} file(s) rejected:</span>
                </div>
                {fileErrors.map((error, idx) => (
                  <p key={idx} className="pl-4">• {error}</p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="link" className="text-sm font-medium">External Link</Label>
            <Input
              id="link"
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder="https://napahq.org"
              className="h-10 border-gray-300"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading} className="h-10">
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
