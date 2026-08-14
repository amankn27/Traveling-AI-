'use client';

/**
 * Remembers whether the model-backed routes are usable.
 *
 * Without `ANTHROPIC_API_KEY` both routes answer 503. Probing them on every turn
 * costs two wasted round-trips and fills the console with errors, so the first
 * 503 latches the answer for the rest of the session.
 */

let available: boolean | null = null;

export function modelUnavailable(): boolean {
  return available === false;
}

export function markModelUnavailable(): void {
  available = false;
}

export function markModelAvailable(): void {
  available = true;
}

/** Test seam. */
export function resetModelAvailability(): void {
  available = null;
}
