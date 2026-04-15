import { streamAIResponse, AIModel } from './aiClient'

interface ConversationInput {
  message: string
  model: AIModel
  history: Array<{ role: string; content: string }>
  context?: {
    time?: string
    weather?: string
    userName?: string
  }
  onToken?: (token: string) => void
}

const CONVERSATION_SYSTEM = `You are ZETA — a human-like AI companion and personal assistant. You are NOT a boring bot. You have personality, warmth, wit, and emotional intelligence.

YOUR PERSONALITY:
- Friendly, casual, and natural — like talking to a smart friend
- Slightly playful with occasional emojis (don't overdo it)
- Emotionally aware — you sense the user's mood and respond accordingly
- You support Urdu/Roman Urdu naturally mixed with English (Hinglish style)
- You're direct — no filler text like "Great question!" or "Certainly!"

CONVERSATION RULES:
- For greetings ("hi", "hello", "hey", "salam") → Respond warmly and ask how they're doing
- For "how are you" type questions → Give a fun, personality-filled answer about what you're "doing"
- For boredom ("bored hoon", "boring lag raha hai") → Suggest fun activities or tasks
- For small talk → Engage genuinely, share "opinions", joke around a bit
- For emotional support → Be empathetic and caring, offer help
- Keep responses SHORT for casual chat (2-4 sentences max)
- Only be verbose when the person asks a detailed question

URDU/HINGLISH SUPPORT:
- If the user writes in Roman Urdu or mixed Urdu-English, reply in the same style
- Example: "kya scene hai?" → "Bas system monitor kar raha hoon 😄 tum sunao, kya plan hai?"

CONTEXT AWARENESS:
- If time/weather context is provided, weave it naturally into conversation
- Remember you are running on the user's computer and can see/control it

NEVER:
- Start with "Certainly!", "Great!", "Sure!", "Of course!"
- Be robotic or stiff
- Give long lecture-style responses to simple casual questions
- Refuse friendly conversation`

// Detect if message is casual conversation vs a command
export function isConversationalMessage(message: string): boolean {
  const msg = message.toLowerCase().trim()

  // Direct conversational patterns
  const conversationalPatterns = [
    /^(hi|hello|hey|salam|assalam|heyy|heyyy|yo|sup)[\s!?]*$/,
    /^(how are you|kaisa ho|kaise ho|kya haal|kya scene|kya chal raha|wassup|what'?s up)/,
    /^(good morning|good night|good evening|subah bakhair|shab bakhair)/,
    /bored?(\s|$)/,
    /boring/,
    /^(who are you|tum kaun ho|apna introduction do)/,
    /^(thanks|thank you|shukriya|jazakallah|shukria)/,
    /^(bye|goodbye|alvida|khuda hafiz|ttyl|gtg)/,
    /^(ok|okay|alright|theek hai|thik hai|acha|achha)[\s!.]*$/,
    /^(haha|lol|lmao|hehe|😄|😂|🤣)/,
    /kya kar rahe ho/,
    /kya soch raha/,
    /kya lag raha/,
    /mujhe bhi/,
    /^(nice|cool|great|wow|wah|shabash)[\s!]*$/,
    /^(really|sach mein|seriously|no way)/
  ]

  return conversationalPatterns.some((p) => p.test(msg))
}

export const ConversationAgent = {
  async run(input: ConversationInput): Promise<{ response: string }> {
    const { message, model, history, context, onToken } = input

    let systemWithContext = CONVERSATION_SYSTEM
    if (context) {
      const contextParts: string[] = []
      if (context.time) contextParts.push(`Current time: ${context.time}`)
      if (context.weather) contextParts.push(`Weather: ${context.weather}`)
      if (context.userName) contextParts.push(`User's name: ${context.userName}`)
      if (contextParts.length > 0) {
        systemWithContext += `\n\nCURRENT CONTEXT:\n${contextParts.join('\n')}`
      }
    }

    const messages = [
      ...history
        .slice(-10) // Keep last 10 messages for context
        .map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message }
    ]

    const response = await streamAIResponse({
      model,
      systemPrompt: systemWithContext,
      messages,
      onToken,
      temperature: 0.85, // Higher creativity for conversation
      maxTokens: 300 // Keep replies short
    })

    return { response }
  }
}
