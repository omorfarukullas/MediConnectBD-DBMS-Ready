# Uploaded Files Directory

This directory stores medical documents uploaded by patients through the platform.

## Security Notes:
- Files are validated on upload (PDF, DOC, DOCX, JPG, PNG only)
- Maximum file size: 10MB
- Only authenticated users can upload files
- Users can only access their own documents
- Doctors/admins can view patient documents
- Files are served statically at `/uploads` endpoint

## File Naming:
- Format: `{timestamp}-{randomNumber}-{originalFilename}`
- Example: `1701648000000-123456789-lab-report.pdf`

## Backup:
Ensure this directory is included in regular backups for data protection.
