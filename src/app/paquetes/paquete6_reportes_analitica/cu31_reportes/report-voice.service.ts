import { Injectable } from '@angular/core';
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
@Injectable()
export class ReportVoiceService {
  private recognition: Recognition | null = null;
  private constructorType() {
    const w = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition;
  }
  get canDictate() {
    return window.isSecureContext && !!this.constructorType();
  }
  get canSpeak() {
    return 'speechSynthesis' in window;
  }
  listen(onText: (text: string) => void, onEnd: () => void, onError: (message: string) => void) {
    this.stop();
    const Type = this.constructorType();
    if (!this.canDictate || !Type) {
      onError(
        'El dictado necesita un navegador compatible y HTTPS o localhost. Puedes escribir la consulta.',
      );
      return;
    }
    const recognition = new Type();
    this.recognition = recognition;
    recognition.lang = 'es-ES';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) =>
      onText(
        Array.from(event.results)
          .map((r) => r[0]?.transcript || '')
          .join(' ')
          .slice(0, 500),
      );
    recognition.onend = onEnd;
    recognition.onerror = () => {
      onEnd();
      onError('No pudimos usar el micrófono. Revisa el permiso o escribe la consulta.');
    };
    try {
      recognition.start();
    } catch {
      onEnd();
      onError('El micrófono no está disponible. Puedes escribir la consulta.');
    }
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
  stop() {
    if (this.recognition) {
      this.recognition.onresult = null;
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.abort();
      this.recognition = null;
    }
  }
}
