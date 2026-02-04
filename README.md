# NAPA Resource Hub

A shared resource library platform for NAPA (National APIDA Panhellenic Association) member organizations.

## Features

- **Email & Password Authentication**: Secure login with BetterAuth and Email OTP verification
- **Organization-based Access**: Multi-tenant system with organization isolation
- **Resource Management**: Upload, view, edit, and delete shared resources
- **Role-based Permissions**: Admin controls for NAPA members
- **User Approval Workflow**: New users require admin approval before accessing resources
- **User Management**: NAPA admins can manage all users across organizations
- **Resource Types**: Support for Policies, Procedures, Documents, and Vendor information
- **Search & Filter**: Find resources by keyword and type
- **File Upload Security**: Comprehensive validation with malware protection (see [Security Documentation](./docs/SECURITY.md))

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Authentication**: BetterAuth (Email/Password + Email OTP)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Vega preset)
- **Storage**: Local filesystem (Cloudflare R2 planned)

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm/bun
- Neon PostgreSQL database

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

Key variables:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Auth secret (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL` - Your app URL
- `EMAIL_SERVER_*` - SMTP configuration for email OTP

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npx drizzle-kit push

# Seed the database
npx tsx lib/db/seed.ts

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
napa-resource-hub/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin panel (users, approvals, audit, members, domains)
│   ├── api/               # API routes
│   │   ├── auth/          # BetterAuth handler
│   │   └── v2/            # Application API endpoints
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── verify-email/      # Email OTP verification
│   ├── forgot-password/   # Password reset flow
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                   # Utilities and services
│   ├── auth.ts           # BetterAuth server config
│   ├── auth-client.ts    # BetterAuth client config
│   ├── auth-helpers.ts   # Server-side auth utilities
│   ├── db/               # Drizzle ORM schema and seeds
│   ├── services-drizzle/ # API service layer
│   └── utils/            # Utility functions (file validation, etc.)
├── docs/                  # Documentation
├── drizzle/               # Database migrations
├── proxy.ts               # Next.js 16 request proxy (auth middleware)
└── public/               # Static assets
```

## Authentication Flow

1. **New Users**:
   - Sign up with email, password, and organization
   - Account created with "pending" approval status
   - Admin notified for approval
   - First login requires Email OTP verification (valid for 60 days)

2. **Existing Users**:
   - Sign in with email and password
   - Email OTP verification required every 60 days

3. **Password Reset**:
   - Request reset code via email
   - Enter 6-digit OTP and new password

4. **NAPA Members**:
   - Automatically assigned to "National APIDA Panhellenic Association"
   - Email domains: `@napahq.org`, `@napa-online.org`
   - Admin privileges for user management

## Security

The NAPA Resource Hub implements comprehensive file upload security measures:

- **File Type Validation**: Only allows approved document types (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX) and images (PNG, JPG, GIF)
- **File Size Limits**: Maximum 10MB per file
- **Executable Blocking**: Blocks all executable file types (.exe, .dmg, .sh, .bat, etc.)
- **MIME Type Verification**: Prevents file type spoofing
- **Filename Sanitization**: Removes malicious characters and path traversal attempts
- **Dual Validation**: Both client-side (UX) and server-side (security) validation

For detailed security documentation, see [docs/SECURITY.md](./docs/SECURITY.md)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables (see `.env.local.example`)
4. Deploy

## License

Proprietary - National APIDA Panhellenic Association

## Support

For questions or support, contact NAPA administrators.
