# NAPA Resource Hub - Developer Guide

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Authentication & Authorization](#authentication--authorization)
- [Database Schema](#database-schema)
- [Key Features](#key-features)
- [Development Guide](#development-guide)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

NAPA Resource Hub is a multi-tenant SaaS platform for managing organizational resources. It enables organizations within the National APIDA Panhellenic Association network to upload, share, and manage policies, procedures, documents, and vendor information.

### Key Capabilities
- Passwordless email authentication
- Multi-tenant resource isolation by organization
- Role-based access control (User, Org Admin, NAPA Super Admin)
- File storage and management
- Full-text search and filtering
- Member invitation system

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19.2.1
- **Styling:** Tailwind CSS 3.4.19
- **Components:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Notifications:** Sonner

### Backend
- **Authentication:** Supabase Auth (Magic Links)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **API:** Next.js Route Handlers

### Development Tools
- TypeScript (strict mode)
- ESLint
- Tailwind CSS IntelliSense

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm, yarn, pnpm, or bun
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd napa-resource-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**

   See [Database Schema](#database-schema) section for table creation and RLS policies.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
napa-resource-hub/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Main dashboard
│   ├── login/page.tsx             # Login page
│   ├── signup/page.tsx            # Signup with org selection
│   ├── admin/users/page.tsx       # User management (NAPA admin)
│   ├── auth/callback/route.ts     # OAuth callback
│   ├── privacy/page.tsx           # Privacy policy
│   ├── terms/page.tsx             # Terms of service
│   └── layout.tsx                 # Root layout
│
├── components/                    # React components
│   ├── ui/                        # shadcn/ui components
│   ├── UploadResourceDialog.tsx   # Resource creation
│   ├── EditResourceDialog.tsx     # Resource editing
│   ├── ResourceCard.tsx           # Resource display
│   ├── ManageMembers.tsx          # Member management
│   └── OrganizationSetup.tsx      # Org onboarding
│
├── lib/                           # Utilities and services
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── middleware.ts          # Session management
│   │
│   ├── services/                  # Business logic
│   │   ├── auth.ts                # Authentication
│   │   ├── resources.ts           # Resource CRUD
│   │   ├── organizations.ts       # Organization management
│   │   ├── storage.ts             # File operations
│   │   └── members.ts             # Member invitations
│   │
│   ├── utils/                     # Utility functions
│   │   └── file-validation.ts    # File security validation
│   │
│   ├── types.ts                   # TypeScript interfaces
│   └── utils.ts                   # General utilities
│
├── docs/                          # Documentation
│   └── SECURITY.md                # Security implementation details
│
├── public/                        # Static assets
├── middleware.ts                  # Session refresh middleware
├── tailwind.config.ts             # Tailwind config
├── tsconfig.json                  # TypeScript config
└── next.config.ts                 # Next.js config
```

## Authentication & Authorization

### Authentication Flow

#### 1. Login Process (`/login`)
```typescript
// User flow:
1. User enters email
2. System checks if user exists via checkUserExists()
3. If not exists → redirect to /signup
4. If exists → send magic link via signInWithMagicLink()
5. User clicks link in email
6. Redirect to /auth/callback
7. Exchange code for session
8. Redirect to dashboard
```

#### 2. Signup Process (`/signup`)
```typescript
// User flow:
1. Email pre-filled from query parameter
2. User selects organization
3. User accepts terms and conditions
4. Send magic link with org metadata via signUpWithMagicLink()
5. User clicks link in email
6. Redirect to /auth/callback
7. Create user profile in database
8. Redirect to dashboard
```

#### 3. Special Cases
- **NAPA email domains** (@napahq.org, @napa-online.org):
  - Auto-assigned to "National APIDA Panhellenic Association"
  - Granted NAPA super admin privileges

### Authorization Model

#### User Roles

| Role | Permissions |
|------|-------------|
| **Regular User** | - Upload resources<br>- View organization resources<br>- Edit/delete own resources |
| **Organization Admin** | - All user permissions<br>- Invite members<br>- Assign admin roles<br>- Manage organization members |
| **NAPA Super Admin** | - All permissions<br>- Manage all users across organizations<br>- Edit/delete any resource<br>- Access admin dashboard |

#### Permission Checks

```typescript
// Check if user is NAPA admin
const isAdmin = await isNapaAdmin(supabase);

// NAPA admin criteria:
// - is_admin = true
// - organization_name = 'National APIDA Panhellenic Association'
```

### Session Management

- **Middleware** (`middleware.ts`): Refreshes session on every request
- **Client-side** (`lib/supabase/client.ts`): Browser operations
- **Server-side** (`lib/supabase/server.ts`): Server operations, cookies

## Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  organization_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `organizations`
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `resources`
```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('Policy', 'Procedure', 'Document', 'Vendor')),
  external_link TEXT,
  organization TEXT REFERENCES users(organization_name),
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### `resource_files`
```sql
CREATE TABLE resource_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Users table: Allow anonymous SELECT for existence checks
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous SELECT on users"
ON users FOR SELECT
TO anon
USING (true);

-- Resources table: Organization-based access
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org resources"
ON resources FOR SELECT
USING (organization = (SELECT organization_name FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert to their org"
ON resources FOR INSERT
WITH CHECK (organization = (SELECT organization_name FROM users WHERE id = auth.uid()));
```

### Storage Bucket

```sql
-- Create public bucket for resource files
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true);

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resource-files');
```

## Key Features

### 1. Resource Management

**Resource Types:**
- Policy
- Procedure
- Document
- Vendor

**Operations:**
- Create with file upload
- Edit title, description, type, external link
- Delete (soft delete with `deleted_at`)
- Search by title/description
- Filter by type

**Implementation:**
```typescript
// lib/services/resources.ts
export async function createResource(data: CreateResourceData)
export async function updateResource(id: string, data: UpdateResourceData)
export async function deleteResource(id: string)
export async function getResources(filters?: ResourceFilters)
```

### 2. File Storage

**Features:**
- Upload multiple files per resource
- Automatic filename generation (random + timestamp)
- Public URL access
- File deletion on resource delete
- **Comprehensive security validation** (see [Security](#file-upload-security) section)

**Implementation:**
```typescript
// lib/services/storage.ts
export async function uploadFile(file: File): Promise<{ url: string; name: string }>
export async function deleteFile(fileUrl: string)
```

**Security Features:**
- File type validation (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images only)
- File size limits (10MB max)
- MIME type verification
- Filename sanitization
- Executable file blocking

### 3. Member Management

**Organization Admin Features:**
- View all organization members
- Invite new members via email
- Assign admin roles
- Remove admin privileges

**Implementation:**
```typescript
// lib/services/members.ts
export async function getOrgMembers(orgName: string)
export async function inviteUser(email: string, orgName: string)
```

### 4. Search & Filtering

**Capabilities:**
- Full-text search on title and description
- Filter by resource type
- Debounced search (500ms)
- Organization-scoped results

**Implementation:**
```typescript
// Example from app/page.tsx
const filteredResources = resources
  .filter(r => !r.deleted_at)
  .filter(r => {
    const matchesSearch = !searchTerm ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !typeFilter || r.resource_type === typeFilter;
    return matchesSearch && matchesType;
  });
```

## File Upload Security

The NAPA Resource Hub implements comprehensive file upload security to protect against malware and malicious files.

### Security Implementation

Located in `/lib/utils/file-validation.ts`:

**Key Functions:**
- `validateFile(file: File)` - Comprehensive validation
- `validateFileSize(file: File)` - Check size limits (10MB max)
- `validateFileExtension(filename: string)` - Check allowed types
- `validateMimeType(file: File)` - Verify MIME matches extension
- `sanitizeFilename(filename: string)` - Remove dangerous characters

**Allowed File Types:**
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Images**: PNG, JPG, JPEG, GIF

**Blocked File Types:**
All executable files are blocked including: .exe, .dmg, .bat, .sh, .cmd, .dll, .app, .pkg, .msi, and more.

**Validation Flow:**
```typescript
1. Client selects file
2. Client-side validation (immediate feedback)
3. Server-side validation (security enforcement)
4. Filename sanitization (remove malicious characters)
5. Unique filename generation
6. Upload to Supabase Storage
```

**Implementation Example:**
```typescript
// Upload dialog validation
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
}
```

For detailed security documentation, see [docs/SECURITY.md](./docs/SECURITY.md)

## Development Guide

### Adding New Features

#### 1. Create a New Service

```typescript
// lib/services/my-feature.ts
import { createClient } from '@/lib/supabase/server';

export async function myFeatureFunction() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('table_name')
    .select('*');

  if (error) throw error;
  return data;
}
```

#### 2. Create a New Component

```typescript
// components/MyComponent.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const [state, setState] = useState();

  return (
    <div>
      <Button onClick={() => {}}>Click me</Button>
    </div>
  );
}
```

#### 3. Add a New Route

```typescript
// app/my-route/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <div>My Page</div>;
}
```

### Styling Guidelines

This project uses Tailwind CSS with shadcn/ui components.

**Common Patterns:**
```tsx
// Card layout
<div className="rounded-lg border bg-card text-card-foreground shadow-sm">
  <div className="p-6">Content</div>
</div>

// Button variants
<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

// Input fields
<Input type="text" placeholder="Enter text..." />
<Textarea placeholder="Enter description..." />
```

### TypeScript Best Practices

```typescript
// Define types in lib/types.ts
export interface MyType {
  id: string;
  name: string;
  createdAt: Date;
}

// Use proper typing
const data: MyType[] = await fetchData();

// Avoid 'any' - use unknown or proper types
const handleData = (data: unknown) => {
  if (typeof data === 'string') {
    // Handle string
  }
};
```

## API Reference

### Authentication Service (`lib/services/auth.ts`)

```typescript
// Check if user exists
checkUserExists(email: string): Promise<boolean>

// Sign in with magic link
signInWithMagicLink(email: string): Promise<void>

// Sign up with magic link
signUpWithMagicLink(email: string, organizationName: string): Promise<void>

// Get user profile
getUserProfile(userId: string): Promise<User | null>

// Check if NAPA admin
isNapaAdmin(supabase: SupabaseClient): Promise<boolean>

// Get all users (NAPA admin only)
getAllUsers(): Promise<User[]>

// Update user
updateUser(userId: string, updates: Partial<User>): Promise<void>

// Delete user
deleteUser(userId: string): Promise<void>
```

### Resource Service (`lib/services/resources.ts`)

```typescript
// Get resources with optional filters
getResources(filters?: {
  searchTerm?: string;
  resourceType?: ResourceType;
}): Promise<Resource[]>

// Create resource
createResource(data: {
  title: string;
  description?: string;
  resourceType: ResourceType;
  externalLink?: string;
  fileUrls?: string[];
}): Promise<Resource>

// Update resource
updateResource(id: string, data: Partial<Resource>): Promise<void>

// Delete resource (soft delete)
deleteResource(id: string): Promise<void>
```

### Storage Service (`lib/services/storage.ts`)

```typescript
// Upload file to Supabase Storage with validation
uploadFile(file: File): Promise<{ url: string; name: string }>

// Delete file from storage
deleteFile(fileUrl: string): Promise<void>
```

**Security Notes:**
- All files are validated before upload (type, size, MIME)
- Filenames are sanitized to prevent path traversal
- Only approved file types are allowed
- See [File Upload Security](#file-upload-security) for details

### Organization Service (`lib/services/organizations.ts`)

```typescript
// Get all organizations
getOrganizations(): Promise<Organization[]>

// Update user's organization
updateUserOrganization(userId: string, orgName: string): Promise<void>
```

### Member Service (`lib/services/members.ts`)

```typescript
// Get organization members
getOrgMembers(organizationName: string): Promise<Member[]>

// Invite user to organization
inviteUser(email: string, organizationName: string): Promise<void>
```

## Deployment

### Environment Variables

Required for production:
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
```

### Build Process

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Deployment Platforms

This Next.js application can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **DigitalOcean App Platform**
- Any Node.js hosting platform

### Vercel Deployment

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy

Vercel will automatically:
- Install dependencies
- Run build
- Deploy to production
- Set up preview deployments for PRs

## Contributing

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Use functional components with hooks
- Prefer server components where possible
- Use client components (`'use client'`) only when needed

### Commit Messages

Follow conventional commits:
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Refactor code
test: Add tests
chore: Update dependencies
```

### Pull Request Process

1. Create feature branch from `main`
2. Make changes
3. Test locally
4. Create PR with description
5. Wait for review
6. Merge after approval

### Testing Checklist

Before submitting PR:
- [ ] Code builds without errors
- [ ] All features work as expected
- [ ] No console errors
- [ ] Responsive design verified
- [ ] TypeScript types are correct
- [ ] No unused imports or variables

## Troubleshooting

### Common Issues

**Issue: "User not found" after signup**
- Solution: Check that user profile is created in `/auth/callback`

**Issue: Resources not showing**
- Solution: Verify organization name matches exactly (case-sensitive)

**Issue: File upload fails**
- Solution: Check storage bucket RLS policies and bucket is public

**Issue: Magic link not working**
- Solution: Verify Supabase email settings and redirect URLs

### Debug Mode

Enable debug logging:
```typescript
// lib/supabase/client.ts
export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      debug: true // Add this
    }
  }
);
```

## Support

For questions or issues:
- Check existing documentation
- Review Supabase documentation
- Review Next.js documentation
- Create an issue in the repository

---

**Last Updated:** December 2024
**Version:** 1.0.0
