'use client'

/**
 * Native file download / share for PDF reports.
 *
 * On native: fetches the PDF, writes it to the device, and opens the share sheet.
 * On web:    falls back to standard <a download> behaviour.
 */

import { isNative } from './platform'

export async function downloadPdf(url: string, filename: string): Promise<void> {
  if (!isNative()) {
    // Web fallback — standard anchor download
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ])

    // Fetch the PDF from the server
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const buffer = await response.arrayBuffer()
    const base64 = arrayBufferToBase64(buffer)

    // Write to the app's cache directory
    const writeResult = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    })

    // Open native share sheet
    await Share.share({
      title: filename,
      url: writeResult.uri,
      dialogTitle: 'Share or save PDF',
    })
  } catch (err) {
    console.error('[downloadPdf] native error:', err)
    // Last resort: open in new tab / system browser
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
