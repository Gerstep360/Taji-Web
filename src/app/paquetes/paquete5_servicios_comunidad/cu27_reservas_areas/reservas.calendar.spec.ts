import { describe, expect, it } from 'vitest';

import { addDays, fromDateKey, layoutDay, localDateTimeToIso, startOfWeek, toDateKey, toTimeKey } from './reservas.calendar';

const day = new Date(2026, 10, 25); // miércoles 25/11/2026
const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m);

describe('reservas.calendar', () => {
  it('calcula el lunes de la semana y las claves de fecha', () => {
    expect(toDateKey(startOfWeek(day))).toBe('2026-11-23');
    expect(toDateKey(startOfWeek(new Date(2026, 10, 29)))).toBe('2026-11-23'); // domingo
    expect(toDateKey(addDays(day, 7))).toBe('2026-12-02');
    expect(toDateKey(fromDateKey('2026-01-05'))).toBe('2026-01-05');
  });

  it('convierte fecha y hora locales a ISO sin perder la hora', () => {
    const iso = localDateTimeToIso('2026-11-25', '14:30');
    expect(toTimeKey(new Date(iso))).toBe('14:30');
    expect(toDateKey(new Date(iso))).toBe('2026-11-25');
  });

  it('ubica eventos cruzados en carriles distintos y los separados en uno solo', () => {
    const items = [
      { key: 'a', start: at(10), end: at(12), data: 'a' },
      { key: 'b', start: at(11), end: at(13), data: 'b' },
      { key: 'c', start: at(15), end: at(16), data: 'c' },
    ];
    const result = layoutDay(items, day, 8 * 60, 22 * 60);
    const byKey = Object.fromEntries(result.map(item => [item.key, item]));
    expect(byKey['a'].lanes).toBe(2);
    expect(byKey['b'].lanes).toBe(2);
    expect(byKey['a'].lane).not.toBe(byKey['b'].lane);
    expect(byKey['c'].lanes).toBe(1);
    expect(byKey['a'].top).toBe(120);
    expect(byKey['a'].height).toBe(120);
  });

  it('recorta eventos que salen del rango visible o de otros días', () => {
    const items = [
      { key: 'early', start: at(6), end: at(9), data: 1 },
      { key: 'other-day', start: new Date(2026, 10, 26, 10), end: new Date(2026, 10, 26, 11), data: 2 },
    ];
    const result = layoutDay(items, day, 8 * 60, 22 * 60);
    expect(result.map(item => item.key)).toEqual(['early']);
    expect(result[0].top).toBe(0);
    expect(result[0].height).toBe(60);
  });
});
