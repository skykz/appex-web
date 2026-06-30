/**
 * Reads a user-selected file as a raw base64 string (no data-URL prefix).
 */
export async function readFileAsBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read file.'))
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })

  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Could not read file.')
  return dataUrl.slice(comma + 1)
}
