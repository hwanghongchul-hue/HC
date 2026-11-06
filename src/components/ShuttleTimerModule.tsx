import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Bell,
  Save,
  ArrowRightLeft,
} from 'lucide-react';
import {
  SHUTTLE_LEVEL_TABLE,
  calculateEstimatedVO2Max,
  type ShuttleLevelSpec,
} from '../data/shuttleData';
import { soundEngine } from '../utils/soundEngine';

interface ShuttleTimerModuleProps {
  onCompleteAndSave: (result: { level: number; totalShuttles: number }) => void;
}

type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

export const ShuttleTimerModule: React.FC<ShuttleTimerModuleProps> = ({ onCompleteAndSave }) => {
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [startLevel, setStartLevel] = useState<number>(1);
  const [countdownVal, setCountdownVal] = useState<number>(3);

  // 현재 측정 상태
  const [levelIdx, setLevelIdx] = useState<number>(0); // 0-based index in SHUTTLE_LEVEL_TABLE
  const [shuttleInLevel, setShuttleInLevel] = useState<number>(1); // 1-based within level
  const [completedShuttles, setCompletedShuttles] = useState<number>(0);
  const [shuttleProgress, setShuttleProgress] = useState<number>(0); // 0 ~ 1
  const [remainingSec, setRemainingSec] = useState<number>(SHUTTLE_LEVEL_TABLE[0].shuttleDurationSec);

  // 오디오 컨트롤 상태
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);

  // 고정밀 타이머 Refs
  const rafRef = useRef<number | null>(null);
  const shuttleStartTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const levelIdxRef = useRef<number>(0);
  const shuttleInLevelRef = useRef<number>(1);
  const completedShuttlesRef = useRef<number>(0);

  const currentSpec: ShuttleLevelSpec = SHUTTLE_LEVEL_TABLE[levelIdx] || SHUTTLE_LEVEL_TABLE[0];

  // 시작 단계 변경 시 대기 상태 초기화
  const handleSelectStartLevel = (lvl: number) => {
    if (status !== 'idle' && status !== 'finished') return;
    const idx = Math.max(0, Math.min(SHUTTLE_LEVEL_TABLE.length - 1, lvl - 1));
    const prevCumulative = idx === 0 ? 0 : SHUTTLE_LEVEL_TABLE[idx - 1].cumulativeShuttles;

    setStartLevel(lvl);
    setLevelIdx(idx);
    setShuttleInLevel(1);
    setCompletedShuttles(prevCumulative);
    setShuttleProgress(0);
    setRemainingSec(SHUTTLE_LEVEL_TABLE[idx].shuttleDurationSec);
    setStatus('idle');

    levelIdxRef.current = idx;
    shuttleInLevelRef.current = 1;
    completedShuttlesRef.current = prevCumulative;
    pausedElapsedRef.current = 0;
  };

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // 메인 60fps 타이머 루프
  const runTimerLoop = useCallback(() => {
    const now = performance.now();
    const spec = SHUTTLE_LEVEL_TABLE[levelIdxRef.current];
    const durationMs = spec.shuttleDurationSec * 1000;
    const elapsedMs = now - shuttleStartTimeRef.current;

    if (elapsedMs >= durationMs) {
      // 현재 셔틀 완료
      const nextCompleted = completedShuttlesRef.current + 1;
      completedShuttlesRef.current = nextCompleted;
      setCompletedShuttles(nextCompleted);

      if (shuttleInLevelRef.current < spec.shuttlesInLevel) {
        // 같은 단계 내 다음 셔틀
        const nextShuttle = shuttleInLevelRef.current + 1;
        shuttleInLevelRef.current = nextShuttle;
        setShuttleInLevel(nextShuttle);
        soundEngine.playShuttleBeep();
      } else {
        // 다음 단계(Level)로 상승
        if (levelIdxRef.current < SHUTTLE_LEVEL_TABLE.length - 1) {
          const nextIdx = levelIdxRef.current + 1;
          levelIdxRef.current = nextIdx;
          shuttleInLevelRef.current = 1;
          setLevelIdx(nextIdx);
          setShuttleInLevel(1);
          soundEngine.playLevelUpBeep();
        } else {
          // 21단계 완주
          soundEngine.playFinishBeep();
          setShuttleProgress(1);
          setRemainingSec(0);
          setStatus('finished');
          return;
        }
      }

      // 초과된 밀리초를 보정하여 드리프트 방지
      const overflowMs = elapsedMs - durationMs;
      shuttleStartTimeRef.current = now - overflowMs;
      const newSpec = SHUTTLE_LEVEL_TABLE[levelIdxRef.current];
      const newDurationMs = newSpec.shuttleDurationSec * 1000;
      setShuttleProgress(Math.min(1, overflowMs / newDurationMs));
      setRemainingSec(Math.max(0, Number(((newDurationMs - overflowMs) / 1000).toFixed(2))));
    } else {
      const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
      const rem = Math.max(0, (durationMs - elapsedMs) / 1000);
      setShuttleProgress(progress);
      setRemainingSec(Number(rem.toFixed(2)));
    }

    rafRef.current = requestAnimationFrame(runTimerLoop);
  }, []);

  // 카운트다운 효과
  useEffect(() => {
    if (status !== 'countdown') return;

    if (countdownVal > 0) {
      soundEngine.playCountdownBeep(countdownVal as 3 | 2 | 1);
      const timer = window.setTimeout(() => {
        setCountdownVal((prev) => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    } else {
      // 출발!
      soundEngine.playCountdownBeep(0);
      shuttleStartTimeRef.current = performance.now();
      pausedElapsedRef.current = 0;
      setStatus('running');
      rafRef.current = requestAnimationFrame(runTimerLoop);
    }
  }, [status, countdownVal, runTimerLoop]);

  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  const handleStart = () => {
    soundEngine.unlock();
    if (status === 'idle' || status === 'finished') {
      const idx = Math.max(0, Math.min(SHUTTLE_LEVEL_TABLE.length - 1, startLevel - 1));
      const prevCumulative = idx === 0 ? 0 : SHUTTLE_LEVEL_TABLE[idx - 1].cumulativeShuttles;
      levelIdxRef.current = idx;
      shuttleInLevelRef.current = 1;
      completedShuttlesRef.current = prevCumulative;

      setLevelIdx(idx);
      setShuttleInLevel(1);
      setCompletedShuttles(prevCumulative);
      setShuttleProgress(0);
      setRemainingSec(SHUTTLE_LEVEL_TABLE[idx].shuttleDurationSec);
      setCountdownVal(3);
      setStatus('countdown');
    } else if (status === 'paused') {
      shuttleStartTimeRef.current = performance.now() - pausedElapsedRef.current;
      setStatus('running');
      rafRef.current = requestAnimationFrame(runTimerLoop);
    }
  };

  const handlePause = () => {
    if (status !== 'running') return;
    stopRaf();
    pausedElapsedRef.current = performance.now() - shuttleStartTimeRef.current;
    setStatus('paused');
  };

  const handleFinish = () => {
    stopRaf();
    soundEngine.playFinishBeep();
    setStatus('finished');
  };

  const handleReset = () => {
    stopRaf();
    const idx = Math.max(0, Math.min(SHUTTLE_LEVEL_TABLE.length - 1, startLevel - 1));
    const prevCumulative = idx === 0 ? 0 : SHUTTLE_LEVEL_TABLE[idx - 1].cumulativeShuttles;
    levelIdxRef.current = idx;
    shuttleInLevelRef.current = 1;
    completedShuttlesRef.current = prevCumulative;
    pausedElapsedRef.current = 0;

    setLevelIdx(idx);
    setShuttleInLevel(1);
    setCompletedShuttles(prevCumulative);
    setShuttleProgress(0);
    setRemainingSec(SHUTTLE_LEVEL_TABLE[idx].shuttleDurationSec);
    setStatus('idle');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMuted(next);
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    soundEngine.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
  };

  // 현재 왕복 방향 (홀수 셔틀: 0m -> 20m, 짝수 셔틀: 20m -> 0m)
  const isForward = (completedShuttles + 1) % 2 === 1;
  const runnerPercent = isForward ? shuttleProgress * 100 : (1 - shuttleProgress) * 100;
  const totalDistanceM = completedShuttles * 20;
  const estimatedVo2 = calculateEstimatedVO2Max(currentSpec.speedKmH, 14);

  return (
    <div className="space-y-6">
      {/* 상단 섹션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] mb-1">
            03. Web Audio API 공식 신호음 및 실시간 페이스 계기판
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            인터랙티브 셔틀런 측정기
          </h2>
        </div>

        {/* 오디오 및 시작 단계 설정 바 */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#151C2C] border border-[#E9ECEF] dark:border-[#232E44]">
            <label htmlFor="start-level-select" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              시작 단계
            </label>
            <select
              id="start-level-select"
              value={startLevel}
              disabled={status === 'running' || status === 'paused' || status === 'countdown'}
              onChange={(e) => handleSelectStartLevel(Number(e.target.value))}
              className="text-xs font-mono-tabular font-semibold bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {SHUTTLE_LEVEL_TABLE.slice(0, 12).map((lvl) => (
                <option key={lvl.level} value={lvl.level} className="bg-white dark:bg-[#151C2C]">
                  {lvl.level}단계 ({lvl.speedKmH.toFixed(1)} km/h)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playShuttleBeep();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#151C2C] border border-[#E9ECEF] dark:border-[#232E44] text-slate-700 dark:text-slate-300 hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
            신호음 테스트
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#151C2C] border border-[#E9ECEF] dark:border-[#232E44]">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? '음소거 해제' : '음소거'}
              className="text-slate-700 dark:text-slate-300 hover:text-[#0284C7] cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-[#DC2626]" /> : <Volume2 className="w-4 h-4 text-[#0284C7]" />}
            </button>
            <input
              type="range"
              aria-label="신호음 음량"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-16 accent-[#0284C7] cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 메인 계기판 및 20m 트랙 시뮬레이터 */}
      <div className="surface-card rounded-xl p-6 md:p-8 space-y-8">
        {/* 상단 상태 요약 및 페이스 안내 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#E9ECEF] dark:border-[#232E44]">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">
              {status === 'idle' && '측정 준비 완료'}
              {status === 'countdown' && `출발 ${countdownVal}초 전`}
              {status === 'running' && '측정 진행 중'}
              {status === 'paused' && '일시정지됨'}
              {status === 'finished' && '측정 완료'}
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-slate-600 dark:text-slate-400">{currentSpec.phaseLabel}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
            <span>
              {isForward ? '진행 방향: 출발선(0m) → 반환점(20m)' : '진행 방향: 반환점(20m) → 출발선(0m)'}
            </span>
          </div>
        </div>

        {/* 4대 핵심 계기판 지표 (Tabular Numerals) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
            <p className="text-xs text-slate-500 dark:text-slate-400">현재 단계 (Level)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl md:text-4xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                {currentSpec.level}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-mono-tabular">
                단계 ({shuttleInLevel}/{currentSpec.shuttlesInLevel}회)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
            <p className="text-xs text-slate-500 dark:text-slate-400">누적 왕복 횟수 (Shuttles)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl md:text-4xl font-bold font-mono-tabular text-[#0284C7] dark:text-[#38BDF8]">
                {completedShuttles}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">회 완료</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
            <p className="text-xs text-slate-500 dark:text-slate-400">누적 달리기 거리</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl md:text-4xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                {totalDistanceM.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">m</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
            <p className="text-xs text-slate-500 dark:text-slate-400">현재 페이스 및 예상 VO2max</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl md:text-3xl font-bold font-mono-tabular text-[#059669] dark:text-[#34D399]">
                {currentSpec.speedKmH.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                km/h · {estimatedVo2}
              </span>
            </div>
          </div>
        </div>

        {/* 실시간 20m 왕복 트랙 비주얼라이저 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="font-semibold text-slate-700 dark:text-slate-300">출발선 (0m)</span>
            <span className="text-sm font-bold text-[#0284C7] dark:text-[#38BDF8]">
              {status === 'countdown'
                ? `준비하세요... ${countdownVal}`
                : `다음 신호음까지 ${remainingSec.toFixed(2)}초 (기준 ${currentSpec.shuttleDurationSec.toFixed(2)}초)`}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">반환점 (20m)</span>
          </div>

          {/* 트랙 레일 */}
          <div className="relative h-14 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44] px-5 flex items-center">
            {/* 5m 간격 눈금선 */}
            <div className="absolute inset-x-5 flex justify-between pointer-events-none">
              {[0, 5, 10, 15, 20].map((m) => (
                <div key={m} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />
                  <span className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">{m}m</span>
                </div>
              ))}
            </div>

            {/* 진행 바 */}
            <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0284C7] dark:bg-[#38BDF8] transition-none"
                style={{ width: `${shuttleProgress * 100}%` }}
              />
            </div>

            {/* 실시간 러너 마커 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0284C7] dark:bg-[#38BDF8] text-white dark:text-slate-950 font-mono-tabular text-xs font-bold flex items-center justify-center shadow-md pointer-events-none"
              style={{ left: `calc(20px + (100% - 40px) * ${runnerPercent / 100})` }}
            >
              {isForward ? '→' : '←'}
            </div>
          </div>
        </div>

        {/* 컨트롤 버튼 영역 */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            {(status === 'idle' || status === 'paused' || status === 'finished') && (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {status === 'paused' ? '측정 재개' : status === 'finished' ? '다시 측정하기' : '측정 시작'}
              </button>
            )}

            {status === 'running' && (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-[#D97706] hover:bg-[#B45309] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                일시정지
              </button>
            )}

            {(status === 'running' || status === 'paused') && (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                측정 종료
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-[#E9ECEF] dark:border-[#232E44] text-slate-700 dark:text-slate-300 hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          </div>

          {/* 측정 종료 또는 기록이 있을 때 즉시 기록 저장 버튼 */}
          {completedShuttles > 0 && (
            <button
              type="button"
              onClick={() => {
                if (status === 'running' || status === 'paused') {
                  handleFinish();
                }
                onCompleteAndSave({
                  level: currentSpec.level,
                  totalShuttles: completedShuttles,
                });
              }}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#059669] hover:bg-[#047857] text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              이 기록({currentSpec.level}단계 · {completedShuttles}회) 저장하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
