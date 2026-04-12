import screenshot from 'screenshot-desktop'
import Tesseract from 'tesseract.js'

type ScreenAction = 'screenshot' | 'ocr'

interface ScreenPayload {
  imagePath?: string
}

export async function handleScreenCapture(
  action: ScreenAction,
  payload?: ScreenPayload
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'screenshot': {
        const imgBuffer = await screenshot({ format: 'png' })
        const base64 = imgBuffer.toString('base64')
        return { success: true, data: `data:image/png;base64,${base64}` }
      }

      case 'ocr': {
        // Capture screen then run OCR
        const imgBuffer = await screenshot({ format: 'png' })
        const result = await Tesseract.recognize(imgBuffer, 'eng', {
          logger: () => {} // Silence verbose logs
        })
        return { success: true, data: result.data.text }
      }

      default:
        return { success: false, error: `Unknown screen action: ${action}` }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error(`[ScreenCapture:${action}] Error:`, errMsg)
    return { success: false, error: errMsg }
  }
}
