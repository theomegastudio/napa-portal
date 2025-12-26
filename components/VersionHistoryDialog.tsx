'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, FileText } from "lucide-react"
import { getResourceVersions, type ResourceVersion } from "@/lib/services/versions"
import { toast } from "sonner"

interface VersionHistoryDialogProps {
  resourceId: string
  resourceTitle: string
}

export default function VersionHistoryDialog({ resourceId, resourceTitle }: VersionHistoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<ResourceVersion[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      fetchVersions()
    }
  }, [open])

  const fetchVersions = async () => {
    try {
      setIsLoading(true)
      const data = await getResourceVersions(resourceId)
      setVersions(data)
    } catch (error) {
      toast.error("Failed to load version history")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-gray-200">
          <Clock className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            {resourceTitle}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No version history yet</p>
            <p className="text-sm text-muted-foreground">
              Versions are created when you edit this resource
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <Card key={version.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={index === 0 ? "default" : "outline"}>
                        Version {version.version_number}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    by {version.updated_by}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="font-medium">{version.title}</p>
                    {version.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {version.description}
                      </p>
                    )}
                  </div>

                  {version.change_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs font-medium text-blue-900">Change Notes:</p>
                      <p className="text-sm text-blue-800">{version.change_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Type: {version.resource_type}</span>
                    {version.external_link && (
                      <span>• External Link Updated</span>
                    )}
                    {version.metadata?.filesAdded > 0 && (
                      <span>• {version.metadata.filesAdded} file(s) added</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
