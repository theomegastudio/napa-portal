# NAPA Resource Hub

A shared resource library platform for NAPA (National APIDA Panhellenic Association) member organizations.

## Features

- **Magic Link Authentication**: Secure passwordless login via email
- **Organization-based Access**: Multi-tenant system with organization isolation
- **Resource Management**: Upload, view, edit, and delete shared resources
- **Role-based Permissions**: Admin controls for NAPA members
- **User Management**: NAPA admins can manage all users across organizations
- **Resource Types**: Support for Policies, Procedures, Documents, and Vendor information
- **Search & Filter**: Find resources by keyword and type

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Authentication**: Supabase Auth (Magic Links)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm/bun
- Supabase account

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Supabase Setup

1. Create a new Supabase project
2. Run the database migrations (see `/supabase` directory if applicable)
3. Configure authentication redirect URLs in Supabase dashboard:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

4. Set up Row Level Security (RLS) policies:
   - Users table: Allow anonymous SELECT for user existence checks
   - Resources table: Organization-based access control
   - Organizations table: Public read access

## Project Structure

```
napa-resource-hub/
├── app/                    # Next.js app router pages
│   ├── admin/             # Admin panel
│   ├── auth/              # Authentication callbacks
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Feature components
├── lib/                   # Utilities and services
│   ├── services/         # API service layer
│   ├── supabase/         # Supabase clients
│   └── types.ts          # TypeScript type definitions
└── public/               # Static assets
```

## Authentication Flow

1. **New Users**:
   - Enter email on login page
   - Redirected to signup if no account exists
   - Select organization and accept terms
   - Receive magic link email
   - Click link to complete registration

2. **Existing Users**:
   - Enter email on login page
   - Receive magic link email
   - Click link to sign in

3. **NAPA Members**:
   - Automatically assigned to "National APIDA Panhellenic Association"
   - Email domains: `@napahq.org`, `@napa-online.org`
   - Admin privileges for user management

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## License

Proprietary - National APIDA Panhellenic Association

## Support

For questions or support, contact NAPA administrators.
