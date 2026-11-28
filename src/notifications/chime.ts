/**
 * The new-order chime. Browsers refuse to start audio before the staff member
 * has interacted with the page, so the context is created on the first click or
 * key press and reused afterwards. Muting is a preference, stored next to the
 * other dashboard settings.
 */
const MUTE_KEY = 'nawy-notifications-muted'

let context: AudioContext | null = null

type AudioContextCtor = typeof AudioContext

function audioCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null
  const ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  return ctor ?? null
}

/** Called on the first gesture; a no-op when the browser has no Web Audio. */
export function unlockAudio(): void {
  const Ctor = audioCtor()
  if (!Ctor) return
  try {
    context ??= new Ctor()
    if (context.state === 'suspended') void context.resume()
  } catch {
    context = null
  }
}

export type ChimeKind = 'order' | 'proof'

// A new order rises (two sine notes); a payment proof falls (three softer
// triangle notes), so the cashier can tell them apart without looking.
export const CHIME_NOTES: Record<ChimeKind, { type: OscillatorType; frequencies: number[]; step: number; peak: number }> = {
  order: { type: 'sine', frequencies: [880, 1320], step: 0.18, peak: 0.16 },
  proof: { type: 'triangle', frequencies: [988, 784, 659], step: 0.16, peak: 0.14 },
}

/** Short notes, quiet enough for a busy counter. */
export function playChime(kind: ChimeKind = 'order'): void {
  if (!context || context.state !== 'running') return
  const now = context.currentTime
  const { type, frequencies, step, peak } = CHIME_NOTES[kind]
  for (const [index, frequency] of frequencies.entries()) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    const start = now + index * step
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + step - 0.02)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + step)
  }
}

export function chimeKindFor(type: string): ChimeKind {
  return type === 'PaymentProofSubmitted' ? 'proof' : 'order'
}

export function readMuted(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): boolean {
  try {
    return storage?.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeMuted(muted: boolean, storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): void {
  try {
    storage?.setItem(MUTE_KEY, muted ? 'true' : 'false')
  } catch {
    // A blocked storage keeps the toggle for this visit only.
  }
}
