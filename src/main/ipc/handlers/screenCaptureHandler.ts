import screenshot from 'screenshot-desktop'

type ScreenAction = 'screenshot' | 'ocr'

export async function handleScreenCapture(
  action: ScreenAction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload?: unknown
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (action) {
      case 'screenshot': {
        const imgBuffer = await screenshot({ format: 'png' })
        const base64 = (imgBuffer as Buffer).toString('base64')
        return { success: true, data: `data:image/png;base64,${base64}` }
      }

      case 'ocr': {
        const imgBuffer = await screenshot({ format: 'png' })
        // Dynamic import Tesseract to avoid bundling issues
        const Tesseract = (await import('tesseract.js')).default
        const result = await Tesseract.recognize(imgBuffer as Buffer, 'eng', {
          logger: () => {}
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
