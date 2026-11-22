import { VisionMode } from './visual-api';

const MP4 = 'video/mp4;codecs=avc1.42001f';

export function canRecordMp4() {
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(MP4) &&
    'captureStream' in HTMLCanvasElement.prototype;
}

function canvasFor(video: HTMLVideoElement) {
  if (video.paused || !video.videoWidth || !video.videoHeight) throw new Error('No hay imagen de la cámara.');
  const scale = Math.min(1, 640 / video.videoWidth, 480 / video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, 2 * Math.floor(video.videoWidth * scale / 2));
  canvas.height = Math.max(16, 2 * Math.floor(video.videoHeight * scale / 2));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la captura.');
  const draw = () => ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  draw();
  return { canvas, draw };
}

export type Frame = { data: ImageData; at: number };

export class SceneSampler {
  private readonly small = document.createElement('canvas');
  private readonly smallContext: CanvasRenderingContext2D;
  private readonly frames: Frame[] = [];
  private readonly buffer?: ReturnType<typeof canvasFor>;
  private readonly bufferContext?: CanvasRenderingContext2D;

  constructor(private readonly video: HTMLVideoElement, mode: VisionMode) {
    this.small.width = 24; this.small.height = 16;
    this.smallContext = this.small.getContext('2d', { willReadFrequently: true })!;
    if (mode === 'video') {
      this.buffer = canvasFor(video);
      // Keep the ring small; only selected windows are encoded and uploaded.
      if (this.buffer.canvas.width > 320) {
        this.buffer.canvas.height = Math.max(16, 2 * Math.floor(this.buffer.canvas.height * 160 / this.buffer.canvas.width));
        this.buffer.canvas.width = 320;
      }
      this.bufferContext = this.buffer.canvas.getContext('2d')!;
    }
  }

  sample(now: number, scan: boolean): Uint8Array | null {
    if (!this.video.videoWidth || this.video.paused) return null;
    if (this.buffer && this.bufferContext) {
      this.buffer.draw();
      const { width, height } = this.buffer.canvas;
      this.frames.push({ data: this.bufferContext.getImageData(0, 0, width, height), at: now });
      if (this.frames.length > 24) this.frames.shift();
    }
    if (!scan) return null;
    this.smallContext.drawImage(this.video, 0, 0, 24, 16);
    const rgba = this.smallContext.getImageData(0, 0, 24, 16).data;
    const rgb = new Uint8Array(24 * 16 * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4) {
      rgb[j++] = rgba[i]; rgb[j++] = rgba[i + 1]; rgb[j++] = rgba[i + 2];
    }
    return rgb;
  }

  window() { return this.frames.length === 24 ? this.frames.slice() : null; }
  clear() { this.frames.length = 0; }
}

export function capture(video: HTMLVideoElement, mode: VisionMode, signal: AbortSignal, frames?: Frame[]): Promise<Blob> {
  if (mode === 'image') {
    const { canvas } = canvasFor(video);
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob && !signal.aborted ? resolve(blob)
      : reject(new Error('No se pudo capturar la imagen.')), 'image/jpeg', .72));
  }
  if (!canRecordMp4() || frames?.length !== 24) return Promise.reject(new Error('No hay una ventana MP4 disponible.'));
  const canvas = document.createElement('canvas');
  canvas.width = frames[0].data.width; canvas.height = frames[0].data.height;
  const context = canvas.getContext('2d')!;
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(4);
    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(stream, { mimeType: MP4, videoBitsPerSecond: 460_000 }); }
    catch (error) { stream.getTracks().forEach(track => track.stop()); reject(error); return; }
    const chunks: Blob[] = [];
    let interval: number | undefined;
    let timer: number | undefined;
    const cleanup = () => {
      clearInterval(interval); clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      stream.getTracks().forEach(track => track.stop());
    };
    const abort = () => {
      if (recorder.state !== 'inactive') recorder.stop();
      cleanup();
      reject(new Error('Captura cancelada.'));
    };
    recorder.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
    recorder.onerror = abort;
    recorder.onstop = () => {
      cleanup();
      if (!signal.aborted) resolve(new Blob(chunks, { type: 'video/mp4' }));
    };
    signal.addEventListener('abort', abort, { once: true });
    try {
      if (signal.aborted) { abort(); return; }
      let index = 0;
      context.putImageData(frames[index++].data, 0, 0);
      recorder.start();
      interval = window.setInterval(() => {
        if (video.paused || document.hidden) { abort(); return; }
        if (index < frames.length) context.putImageData(frames[index++].data, 0, 0);
      }, 250);
      timer = window.setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 6000);
    } catch (error) { cleanup(); reject(error); }
  });
}
