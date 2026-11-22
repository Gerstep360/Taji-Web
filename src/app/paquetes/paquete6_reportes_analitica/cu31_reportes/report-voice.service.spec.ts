import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportVoiceService } from './report-voice.service';

const calls = vi.hoisted(() => ({ start: vi.fn(), pause: vi.fn(), destroy: vi.fn() }));
vi.mock('recordrtc', () => ({
  default: class {
    static StereoAudioRecorder = class {};
    startRecording() {
      calls.start();
    }
    pauseRecording() {
      calls.pause();
    }
    stopRecording(callback: () => void) {
      callback();
    }
    getBlob() {
      return new Blob([new Uint8Array(16044)], { type: 'audio/wav' });
    }
    destroy() {
      calls.destroy();
    }
  },
}));

describe('Captura multiplataforma CU31', () => {
  const track = { stop: vi.fn(), enabled: true };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const capture = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    track.enabled = true;
    capture.mockResolvedValue(stream);
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: capture, enumerateDevices: async () => [] },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('pausa a los 30 segundos sin enviar ni finalizar automáticamente', async () => {
    vi.useFakeTimers();
    const voice = new ReportVoiceService(),
      limit = vi.fn();
    voice.selectedMicrophone = 'usb';
    await voice.begin(limit);
    expect(capture.mock.calls[0][0].audio.deviceId).toEqual({ exact: 'usb' });
    vi.advanceTimersByTime(30000);
    expect(calls.pause).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledOnce();
    expect(track.enabled).toBe(false);
    expect(calls.destroy).not.toHaveBeenCalled();
    expect((await voice.finish()).type).toBe('audio/wav');
    expect(track.stop).toHaveBeenCalled();
  });

  it('libera un permiso que termina después de abandonar la página', async () => {
    let resolve!: (value: unknown) => void;
    capture.mockReturnValue(new Promise((value) => (resolve = value)));
    const voice = new ReportVoiceService();
    const pending = voice.begin(vi.fn());
    await vi.waitFor(() => expect(capture).toHaveBeenCalled());
    voice.stop();
    resolve(stream);
    expect(await pending).toBe(false);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(calls.start).not.toHaveBeenCalled();
  });
});
