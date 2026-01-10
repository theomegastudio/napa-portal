# OTP Email Verification Implementation Plan

## Overview
Add OTP (One-Time Password) email verification for all users, including those auto-approved via whitelisted domains. Once verified, users won't need to verify again for 60 days.

## Requirements
- All users must verify their email via OTP on first login
- OTP verification is valid for 60 days
- Use SMTP2GO for email delivery
- 6-digit numeric OTP codes
- OTP expires after 10 minutes
- Max 3 OTP requests per hour (rate limiting)

## Database Changes

### Add fields to `users` table:
```sql
emailVerifiedAt: timestamp (when OTP was last verified)
otpCode: varchar(6) (current OTP code, hashed)
otpExpiresAt: timestamp (when current OTP expires)
otpRequestedAt: timestamp (for rate limiting)
otpAttempts: integer (failed attempts counter)
```

## Implementation Steps

### 1. Database Schema Update
- Add new columns to users table in `lib/db/schema.ts`
- Run database migration

### 2. Email Service Updates (`lib/services-drizzle/email.ts`)
- Configure SMTP2GO credentials
- Add `sendOTPEmail()` function
- Clean HTML email template with 6-digit code

### 3. OTP Service (`lib/services-drizzle/otp.ts`)
- `generateOTP()` - Generate 6-digit code
- `createOTP(userId)` - Generate, hash, store OTP with expiry
- `verifyOTP(userId, code)` - Validate OTP code
- `isEmailVerificationRequired(userId)` - Check if 60 days passed
- `rateLimit(userId)` - Check/enforce rate limits

### 4. API Endpoints

#### POST `/api/v2/auth/otp/send`
- Requires authenticated session
- Generates OTP and sends email
- Rate limited (3/hour)
- Returns success/error

#### POST `/api/v2/auth/otp/verify`
- Requires authenticated session
- Validates OTP code
- Updates `emailVerifiedAt` on success
- Locks account after 5 failed attempts

### 5. OTP Verification Page (`app/verify-email/page.tsx`)
- Shows after login if verification needed
- 6-digit code input (auto-focus, auto-advance)
- "Resend Code" button with countdown
- Error handling for invalid/expired codes

### 6. Auth Flow Changes

#### Login Flow Update:
1. User enters credentials → Auth.js validates
2. Check if `emailVerifiedAt` is null OR older than 60 days
3. If verification needed → redirect to `/verify-email`
4. If verified recently → proceed to dashboard

#### Middleware Update (`middleware.ts`):
- Add `/verify-email` to public routes
- After login, check verification status before allowing access

### 7. Environment Variables
```env
SMTP2GO_API_KEY=your_api_key
SMTP2GO_SENDER=noreply@napahq.org
OTP_EXPIRY_MINUTES=10
OTP_VALIDITY_DAYS=60
```

## File Changes Summary

### New Files:
- `lib/services-drizzle/otp.ts` - OTP generation/verification logic
- `app/verify-email/page.tsx` - OTP entry UI
- `app/api/v2/auth/otp/send/route.ts` - Send OTP endpoint
- `app/api/v2/auth/otp/verify/route.ts` - Verify OTP endpoint

### Modified Files:
- `lib/db/schema.ts` - Add OTP fields to users table
- `lib/services-drizzle/email.ts` - Add SMTP2GO config and OTP email
- `lib/auth.config.ts` - Add /verify-email to public routes
- `middleware.ts` - Add verification check redirect
- `app/login/page.tsx` - Redirect to verify if needed after login

## UI/UX Flow

```
Login Page
    ↓
[Enter credentials]
    ↓
[Auth.js validates] ──→ Invalid → Show error
    ↓ Valid
[Check emailVerifiedAt]
    ↓
[Needs verification?] ──→ No → Dashboard
    ↓ Yes
[Send OTP email automatically]
    ↓
Verify Email Page
    ↓
[Enter 6-digit code]
    ↓
[Verify] ──→ Invalid → Show error, allow retry
    ↓ Valid
[Update emailVerifiedAt]
    ↓
Dashboard
```

## Security Considerations
- OTP codes are hashed before storage (bcrypt)
- Rate limiting prevents brute force
- Account lockout after 5 failed attempts
- OTP expires after 10 minutes
- HTTPS only for all endpoints
