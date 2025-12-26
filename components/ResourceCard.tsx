'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ExternalLink, Trash2, Download } from "lucide-react"
import EditResourceDialogEnhanced from "./EditResourceDialogEnhanced"
import ResourceDetailDialog from "./ResourceDetailDialog"
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

    // Organization nickname mapping
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
      }
      return nicknames[orgName] || orgName
    }

  return (
    <ResourceDetailDialog resource={resource}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {resource.title}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {resource.description || 'No description provided'}
              </CardDescription>
            </div>
            {canEdit && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <EditResourceDialogEnhanced resource={resource} onSuccess={onUpdate} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(resource.id)
                  }}
                  className="text-red-600 hover:bg-red-100 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Badge className={getTypeColor(resource.resource_type)}>
              {resource.resource_type}
            </Badge>
            <div className="text-xs text-muted-foreground">
              by {getOrgNickname(resource.organization)}
            </div>
          </div>

          {resource.files && resource.files.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {resource.files.length} file{resource.files.length !== 1 ? 's' : ''}
            </div>
          )}

          {resource.external_link && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>Has external link</span>
            </div>
          )}
        </CardContent>
      </Card>
    </ResourceDetailDialog>
  )
}