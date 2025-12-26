'use client'

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Download, ExternalLink, Calendar, User } from "lucide-react"
import VersionHistoryDialog from "./VersionHistoryDialog"
import type { Resource } from "@/lib/types"

interface ResourceDetailDialogProps {
  resource: Resource
  children: React.ReactNode
}

export default function ResourceDetailDialog({ resource, children }: ResourceDetailDialogProps) {
  const [open, setOpen] = useState(false)

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

  const getOrgNickname = (orgName: string) => {
    const nicknames: Record<string, string> = {
      'National APIDA Panhellenic Association': 'ΝΑΑΠΑ', // Nu Alpha Alpha Pi Alpha
      'alpha Kappa Delta Phi': 'αΚΔΦ',
      'Kappa Phi Lambda': 'ΚΦΛ',
      'Sigma Psi Zeta': 'ΣΨΖ',
      'delta phi lambda': 'δφλ',
      'Lambda Phi Epsilon': 'ΛΦΕ',
      'Pi Delta Psi': 'ΠΔΨ',
      'Sigma Beta Rho': 'ΣΒΡ',
      'Lambda Theta Alpha': 'ΛΘΑ',
      'alpha Phi Gamma': 'αΦΓ',
      'Theta Nu Xi': 'ΘΝΞ',
      // Add more as needed
    }
    return nicknames[orgName] || orgName
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{resource.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {resource.description || 'No description provided'}
              </DialogDescription>
            </div>
            <VersionHistoryDialog
              resourceId={resource.id}
              resourceTitle={resource.title}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Metadata */}
          <div className="flex items-center gap-4 flex-wrap">
            <Badge className={getTypeColor(resource.resource_type)}>
              {resource.resource_type}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{getOrgNickname(resource.organization)}</span>
            </div>
            {resource.created_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date(resource.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Files Section */}
          {resource.files && resource.files.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Files ({resource.files.length})</h3>
                <div className="space-y-2">
                  {resource.files.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Download className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{file.file_name || 'Download File'}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* External Link Section */}
          {resource.external_link && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">External Link</h3>
                <a
                  href={resource.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium truncate">{resource.external_link}</span>
                  </div>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          {resource.uploaded_by && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              Uploaded by {resource.uploaded_by}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
