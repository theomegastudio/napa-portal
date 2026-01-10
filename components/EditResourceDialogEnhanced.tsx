'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, Loader2, AlertCircle, X, FileIcon, AlertTriangle } from "lucide-react"
import { uploadFile } from "@/lib/services-drizzle/storage.client"
import { toast } from "sonner"
import { validateFile, formatFileSize, MAX_FILE_SIZE } from "@/lib/utils/file-validation"
import type { Resource } from "@/lib/types"

interface EditResourceDialogProps {
  resource: Resource
  onSuccess: () => void
}

interface FileConflict {
  newFile: File
  existingFile: { id: string; file_name: string | null; file_url: string }
}

export default function EditResourceDialogEnhanced({ resource, onSuccess }: EditResourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [resourceType, setResourceType] = useState("")
  const [externalLink, setExternalLink] = useState("")
  const [changeNotes, setChangeNotes] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [filesToDelete, setFilesToDelete] = useState<string[]>([])
  const [conflicts, setConflicts] = useState<FileConflict[]>([])
  const [conflictResolutions, setConflictResolutions] = useState<Map<string, 'overwrite' | 'keep-both'>>(new Map())

  useEffect(() => {
    if (open) {
      setTitle(resource.title || "")
      setDescription(resource.description || "")
      setResourceType(resource.resource_type || "")
      setExternalLink(resource.external_link || "")
      setChangeNotes("")
      setSelectedFiles([])
      setFileErrors([])
      setFilesToDelete([])
      setConflicts([])
      setConflictResolutions(new Map())
    }
  }, [open, resource])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const errors: string[] = []
    const validFiles: File[] = []
    const newConflicts: FileConflict[] = []

    files.forEach((file) => {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError.message}`)
      } else {
        // Check for name conflicts with existing files
        const existingFile = resource.files?.find(f =>
          f.file_name && f.file_name.toLowerCase() === file.name.toLowerCase()
        )

        if (existingFile && existingFile.file_name) {
          newConflicts.push({ newFile: file, existingFile })
        }
        validFiles.push(file)
      }
    })

    setFileErrors(errors)
    setSelectedFiles(validFiles)
    setConflicts(newConflicts)

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) rejected due to validation errors`)
    }

    if (newConflicts.length > 0) {
      toast.warning(`${newConflicts.length} file(s) have name conflicts - please resolve`)
    }
  }

  const handleConflictResolution = (fileName: string, resolution: 'overwrite' | 'keep-both') => {
    const newResolutions = new Map(conflictResolutions)
    newResolutions.set(fileName, resolution)
    setConflictResolutions(newResolutions)

    if (resolution === 'overwrite') {
      const conflict = conflicts.find(c => c.newFile.name === fileName)
      if (conflict && !filesToDelete.includes(conflict.existingFile.id)) {
        setFilesToDelete([...filesToDelete, conflict.existingFile.id])
      }
    }
  }

  const handleDeleteExistingFile = (fileId: string) => {
    if (filesToDelete.includes(fileId)) {
      setFilesToDelete(filesToDelete.filter(id => id !== fileId))
    } else {
      setFilesToDelete([...filesToDelete, fileId])
    }
  }

  const hasUnresolvedConflicts = () => {
    return conflicts.some(c => !conflictResolutions.has(c.newFile.name))
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

    if (hasUnresolvedConflicts()) {
      toast.error("Please resolve all file name conflicts")
      return
    }

    setIsUpdating(true)

    try {
      // Delete marked files first via API
      for (const fileId of filesToDelete) {
        const deleteResponse = await fetch(`/api/v2/resources/${resource.id}/files/${fileId}`, {
          method: 'DELETE',
        })
        if (!deleteResponse.ok) {
          const error = await deleteResponse.json()
          throw new Error(error.error || 'Failed to delete file')
        }
      }

      // Upload new files
      const newUploadedFiles: { url: string; name: string }[] = []
      setFileErrors([]) // Clear any previous errors

      for (const file of selectedFiles) {
        try {
          // If keeping both, rename the new file
          const resolution = conflictResolutions.get(file.name)
          let fileName = file.name
          if (resolution === 'keep-both') {
            const timestamp = new Date().getTime()
            const nameParts = file.name.split('.')
            const ext = nameParts.pop()
            const baseName = nameParts.join('.')
            fileName = `${baseName}-${timestamp}.${ext}`
          }

          const result = await uploadFile(file, fileName)
          newUploadedFiles.push(result)
        } catch (uploadError) {
          // Catch server-side validation errors
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Upload failed"
          setFileErrors(prev => [...prev, `${file.name}: ${errorMessage}`])
          setIsUpdating(false)
          return // Stop upload process
        }
      }

      // Update resource via API
      const response = await fetch(`/api/v2/resources/${resource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          resourceType,
          files: newUploadedFiles.length > 0 ? newUploadedFiles : undefined,
          externalLink: externalLink || undefined,
          changeNotes: changeNotes || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update resource')
      }

      toast.success("Resource updated successfully!")
      setOpen(false)
      onSuccess()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update resource"
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setIsUpdating(false)
    }
  }

  const existingFiles = resource.files?.filter(f => !filesToDelete.includes(f.id)) || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-gray-200">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>
            Update the details of your resource. Manage files and track changes.
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
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 characters
            </p>
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

          {/* Existing Files Management */}
          {resource.files && resource.files.length > 0 && (
            <div>
              <Label>Existing Files</Label>
              <div className="border rounded-md p-3 space-y-2 mt-1">
                {resource.files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      filesToDelete.includes(file.id) ? 'bg-red-50 opacity-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{file.file_name}</span>
                      {filesToDelete.includes(file.id) && (
                        <span className="text-xs text-red-600">(will be deleted)</span>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExistingFile(file.id)}
                      className="h-7 px-2"
                    >
                      {filesToDelete.includes(file.id) ? (
                        <span className="text-xs">Undo</span>
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Conflicts */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">File name conflicts detected:</p>
                  {conflicts.map((conflict) => (
                    <div key={conflict.newFile.name} className="ml-4 space-y-1">
                      <p className="text-sm">"{conflict.newFile.name}" already exists</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={conflictResolutions.get(conflict.newFile.name) === 'overwrite' ? 'default' : 'outline'}
                          onClick={() => handleConflictResolution(conflict.newFile.name, 'overwrite')}
                        >
                          Overwrite existing
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={conflictResolutions.get(conflict.newFile.name) === 'keep-both' ? 'default' : 'outline'}
                          onClick={() => handleConflictResolution(conflict.newFile.name, 'keep-both')}
                        >
                          Keep both
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="edit-files">Add New Files</Label>
            <Input
              id="edit-files"
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max {formatFileSize(MAX_FILE_SIZE)} per file. Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
            </p>
            {selectedFiles.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                ✓ {selectedFiles.length} new file(s) selected
              </p>
            )}
            {fileErrors.length > 0 && (
              <div className="text-xs text-red-600 space-y-1 mt-1">
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

          <div>
            <Label htmlFor="change-notes">Change Notes</Label>
            <Textarea
              id="change-notes"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe what changed in this version (optional)"
              rows={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Change notes help track version history
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating || hasUnresolvedConflicts()}
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
