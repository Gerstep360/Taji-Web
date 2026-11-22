/** Tiny, class-agnostic scene comparison. A stable threshold needs two samples. */
export class SceneTrigger {
  private reference?: Uint8Array;
  private strikes = 0;
  private lastSent = 0;
  private changed = false;

  constructor(private readonly cooldownMs: number, private readonly periodicMs: number,
    private readonly idleMs: number) {}

  inspect(sample: Uint8Array, now: number): 'initial' | 'change' | 'periodic' | null {
    if (!this.reference) return 'initial';
    const since = now - this.lastSent;
    const difference = sceneDifference(this.reference, sample);
    this.changed ||= difference >= .09;
    this.strikes = difference >= .18 ? this.strikes + 1 : 0;
    if (since < this.cooldownMs) return null;
    if (this.strikes >= 2) return 'change';
    if (since >= (this.changed ? this.periodicMs : this.idleMs)) return 'periodic';
    return null;
  }

  sent(sample: Uint8Array, now: number) {
    this.reference = sample.slice();
    this.lastSent = now;
    this.strikes = 0;
    this.changed = false;
  }
}

export function sceneDifference(before: Uint8Array, after: Uint8Array) {
  if (!before.length || before.length !== after.length) return 0;
  let changes = 0;
  for (let i = 0; i < before.length; i++) if (Math.abs(before[i] - after[i]) >= 32) changes++;
  return changes / before.length;
}
