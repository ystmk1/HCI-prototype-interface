// Google Cloud Text-to-Speech client. Speaks Korean autopilot status +
// sequence narration aloud — no chat bubbles, voice-only per the sequence
// design. API key comes from VITE_GOOGLE_TTS_API_KEY (see .env.example).
//
// Single-playback guard: a new speakText() call interrupts whatever is
// currently playing AND invalidates any earlier in-flight fetch so two
// utterances never overlap.

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'

export const DEFAULT_SPEAKING_RATE = 1.15

let currentAudio = null
let currentUrl = null
let playSeq = 0

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.onended = null
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
}

/**
 * Sends text to Google Cloud TTS and plays the returned MP3 audio.
 * Stops any previous/in-flight utterance so voices never overlap.
 */
export async function speakText(text, apiKey, speakingRate = DEFAULT_SPEAKING_RATE) {
  if (!text || !apiKey) return
  // Claim this call as the latest and silence anything already playing.
  const seq = ++playSeq
  stopSpeaking()

  const res = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: 'ko-KR',
        name: 'ko-KR-Wavenet-A',
        ssmlGender: 'FEMALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate,
        pitch: 0,
      },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`TTS ${res.status}: ${body.error?.message ?? 'unknown'}`)
  }

  const { audioContent } = await res.json()
  if (!audioContent) return

  // A newer call started while this fetch was in flight → discard this one.
  if (seq !== playSeq) return

  const raw = atob(audioContent)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)

  const blob = new Blob([bytes], { type: 'audio/mp3' })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  currentUrl = url
  audio.play().catch(console.error)
  audio.onended = () => {
    if (currentAudio === audio) {
      URL.revokeObjectURL(url)
      currentAudio = null
      currentUrl = null
    }
  }
  return audio
}
