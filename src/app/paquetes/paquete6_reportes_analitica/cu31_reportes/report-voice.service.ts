import { Injectable, signal } from '@angular/core';
import type RecordRTC from 'recordrtc';

/** Captura WAV real desde la entrada seleccionada, independiente de Web Speech. */
@Injectable()
export class ReportVoiceService {
  readonly microphones = signal<MediaDeviceInfo[]>([]);
  readonly seconds = signal(0);
  selectedMicrophone = '';
  private recorder: RecordRTC | null = null;
  private stream: MediaStream | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private generation = 0;
  get canDictate() {
    return window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;
  }
  get canSpeak() {
    return 'speechSynthesis' in window;
  }

  async loadMicrophones() {
    if (!this.canDictate)
      throw new Error('Para usar micrófonos abre Taji mediante HTTPS o localhost.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    await this.refreshMicrophones();
  }
  private async refreshMicrophones() {
    this.microphones.set(
      (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === 'audioinput',
      ),
    );
  }
  async begin(onLimit: () => void): Promise<boolean> {
    this.stop();
    const generation = this.generation;
    if (!this.canDictate)
      throw new Error(
        'El micrófono necesita HTTPS o localhost. No funciona desde una IP por HTTP.',
      );
    let stream: MediaStream | null = null;
    try {
      // Importación diferida: no carga la librería hasta solicitar dictado.
      const { default: RecordRTC } = await import('recordrtc');
      if (generation !== this.generation) return false;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(this.selectedMicrophone ? { deviceId: { exact: this.selectedMicrophone } } : {}),
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      this.stream = stream;
      this.recorder = new RecordRTC(stream, {
        type: 'audio',
        recorderType: RecordRTC.StereoAudioRecorder,
        mimeType: 'audio/wav',
        numberOfAudioChannels: 1,
        desiredSampRate: 16000,
        disableLogs: true,
      });
      this.recorder.startRecording();
      this.seconds.set(0);
      this.timer = setInterval(() => {
        this.seconds.update((value) => value + 1);
        if (this.seconds() >= 30) {
          this.clearTimer();
          this.recorder?.pauseRecording();
          this.stream?.getAudioTracks().forEach((track) => (track.enabled = false));
          onLimit();
        }
      }, 1000);
      void this.refreshMicrophones().catch(() => {});
      return true;
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (generation !== this.generation) return false;
      this.stop();
      const name = error instanceof DOMException ? error.name : '';
      const messages: Record<string, string> = {
        NotAllowedError:
          'El micrófono está bloqueado. Revisa los permisos del sitio y del sistema.',
        NotFoundError: 'No se encontró un micrófono conectado.',
        NotReadableError: 'Otra aplicación está usando el micrófono o no se puede capturar audio.',
        OverconstrainedError:
          'El micrófono seleccionado ya no está disponible. Actualiza la lista.',
      };
      throw new Error(
        messages[name] ||
          'No se pudo iniciar la grabación. Comprueba los permisos y vuelve a intentar.',
      );
    }
  }
  async finish(): Promise<Blob> {
    this.clearTimer();
    const recorder = this.recorder;
    if (!recorder) throw new Error('No hay una grabación activa.');
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('No se pudo finalizar el audio. Vuelve a grabar.')),
          5000,
        );
        recorder.stopRecording(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
      const blob = recorder.getBlob();
      if (!blob || blob.size < 8044)
        throw new Error('La grabación es muy corta. Habla durante al menos un segundo.');
      if (blob.size > 1_100_000)
        throw new Error('La grabación supera 30 segundos. Vuelve a intentarlo.');
      return blob;
    } finally {
      this.stop();
    }
  }
  stop() {
    this.generation++;
    this.clearTimer();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder?.destroy();
    this.recorder = null;
  }
  private clearTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  speak(text: string) {
    if (!this.canSpeak) return;
    this.stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    window.speechSynthesis.speak(utterance);
  }
  stopSpeaking() {
    if (this.canSpeak) window.speechSynthesis.cancel();
  }
}
