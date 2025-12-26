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
      'National APIDA Panhellenic Association': 'NAPA',
      'alpha Kappa Delta Phi International Sorority, Inc.': 'αΚΔΦ',
      'Alpha Phi Gamma National Sorority, Inc.': 'AΦΓ',
      'Alpha Sigma Rho National Sorority, Inc.': 'AΣP',
      'Chi Sigma Tau National Fraternity, Inc.': 'XΣT',
      'Delta Epsilon Psi National Fraternity, Inc.': 'ΔEΨ',
      'Delta Kappa Delta National Sorority, Inc.': 'ΔKΔ',
      'Delta Phi Lambda National Sorority, Inc.': 'ΔΦΛ',
      'Delta Phi Omega National Sorority, Inc.': 'ΔΦΩ',
      'Delta Sigma Iota National Fraternity, Inc.': 'ΔΣI',
      'Iota Nu Delta National Fraternity, Inc.': 'INΔ',
      'Kappa Phi Gamma National Sorority, Inc.': 'KΦΓ',
      'Kappa Phi Lambda National Sorority, Inc.': 'KΦΛ',
      'Kappa Pi Beta National Fraternity, Inc.': 'KΠB',
      'Lambda Phi Epsilon International Fraternity, Inc.': 'ΛΦE',
      'Pi Delta Psi National Fraternity, Inc.': 'ΠΔΨ',
      'Sigma Beta Rho National Fraternity, Inc.': 'ΣBP',
      'Sigma Psi Zeta National Sorority, Inc.': 'ΣΨZ',
      'Sigma Sigma Rho National Sorority, Inc.': 'ΣΣP',
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
          <DialogTitle className="text-2xl">{resource.title}</DialogTitle>
          <div className="mt-2 text-sm text-muted-foreground">
            {resource.description || 'No description provided'}
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
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{resource.external_link}</span>
                </a>
              </CardContent>
            </Card>
          )}

          {/* Additional Info */}
          {resource.uploaded_by && (
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <span>Uploaded by {resource.uploaded_by}</span>
              <VersionHistoryDialog
                resourceId={resource.id}
                resourceTitle={resource.title}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
