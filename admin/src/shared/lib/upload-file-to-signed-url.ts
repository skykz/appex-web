export async function uploadFileToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const body = new FormData()
  body.append('cacheControl', '3600')
  body.append('', file)

  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body,
  })

  if (!response.ok) {
    throw new Error('Could not upload file. Please try again.')
  }
}
