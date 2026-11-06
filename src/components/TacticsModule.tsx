import React, { useState, useEffect } from 'react';
import { Wind, Compass, Play, Square, Footprints, Timer } from 'lucide-react';
import { SHUTTLE_LEVEL_TABLE } from '../data/shuttleData';
import { soundEngine } from '../utils/soundEngine';

export const TacticsModule: React.FC = () => {
  // 호흡 리듬 메트로놈 상태
  const [breathPattern, setBreathPattern] = useState<'2:2' | '2:1'>('2:2');
  const [cadenceSpm, setCadenceSpm] = useState<number>(160); // 분당 발걸음 수 (Steps Per Minute)
  const [isMetronomeRunning, setIsMetronomeRunning] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);

  // 20m 턴 효율 계산기 상태
  const [turnSavedSec, setTurnSavedSec] = useState<number>(0.25);

  const cycleLength = breathPattern === '2:2' ? 4 : 3;
  const currentStepInCycle = stepIndex % cycleLength;
  const isInhale = currentStepInCycle < 2; // 2:2 -> 0,1 들숨 / 2,3 날숨 | 2:1 -> 0,1 들숨 / 2 날숨

  useEffect(() => {
    if (!isMetronomeRunning) {
      setStepIndex(0);
      return;
    }

    const intervalMs = (60 / cadenceSpm) * 1000;
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        const nextInCycle = next % cycleLength;
        if (nextInCycle === 0) {
          soundEngine.playBreathCue('inhale');
        } else if (nextInCycle === 2) {
          soundEngine.playBreathCue('exhale');
        }
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isMetronomeRunning, cadenceSpm, cycleLength]);

  const handleToggleMetronome = () => {
    soundEngine.unlock();
    if (!isMetronomeRunning) {
      soundEngine.playBreathCue('inhale');
    }
    setIsMetronomeRunning((prev) => !prev);
  };

  // 60회 왕복 기준 턴 시간 절약 효과
  const totalSavedSeconds = Number((turnSavedSec * 60).toFixed(1));
  const extraShuttles = Math.floor(totalSavedSeconds / 6.5);

  return (
    <div className="space-y-6">
      {/* 상단 섹션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] mb-1">
            02. 생체역학적 턴 · 호흡 리듬 · 페이스 배분
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            기능 및 전술 가이드
          </h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
          셔틀런은 단순한 직선 달리기가 아닙니다. 20m마다 반복되는 감속·방향전환(Turn) 효율과 단계별 호흡 리듬이 최종 기록을 결정합니다.
        </p>
      </div>

      {/* 메인 2단 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 좌측 7컬럼: 20m 턴(Turn) 동작 요령 및 턴 효율 계산기 */}
        <div className="lg:col-span-7 surface-card rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  20m 턴(Turn) 4단계 핵심 기술
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">생체역학 가이드</span>
            </div>

            {/* 20m 턴 동작 일러스트 */}
            <div className="relative overflow-hidden rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-slate-100 dark:bg-slate-900 aspect-[16/9] max-h-56 w-full">
              <img
                src="/src/assets/images/diagram_shuttle_turn_1793943942827.jpg"
                alt="20m 라인 턴 동작의 무게중심 하강 및 재가속 각도"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-4">
                <p className="text-xs text-emerald-300 font-medium">턴 동작 핵심 포인트</p>
                <p className="text-sm text-white font-medium">
                  무게중심(CoG)을 낮추고 발바닥 전체로 지면을 밀어내며 180° 회전
                </p>
              </div>
            </div>

            {/* 4단계 동작 요령 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
                <p className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8]">1단계 · 라인 2m 전 감속</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  보폭을 짧고 빠르게(피치 증가) 줄여 급정거로 인한 무릎 충격을 방지합니다.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
                <p className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8]">2단계 · 무게중심 하강</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  무릎을 90~110°로 굽혀 엉덩이를 낮추고, 한 발이 정확히 20m 선을 밟게 합니다.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
                <p className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8]">3단계 · 180° 피벗 회전</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  몸을 크게 돌지 말고, 축발(디딤발)을 기준으로 시선과 골반을 즉시 반대편으로 돌립니다.
                </p>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44]">
                <p className="text-xs font-semibold text-[#0284C7] dark:text-[#38BDF8]">4단계 · 전방 45° 재가속</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  상체를 약간 숙인 상태에서 팔치기를 강하게 하여 첫 3걸음에 순항 속도를 회복합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 턴 동작 시간 단축 효과 시뮬레이터 */}
          <div className="pt-4 border-t border-[#E9ECEF] dark:border-[#232E44] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="turn-slider" className="font-medium text-slate-700 dark:text-slate-300">
                1회 턴 동작 단축 시간 시뮬레이션
              </label>
              <span className="font-mono-tabular font-semibold text-[#059669] dark:text-[#34D399]">
                -{turnSavedSec.toFixed(2)}초 / 턴
              </span>
            </div>
            <input
              id="turn-slider"
              type="range"
              min={0.05}
              max={0.5}
              step={0.05}
              value={turnSavedSec}
              onChange={(e) => setTurnSavedSec(Number(e.target.value))}
              className="w-full accent-[#059669] cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>60회 왕복 기준 누적 절약 시간:</span>
              <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                총 {totalSavedSeconds}초 절약 (약 +{extraShuttles}회 왕복 추가 가능)
              </span>
            </div>
          </div>
        </div>

        {/* 우측 5컬럼: 인터랙티브 호흡 리듬 메트로놈 + 초반 오버페이스 방지 팁 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 인터랙티브 호흡 리듬 트레이너 */}
          <div className="surface-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  구간별 호흡 리듬 트레이너
                </h3>
              </div>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                {cadenceSpm} spm
              </span>
            </div>

            {/* 호흡 패턴 선택 */}
            <div className="flex items-center gap-1 p-1 bg-[#F8F9FA] dark:bg-[#0B0F19] rounded-lg border border-[#E9ECEF] dark:border-[#232E44]">
              <button
                type="button"
                onClick={() => setBreathPattern('2:2')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  breathPattern === '2:2'
                    ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                2:2 호흡 (1~6단계)
              </button>
              <button
                type="button"
                onClick={() => setBreathPattern('2:1')}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  breathPattern === '2:1'
                    ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                2:1 호흡 (7단계 이상)
              </button>
            </div>

            {/* 시각적 호흡 가이드 박스 */}
            <div className="p-4 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {breathPattern === '2:2' ? '2걸음 들이마시고 · 2걸음 내쉬기' : '2걸음 들이마시고 · 1걸음 강하게 내쉬기'}
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    !isMetronomeRunning
                      ? 'text-slate-700 dark:text-slate-300'
                      : isInhale
                      ? 'text-[#0284C7] dark:text-[#38BDF8]'
                      : 'text-[#059669] dark:text-[#34D399]'
                  }`}
                >
                  {!isMetronomeRunning ? '대기 중 (시작을 눌러 연습)' : isInhale ? '흡식 (코·입으로 들이마시기)' : '호식 (입으로 길게 내쉬기)'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleMetronome}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isMetronomeRunning
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                }`}
              >
                {isMetronomeRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isMetronomeRunning ? '정지' : '리듬 연습'}
              </button>
            </div>

            {/* 발걸음 비트 인디케이터 */}
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: cycleLength }).map((_, idx) => {
                const active = isMetronomeRunning && currentStepInCycle === idx;
                const stepType = idx < 2 ? '흡식' : '호식';
                return (
                  <div
                    key={idx}
                    className={`py-2 px-2 rounded-md text-center text-xs font-mono-tabular border transition-colors ${
                      active
                        ? idx < 2
                          ? 'bg-[#0284C7] text-white border-[#0284C7]'
                          : 'bg-[#059669] text-white border-[#059669]'
                        : 'bg-white dark:bg-[#151C2C] text-slate-600 dark:text-slate-400 border-[#E9ECEF] dark:border-[#232E44]'
                    }`}
                  >
                    {idx + 1}보 · {stepType}
                  </div>
                );
              })}
            </div>

            {/* 케이던스(보수) 슬라이더 */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <label htmlFor="cadence-slider" className="text-slate-700 dark:text-slate-300">
                  달리기 피치(분당 발걸음 수)
                </label>
                <span className="font-mono-tabular text-slate-900 dark:text-slate-100">{cadenceSpm} spm</span>
              </div>
              <input
                id="cadence-slider"
                type="range"
                min={130}
                max={190}
                step={5}
                value={cadenceSpm}
                onChange={(e) => setCadenceSpm(Number(e.target.value))}
                className="w-full accent-[#0284C7] cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* 초반 오버페이스 방지 및 보폭 조절 팁 */}
          <div className="surface-card rounded-xl p-6 flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Footprints className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                초반 오버페이스 방지 3원칙
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs md:text-sm text-slate-600 dark:text-slate-400">
              <li className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">1. 1~3단계는 조깅 속도로:</strong>{' '}
                8.5~9.5 km/h는 빠른 걸음에 가까운 속도입니다. 신호음보다 2~3초 먼저 도착해 라인 앞에서 기다리는 것은 불필요한 체력 소모입니다.
              </li>
              <li className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">2. 보폭보다 피치(회전수) 유지:</strong>{' '}
                무릎을 높이 들어 보폭을 억지로 넓히면 종아리 피로가 빨라집니다. 지면을 스치듯 가볍게 착지하세요.
              </li>
              <li className="leading-relaxed">
                <strong className="text-slate-900 dark:text-slate-100">3. 6단계 이후 시선 고정:</strong>{' '}
                속도가 11.0 km/h를 넘어가면 고개가 흔들리기 쉽습니다. 정면 10m 앞 바닥을 응시하며 상체 흔들림을 최소화하세요.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 하단: 공식 셔틀런 단계별 속도 및 왕복 기준표 (1~15단계) */}
      <div className="surface-card rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              공식 20m 셔틀런 단계별 속도 및 페이스 기준표
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Léger 20m 왕복오래달리기 표준 규격 (1~15단계 발췌)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[#E9ECEF] dark:border-[#232E44] text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">단계</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">속도 (km/h)</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">1회 20m 시간</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">단계 왕복 수</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">누적 왕복 수</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">누적 거리</th>
                <th className="py-2.5 px-3 font-medium whitespace-nowrap">권장 전술 구간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9ECEF] dark:divide-[#232E44]">
              {SHUTTLE_LEVEL_TABLE.slice(0, 15).map((row) => (
                <tr
                  key={row.level}
                  className="hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19]/50 transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono-tabular font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.level}단계
                  </td>
                  <td className="py-2.5 px-3 font-mono-tabular text-[#0284C7] dark:text-[#38BDF8] font-medium whitespace-nowrap">
                    {row.speedKmH.toFixed(1)} km/h
                  </td>
                  <td className="py-2.5 px-3 font-mono-tabular text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {row.shuttleDurationSec.toFixed(2)}초
                  </td>
                  <td className="py-2.5 px-3 font-mono-tabular text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {row.shuttlesInLevel}회
                  </td>
                  <td className="py-2.5 px-3 font-mono-tabular font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.cumulativeShuttles}회
                  </td>
                  <td className="py-2.5 px-3 font-mono-tabular text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.cumulativeDistanceM.toLocaleString()}m
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.phaseLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
