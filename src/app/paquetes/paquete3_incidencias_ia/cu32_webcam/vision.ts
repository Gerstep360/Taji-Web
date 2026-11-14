import type { ObjectDetection } from '@tensorflow-models/coco-ssd';

export const labels: Readonly<Record<string, string>> = {
  person: 'Persona', car: 'Automóvil', motorcycle: 'Motocicleta', dog: 'Perro',
  cat: 'Gato', bus: 'Autobús', truck: 'Camión',
};
export const guide = { x: .30, y: .62, w: .40, h: .17 };
export type Detection = { kind: string; score: number; x: number; y: number; w: number; h: number };

export async function loadDetector(): Promise<ObjectDetection> {
  const tf = await import('@tensorflow/tfjs-core');
  await import('@tensorflow/tfjs-backend-cpu');
  try {
    await import('@tensorflow/tfjs-backend-webgl');
    if (!await tf.setBackend('webgl')) await tf.setBackend('cpu');
  } catch { await tf.setBackend('cpu'); }
  await tf.ready();
  const coco = await import('@tensorflow-models/coco-ssd');
  // Angular puede envolver este paquete CommonJS en una exportación default.
  const model = typeof coco.load === 'function' ? coco : coco.default;
  try { return await model.load({ base: 'lite_mobilenet_v2' }); }
  catch (error) {
    if (tf.getBackend() === 'cpu') throw error;
    await tf.setBackend('cpu');
    return model.load({ base: 'lite_mobilenet_v2' });
  }
}

export function coversGuide(box: Detection): boolean {
  const w = Math.max(0, Math.min(box.x + box.w, guide.x + guide.w) - Math.max(box.x, guide.x));
  const h = Math.max(0, Math.min(box.y + box.h, guide.y + guide.h) - Math.max(box.y, guide.y));
  return ['car', 'motorcycle', 'bus', 'truck'].includes(box.kind) &&
    box.w >= .25 && box.h >= .23 && w * h >= guide.w * guide.h * .65;
}

export class PlateConsensus {
  private previous: { plate: string; at: number } | null = null;
  observe(plate: string | null, now: number): string | null {
    const confirmed = plate && this.previous?.plate === plate &&
      now - this.previous.at >= 1000 && now - this.previous.at <= 25_000;
    this.previous = plate ? { plate, at: now } : null;
    return confirmed ? plate : null;
  }
  reset() { this.previous = null; }
}

export class EventCooldown {
  private readonly times = new Map<string, number>();
  accept(key: string, now: number) {
    for (const [item, at] of this.times) if (now - at >= 8000) this.times.delete(item);
    if (this.times.has(key)) return false;
    this.times.set(key, now);
    return true;
  }
  reset() { this.times.clear(); }
}
