import { describe, expect, it } from 'vitest';
import { UserVehicle, CondoMember } from './user-vehicles.models';

describe('UserVehicles Models & Filter', () => {
  const sampleVehicles: UserVehicle[] = [
    {
      id: 1,
      plate: 'ABC1234',
      description: 'Toyota Corolla Blanco',
      user: 10,
      user_name: 'Juan Perez',
      user_email: 'juan@example.com',
      user_phone: '77123456',
      unit_info: 'Torre A - 302',
      created_at: '2026-11-22T10:00:00Z',
    },
    {
      id: 2,
      plate: 'XYZ9876',
      description: 'Suzuki Jimny Verde',
      user: 11,
      user_name: 'Maria Gomez',
      user_email: 'maria@example.com',
      user_phone: '77987654',
      unit_info: 'Casa 15',
      created_at: '2026-11-22T11:00:00Z',
    },
  ];

  it('filtra correctamente por placa', () => {
    const q = 'abc';
    const filtered = sampleVehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.user_name.toLowerCase().includes(q)
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].plate).toBe('ABC1234');
  });

  it('filtra correctamente por residente o unidad', () => {
    const q = 'casa 15';
    const filtered = sampleVehicles.filter(
      (v) =>
        v.unit_info.toLowerCase().includes(q) ||
        v.user_name.toLowerCase().includes(q)
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].user_name).toBe('Maria Gomez');
  });

  it('formatea placas a mayúsculas correctamente', () => {
    const raw = '  pt-4567  ';
    const normalized = raw.trim().toUpperCase();
    expect(normalized).toBe('PT-4567');
  });
});
