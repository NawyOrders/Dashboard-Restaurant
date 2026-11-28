import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHIME_NOTES, chimeKindFor, playChime, unlockAudio } from './chime'

describe('chime kinds', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('maps payment proofs to their own tone and everything else to the order tone', () => {
    expect(chimeKindFor('PaymentProofSubmitted')).toBe('proof')
    expect(chimeKindFor('OrderPlaced')).toBe('order')
  })

  it('the two tones differ in shape and notes', () => {
    expect(CHIME_NOTES.proof.frequencies).not.toEqual(CHIME_NOTES.order.frequencies)
    expect(CHIME_NOTES.proof.type).not.toBe(CHIME_NOTES.order.type)
  })

  it('plays the notes of the requested kind', () => {
    const started: Array<{ type: string; frequency: number }> = []
    class FakeContext {
      state = 'running'
      currentTime = 0
      destination = {}
      resume() {}
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (next: unknown) => next }
      }
      createOscillator() {
        const osc = { type: '', frequency: { value: 0 }, connect: () => ({ connect: () => ({}) }), start() { started.push({ type: osc.type, frequency: osc.frequency.value }) }, stop() {} }
        return osc
      }
    }
    vi.stubGlobal('window', { AudioContext: FakeContext })
    unlockAudio()
    playChime('proof')
    playChime()
    expect(started.slice(0, 3)).toEqual(CHIME_NOTES.proof.frequencies.map((frequency) => ({ type: 'triangle', frequency })))
    expect(started.slice(3)).toEqual(CHIME_NOTES.order.frequencies.map((frequency) => ({ type: 'sine', frequency })))
  })
})
