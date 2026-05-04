/** Default cap for inlined lesson/catalog images (~350KB file before base64). */
const MAX_IMAGE_BYTES = 360 * 1024

/**
 * Reads a user-selected image file as a `data:image/...;base64,...` string for storing in JSON.
 * @throws When the file is not an image or exceeds {@link MAX_IMAGE_BYTES}.
 */
export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (PNG, JPEG, WebP, or GIF).')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image must be ${Math.round(MAX_IMAGE_BYTES / 1024)}KB or smaller.`)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read file.'))
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
