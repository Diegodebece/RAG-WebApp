// Text extraction in the browser: the server never receives files, only their text. pdf.js and mammoth are
// large, so each one is loaded only when a file of its kind is read.

export type Extracted = {
  text: string
  // PDFs only: used to tell a scanned document (little text per page) from a short one
  pages: number | null
}

export type ReadProgress = { page: number; pages: number }

export class UnreadableFileError extends Error {}

const extension = (name: string) => name.toLowerCase().slice(name.lastIndexOf('.'))

async function extractPdf(file: File, onProgress: (progress: ReadProgress) => void): Promise<Extracted> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await loading.promise
  try {
    const pages: string[] = []
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress({ page: number, pages: pdf.numPages })
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      // each item is a run of text; hasEOL marks where the line ends in the document
      pages.push(content.items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : '') : '')).join(''))
      page.cleanup()
    }
    return { text: pages.join('\n\n'), pages: pdf.numPages }
  } finally {
    // frees the worker's copy of the document
    void loading.destroy()
  }
}

async function extractDocx(file: File): Promise<Extracted> {
  const { default: mammoth } = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return { text: result.value, pages: null }
}

export async function extractText(file: File, onProgress: (progress: ReadProgress) => void): Promise<Extracted> {
  try {
    switch (extension(file.name)) {
      case '.pdf':
        return await extractPdf(file, onProgress)
      case '.docx':
        return await extractDocx(file)
      default:
        return { text: await file.text(), pages: null }
    }
  } catch (error) {
    // a damaged, password-protected or mislabeled file
    throw new UnreadableFileError(error instanceof Error ? error.message : String(error))
  }
}

// The API's limits on what it accepts.
export const MAX_TEXT_LENGTH = 200_000
const MAX_FILENAME_LENGTH = 255
// Below this many characters per page, a PDF is most likely scanned images rather than text.
const SCANNED_CHARS_PER_PAGE = 100

export function looksScanned({ text, pages }: Extracted): boolean {
  return pages !== null && text.trim().length / pages < SCANNED_CHARS_PER_PAGE
}

// The API rejects names with control or text-direction characters: they are removed here instead, and a long
// name is shortened while keeping its extension.
export function cleanFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = name.replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, '').trim() || 'document'
  if (cleaned.length <= MAX_FILENAME_LENGTH) {
    return cleaned
  }
  const ext = extension(cleaned)
  return cleaned.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext
}
