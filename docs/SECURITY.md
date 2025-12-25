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

#### 3. MIME Type Validation

- Files are validated to ensure the MIME type matches the file extension
- Prevents file type spoofing (e.g., renaming `malware.exe` to `document.pdf`)
- Both client-side and server-side validation

#### 4. Filename Sanitization

All filenames are sanitized to prevent:
- **Path traversal attacks**: Removes `../`, `..\\` sequences
- **Null byte injection**: Removes `\0` characters
- **Control characters**: Removes ASCII control characters
- **Special characters**: Removes `<>:"|?*` characters
- **Length limits**: Filenames truncated to 255 characters

#### 5. Server-Side Validation

All validation occurs on both client and server:
- Client-side: Immediate user feedback
- Server-side: Security enforcement (cannot be bypassed)

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
Server validates again: extension, MIME type, size, filename
    ↓
Sanitize filename
    ↓
Generate unique filename with random prefix
    ↓
Upload to Supabase Storage
```

#### Code Location

- **Validation utilities**: `/lib/utils/file-validation.ts`
- **Storage service**: `/lib/services/storage.ts`
- **Upload dialog**: `/components/UploadResourceDialog.tsx`

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
"File appears to be misnamed or corrupted. Expected application/pdf, got application/x-msdownload."
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

4. **Wrong MIME Type** ✓
   - Rename `file.exe` to `file.pdf`
   - Should detect MIME mismatch

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
