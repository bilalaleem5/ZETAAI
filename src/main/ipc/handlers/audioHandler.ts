import { IpcMain } from 'electron'
import Groq from 'groq-sdk'
import { join } from 'path'
import { writeFileSync, unlinkSync } from 'fs'
import { app } from 'electron'

export function handleAudioTranscribe(ipcMain: IpcMain) {
  ipcMain.handle('audio:transcribe', async (_, payload: { base64Audio: string }) => {
    try {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey) throw new Error('GROQ_API_KEY missing from VAULT.')

      const groq = new Groq({ apiKey })
      
      // Convert base64 back into binary buffer
      const audioBuffer = Buffer.from(payload.base64Audio, 'base64')
      
      // Write to a temporary file because groq.audio needs a valid filesystem readstream in node
      const tempPath = join(app.getPath('temp'), `zeta_audio_${Date.now()}.webm`)
      writeFileSync(tempPath, audioBuffer)

      // Use a standard Node stream since File is tricky in native node
      const fs = require('fs')
      const stream = fs.createReadStream(tempPath)

      const transcription = await groq.audio.transcriptions.create({
        file: stream,
        model: 'whisper-large-v3',
        language: 'en'
      })

      // Clean up temp file
      try { unlinkSync(tempPath) } catch {}

      const result = transcription.text.trim()
      console.log('[WhisperSTT] Transcribed:', result)
      return { success: true, text: result }
    } catch (err) {
      console.error('[WhisperSTT] error:', err)
      return { success: false, error: String(err) }
    }
  })
}
