/**
 * 순수 Web Audio API 기반 셔틀런 공식 신호음 및 호흡 메트로놈 합성기
 * 외부 오디오 파일이나 네트워크 요청 없이 브라우저 내장 신디사이저로 0ms 지연 재생합니다.
 */
class ShuttleSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private volume = 0.75;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.getContext();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  private playTone(freq: number, durationSec: number, startTimeOffset = 0, type: OscillatorType = 'sine', gainScale = 1): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + startTimeOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const peakGain = Math.max(0.001, this.volume * gainScale * 0.45);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
    gain.gain.setValueAtTime(peakGain, now + Math.max(0.02, durationSec - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  }

  /**
   * 출발 전 카운트다운 비프음 (3, 2, 1: 중음 / 0(출발): 고음)
   */
  public playCountdownBeep(step: 3 | 2 | 1 | 0): void {
    if (step === 0) {
      this.playTone(1046.5, 0.42, 0, 'triangle', 1.15);
      this.playTone(1567.98, 0.42, 0, 'sine', 0.6);
    } else {
      this.playTone(587.33, 0.16, 0, 'sine', 0.85);
    }
  }

  /**
   * 공식 20m 셔틀 도착/턴 신호음
   */
  public playShuttleBeep(): void {
    this.playTone(880, 0.28, 0, 'triangle', 1.0);
    this.playTone(1318.51, 0.28, 0, 'sine', 0.55);
  }

  /**
   * 단계(Level) 상승 알림 삼중 상승 화음
   */
  public playLevelUpBeep(): void {
    this.playTone(880, 0.14, 0, 'triangle', 0.95);
    this.playTone(1108.73, 0.14, 0.11, 'triangle', 1.0);
    this.playTone(1318.51, 0.3, 0.22, 'triangle', 1.15);
  }

  /**
   * 측정 종료 알림음
   */
  public playFinishBeep(): void {
    this.playTone(783.99, 0.18, 0, 'sine', 0.9);
    this.playTone(659.25, 0.18, 0.16, 'sine', 0.9);
    this.playTone(523.25, 0.4, 0.32, 'triangle', 1.0);
  }

  /**
   * 호흡 리듬 메트로놈 큐 (들숨: 부드러운 상승음, 날숨: 부드러운 하강음)
   */
  public playBreathCue(phase: 'inhale' | 'exhale'): void {
    if (phase === 'inhale') {
      this.playTone(523.25, 0.12, 0, 'sine', 0.45);
    } else {
      this.playTone(392.0, 0.14, 0, 'sine', 0.4);
    }
  }
}

export const soundEngine = new ShuttleSoundEngine();
