# Security Implementation

## File Upload Security

The NAPA Resource Hub implements comprehensive file upload security to protect against malware, malicious files, and security vulnerabilities.

### Security Measures

#### 1. File Type Validation

**Allowed File Types:**
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Images**: PNG, JPG, JPEG, GIF
- **Text**: TXT, CSV

**Blocked File Types:**
Executable files and scripts are strictly blocked, including:
- Executables: `.exe`, `.bat`, `.cmd`, `.com`, `.app`, `.msi`
- Scripts: `.sh`, `.bash`, `.zsh`, `.ps1`, `.vbs`, `.js`
- Libraries: `.dll`, `.so`, `.dylib`
- Installers: `.deb`, `.rpm`, `.dmg`, `.pkg`

#### 2. File Size Limits

- **Maximum file size**: 10MB per file
- Prevents storage abuse and DoS attacks
- Clear error messages when limit exceeded

#### 3. Magic Byte Validation (Server-Side)

- **Server-side magic byte detection**: Files are validated using their actual binary content, not just extension or MIME type
- **Cannot be spoofed**: Reading the first bytes of a file to determine its true type (e.g., PDF files start with `%PDF`)
- **Blocks renamed executables**: A `.dmg` file renamed to `.pdf` will be detected and rejected
- **Uses `file-type` library**: Industry-standard magic byte detection
- This is the same technique used by Google Drive, Dropbox, and other major platforms

#### 4. MIME Type Validation (Client-Side)

- Client-side validation provides immediate user feedback
- Checks if browser-reported MIME type matches file extension
- Fast validation before upload to server

#### 5. Filename Sanitization

All filenames are sanitized to prevent:
- **Path traversal attacks**: Removes `../`, `..\\` sequences
- **Null byte injection**: Removes `\0` characters
- **Control characters**: Removes ASCII control characters
- **Special characters**: Removes `<>:"|?*` characters
- **Length limits**: Filenames truncated to 255 characters

#### 6. Multi-Layer Validation

All validation occurs on both client and server:
- **Client-side**: Immediate user feedback, basic extension and MIME checks
- **Server-side**: Security enforcement using magic byte detection (cannot be bypassed)
- **API Route**: `/api/upload` handles all server-side validation before storage

### Implementation Details

#### File Validation Flow

```
User selects file
    ↓
Client validates: extension, MIME type, size
    ↓
If valid → Add to upload queue
If invalid → Show error, reject file
    ↓
User submits form
    ↓
Upload to /api/upload endpoint
    ↓
Server reads file buffer and validates:
  - File size
  - Extension whitelist
  - Magic bytes (actual file type)
  - Blocked executable signatures
    ↓
If validation fails → Return error to client
    ↓
Sanitize filename
    ↓
Generate unique filename with timestamp
    ↓
Upload to Supabase Storage (resource-files bucket)
    ↓
Return public URL to client
```

#### Code Location

- **Client-side validation**: `/lib/utils/file-validation.ts`
- **Server-side validation**: `/lib/utils/server-file-validation.ts`
- **Upload API route**: `/app/api/upload/route.ts`
- **Storage service**: `/lib/services/storage.ts`
- **Upload components**: `/components/UploadResourceDialog.tsx`, `/components/EditResourceDialogEnhanced.tsx`

### User Experience

#### Valid Files
- Shows checkmark with count of valid files
- Displays file size information
- Allows upload to proceed

#### Invalid Files
- Shows detailed error messages for each rejected file
- Explains why each file was rejected
- Prevents form submission until errors resolved

#### Error Messages Examples

```
"File size must be less than 10MB. Your file is 15.2MB."
"Executable files (.exe) are not allowed for security reasons."
"File type .zip is not supported. Allowed types: PDF, DOC, DOCX..."
"File appears to be a application/x-mach-binary file, not a .pdf file. Please upload the file with its correct extension."
"This file type (application/x-mach-binary) is blocked for security reasons."
```

### Future Enhancements

#### Virus Scanning (Pending Budget)

**Free Options:**
1. **VirusTotal API** (free tier: 4 requests/minute)
   - Scan files against 70+ antivirus engines
   - Get comprehensive threat analysis
   - Limitation: Rate limits may affect user experience

2. **ClamAV** (fully free, self-hosted)
   - Open-source antivirus engine
   - Would require separate service/container
   - Higher maintenance overhead

**Recommended Implementation:**
- Start with current validation (no budget required)
- Add VirusTotal for high-risk file types when budget allows
- Consider ClamAV if we have infrastructure capacity

#### Additional Security Measures

1. **Content Security Policy (CSP)**
   - Prevent XSS attacks on file downloads
   - Already partially implemented via headers

2. **File Quarantine**
   - Store new uploads in quarantine bucket
   - Move to public bucket after review period
   - Useful for high-security environments

3. **Download Tokens**
   - Generate temporary signed URLs for downloads
   - Expire after short period
   - Already supported by Supabase Storage

4. **Audit Logging**
   - Log all file uploads and downloads
   - Track who uploaded/downloaded what and when
   - Useful for compliance and incident response

### Testing File Security

#### Test Cases

1. **Valid Files** ✓
   - Upload PDF, DOCX, XLSX, PPTX files
   - Should succeed

2. **File Too Large** ✓
   - Try uploading file > 10MB
   - Should show size error

3. **Blocked Extension** ✓
   - Try uploading `.exe`, `.sh`, `.bat` files
   - Should show executable error

4. **Wrong File Type (Magic Bytes)** ✓
   - Rename `file.dmg` to `file.pdf`
   - Server detects actual file type using magic bytes
   - Should reject with "File appears to be a application/x-mach-binary file, not a .pdf file"

5. **Special Characters in Filename** ✓
   - Upload file with `<>:"|?*` in name
   - Should sanitize automatically

6. **Path Traversal Attempt** ✓
   - Upload file named `../../etc/passwd.txt`
   - Should sanitize to `passwd.txt`

### Security Best Practices

1. **Never trust client-side validation alone**
   - Always validate on server
   - Client-side is for UX only

2. **Whitelist, don't blacklist**
   - Only allow known-good file types
   - Easier to maintain and more secure

3. **Sanitize everything**
   - Filenames, metadata, user input
   - Assume all input is malicious

4. **Keep dependencies updated**
   - Regular updates to Supabase SDK
   - Security patches for Next.js

5. **Monitor and log**
   - Track failed upload attempts
   - Alert on suspicious patterns

### Compliance Notes

For organizations requiring additional security:

- **HIPAA**: May require encryption at rest (Supabase provides this)
- **GDPR**: Ensure files with PII are properly protected
- **SOC 2**: Audit logging recommended (can add)
- **FERPA**: Education records require access controls (RLS provides this)

### Contact

For security concerns or to report vulnerabilities:
- Create issue: https://github.com/theomegastudio/napa-resource-hub/issues
- Label with `security` tag

---

## Operator notes (added 2026-05-14 security review)

### Cloudflare R2 bucket configuration

The bucket named in `R2_BUCKET_NAME` **must be configured as private-read**:

- No public bucket policy.
- No public custom domain pointing directly at the bucket.
- All reads go through `/api/v2/resources/[id]/serve`, which performs auth,
  per-resource permission checks (`canDownloadResource`), and returns a
  5-minute presigned URL.

The serve route no longer falls back to the raw R2 URL on signed-URL
failure - it returns 500 instead. If you're bringing up a new environment,
verify the bucket policy *before* enabling uploads.

```sh
# Verify the bucket is not public
npx wrangler r2 bucket get $R2_BUCKET_NAME

# Rotate credentials: create new API token, update R2_ACCESS_KEY_ID and
# R2_SECRET_ACCESS_KEY in the Vercel project, then revoke the old token.
```

### OTP re-verification (60 days)

Enforced at three layers - keep them in sync:

1. `proxy.ts` middleware (redirects dashboard navigation).
2. `app/(dashboard)/layout.tsx` (server-render gate).
3. `requireApprovedAuth()` in `lib/auth-helpers.ts` - throws so every
   `/api/v2/*` data route returns 403 if the session is stale. (Added
   2026-05-14; previously OTP freshness was client-only.)

If you change `OTP_VALIDITY_DAYS` in `lib/auth.ts`, all three layers
read from `isOTPVerificationRequired()` so no other code needs to change.

### Rate limiting

Authentication endpoints are rate-limited via BetterAuth (`lib/auth.ts`,
`rateLimit` config). Tight per-minute caps on:

- `/sign-in/email` (5/min)
- `/email-otp/send-verification-otp` (3/min)
- `/email-otp/verify-otp` (10/min)
- `/forget-password` (3/min)

The custom signup route at `/api/v2/auth/signup` is **not** covered by
BetterAuth's limiter - if signup abuse becomes a problem, add a per-IP
throttle there.

### NAPA staff onboarding

Email domain (`@napahq.org`, `@napa-online.org`) only sets the user's
`organizationName` to the parent NAPA org at signup. It does **not** grant
admin or auto-approval - that was previously the case and was changed in
the 2026-05-14 security review to prevent fake-email auth bypass to admin.

To promote a new NAPA Board / Director:

1. The user signs up normally; they're pending.
2. An existing Board member approves them in `/admin/approvals`.
3. The Board member edits the user in `/admin/users` and sets `role` to
   `napaBoard` or `napaDirector`. The PATCH endpoint enforces that only
   existing Board members can grant Board/Director.

### Cross-org data scoping

By default, non-NAPA users see only their own org's resources, members,
audit logs, and org-leader records. The relevant helpers:

- `canViewResource(user, resourceOrg)` - enforced by `getResources` and
  `getResourceById` in `lib/services-drizzle/resources.ts`.
- `canEditResource` / `canDeleteResource` - enforced by `updateResource`
  and `deleteResource`.
- Audit log service - enforces `eq(auditLogs.organization,
  user.organizationName)` for non-NAPA users.

If you ever add a new list/detail endpoint that takes an
`organization=` query param, double-check the caller can see that org
before passing through.

### Storage location note

The legacy section above references Supabase Storage and `/api/upload`.
The codebase moved to Cloudflare R2 and `/api/v2/upload`; the Supabase
references are stale but the threat-model and validation principles
still apply.
