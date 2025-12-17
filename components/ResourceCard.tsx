'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ExternalLink, Trash2, Download } from "lucide-react"
import EditResourceDialog from "./EditResourceDialog"
import type { Resource } from "@/lib/types"

interface ResourceCardProps {
  resource: Resource
  onDelete: (id: string) => void
  onUpdate: () => void
  canEdit: boolean
}

export default function ResourceCard({ resource, onDelete, onUpdate, canEdit }: ResourceCardProps) {
    const getTypeColor = (type?: string) => {
        switch (type) {
          case 'Policy': 
            return 'bg-blue-600 text-white hover:bg-blue-700'
          case 'Procedure': 
            return 'bg-emerald-600 text-white hover:bg-emerald-700'
          case 'Document': 
            return 'bg-violet-600 text-white hover:bg-violet-700'
          case 'Vendor': 
            return 'bg-amber-600 text-white hover:bg-amber-700'
          default: 
            return 'bg-gray-600 text-white hover:bg-gray-700'
        }
      }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {resource.title}
            </CardTitle>
            <CardDescription className="mt-2">
              {resource.description || 'No description provided'}
            </CardDescription>
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <EditResourceDialog resource={resource} onSuccess={onUpdate} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(resource.id)}
                className="text-red-600 hover:bg-red-100 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getTypeColor(resource.resource_type)}>
            {resource.resource_type}
          </Badge>
          <span className="text-sm text-muted-foreground">
            by {resource.organization}
          </span>
        </div>
        
        {resource.files && resource.files.length > 0 && (
  <div className="space-y-1">
    {resource.files.map((file) => (
      <a
        key={file.id}
        href={file.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Download className="h-4 w-4" />
        {file.file_name || 'Download File'}
      </a>
    ))}
  </div>
)}
        
        {resource.external_link && (
          <a
            href={resource.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View External Link
          </a>
        )}
      </CardContent>
    </Card>
  )
}