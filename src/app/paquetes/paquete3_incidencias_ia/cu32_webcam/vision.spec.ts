import { describe, expect, it } from 'vitest';
import { coversGuide, EventCooldown, PlateConsensus } from './vision';

describe('CU32', () => {
  it('solo permite OCR para un vehículo que cubre la guía', () => {
    const box = { x: .2, y: .3, w: .6, h: .55, score: .9, kind: 'car' };
    expect(coversGuide(box)).toBe(true);
    expect(coversGuide({ ...box, kind: 'dog' })).toBe(false);
    expect(coversGuide({ ...box, w: .1 })).toBe(false);
  });
  it('confirma dos lecturas separadas y no promueve una lectura ambigua', () => {
    const votes = new PlateConsensus();
    expect(votes.observe('A001', 0)).toBeNull();
    expect(votes.observe('A00I', 11000)).toBeNull();
    expect(votes.observe('A00I', 22000)).toBe('A00I');
    votes.reset();
    expect(votes.observe('A00I', 33000)).toBeNull();
    expect(votes.observe(null, 44000)).toBeNull();
  });
  it('no registra el mismo perro en cada inferencia', () => {
    const gate = new EventCooldown();
    expect(gate.accept('dog', 0)).toBe(true);
    expect(gate.accept('dog', 300)).toBe(false);
    expect(gate.accept('dog', 8000)).toBe(true);
  });
});
