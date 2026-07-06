export interface Organization {
    id: string
    organization_name: string
    created_at: string
    updated_at: string
  }
  
  export interface User {
    id: string
    email: string
    organization_name: string | null
    is_admin: boolean
    created_at: string
    updated_at: string
  }
  
  export interface Resource {
    id: string
    title: string
    description: string | null
    resource_type: 'Policy' | 'Procedure' | 'Document' | 'Vendor'
    external_link: string | null
    organization: string
    uploaded_by: string
    created_at: string
    updated_at: string
    deleted_at: string | null
    files?: ResourceFile[]
  }
  
  export interface ResourceFile {
    id: string
    resource_id: string
    file_url: string
    file_name: string | null
    created_at: string
  }
  
  export interface Member {
    id: string
    email: string
    organizationName: string | null
    isAdmin: boolean
    role?: string
    approvalStatus?: string
    banned?: boolean
    createdAt: string
  }