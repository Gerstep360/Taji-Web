import { describe, expect, it } from 'vitest';
import { SceneTrigger, sceneDifference } from './visual-trigger';

const black = Uint8Array.of(0, 0, 0, 0, 0, 0);
const light = Uint8Array.of(250, 245, 240, 30, 29, 28);
const subtle = Uint8Array.of(0, 0, 0, 50, 0, 0);

describe('disparador local de visión', () => {
  it('ignora ruido y espacia las escenas repetidas a cuatro minutos', () => {
    const trigger = new SceneTrigger(40_000, 150_000, 240_000);
    expect(trigger.inspect(black, 0)).toBe('initial');
    trigger.sent(black, 0);
    expect(sceneDifference(black, Uint8Array.of(2, 0, 4, 2, 1, 3))).toBe(0);
    expect(trigger.inspect(black, 150_000)).toBeNull();
    expect(trigger.inspect(black, 240_000)).toBe('periodic');
  });

  it('pide dos muestras de cambio y respeta el enfriamiento', () => {
    const trigger = new SceneTrigger(40_000, 150_000, 240_000);
    trigger.sent(black, 0);
    expect(trigger.inspect(light, 2000)).toBeNull();
    expect(trigger.inspect(light, 3000)).toBeNull();
    expect(trigger.inspect(black, 40_000)).toBeNull();
    expect(trigger.inspect(light, 41_000)).toBeNull();
    expect(trigger.inspect(light, 42_000)).toBe('change');
  });

  it('permite revisión general ante cambios leves sin clasificar objetos', () => {
    const trigger = new SceneTrigger(40_000, 150_000, 240_000);
    trigger.sent(black, 0);
    expect(trigger.inspect(subtle, 120_000)).toBeNull();
    expect(trigger.inspect(subtle, 150_000)).toBe('periodic');
  });
});
