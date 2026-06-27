import { createHmac } from 'crypto'

/**
 * Sanitize filename to prevent directory traversal and injection attacks
 * Allows only alphanumeric, dash, underscore, and dot characters
 */
export function sanitizeFilename(filename: string, maxLength: number = 255): string {
  let sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')

  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop() || ''
    const nameLength = maxLength - ext.length - (ext ? 1 : 0)
    sanitized = sanitized.slice(0, nameLength) + (ext ? '.' + ext : '')
  }

  return sanitized || 'export'
}

/**
 * Generate HMAC-SHA256 signature for exported data
 * Ensures data integrity and authenticity
 */
export function generateExportSignature(data: string | Buffer, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(data)
  return hmac.digest('hex')
}

/**
 * Verify HMAC-SHA256 signature for exported data
 */
export function verifyExportSignature(data: string | Buffer, signature: string, secret: string): boolean {
  const expected = generateExportSignature(data, secret)
  return signature === expected
}

/**
 * Build secure Content-Disposition header
 * Ensures file is downloaded as attachment, not displayed inline (prevents XSS)
 */
export function buildContentDisposition(filename: string, inline: boolean = false): string {
  const sanitized = sanitizeFilename(filename)
  const disposition = inline ? 'inline' : 'attachment'
  return `${disposition}; filename="${sanitized}"; filename*=UTF-8''${encodeURIComponent(sanitized)}`
}

/**
 * Validate MIME type against whitelist
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2)
      return mimeType.startsWith(prefix)
    }
    return mimeType === type
  })
}

/**
 * Get appropriate MIME type for file format
 */
export function getMimeTypeForFormat(format: string): string {
  const types: Record<string, string> = {
    csv: 'text/csv; charset=utf-8',
    json: 'application/json; charset=utf-8',
    pdf: 'application/pdf',
    html: 'text/html; charset=utf-8',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return types[format] || 'application/octet-stream'
}
