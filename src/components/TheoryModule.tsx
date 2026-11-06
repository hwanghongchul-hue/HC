import React, { useState } from 'react';
import { CheckCircle2, Circle, HeartPulse, ShieldCheck, Activity, RotateCcw } from 'lucide-react';
import { SAFETY_CHECKLIST, type SafetyCheckItem } from '../data/shuttleData';

export const TheoryModule: React.FC = () => {
  // 심박수 존 시뮬레이터 상태
  const [age, setAge] = useState<number>(14);
  const [restingHr, setRestingHr] = useState<number>(68);
  const [intensityPct, setIntensityPct] = useState<number>(75);

  // 안전 수칙 체크리스트 상태
  const [checkedIds, setCheckedIds] = useState<string[]>(['pre-1']);
  const [phaseFilter, setPhaseFilter] = useState<'전체' | SafetyCheckItem['phase']>('전체');

  // 심박수 회복(HRR) 자가 진단 상태
  const [peakPulse15s, setPeakPulse15s] = useState<number>(44); // 176 bpm
  const [recoveryPulse15s, setRecoveryPulse15s] = useState<number>(34); // 136 bpm

  // 카르보넨(Karvonen) 공식 계산
  const maxHr = 220 - age;
  const hrReserve = maxHr - restingHr;
  const targetHr = Math.round(restingHr + hrReserve * (intensityPct / 100));

  const getZoneInfo = (pct: number) => {
    if (pct < 60) {
      return {
        name: '1존 · 워밍업 및 회복 구간',
        desc: '혈류를 증가시키고 관절과 근육의 온도를 높이는 준비 단계입니다. 셔틀런 1~2단계에 해당합니다.',
        statusText: '저강도 유산소',
        accentClass: 'text-[#0284C7] dark:text-[#38BDF8]',
      };
    }
    if (pct < 75) {
      return {
        name: '2존 · 기초 심폐지구력 구간',
        desc: '산소 공급과 소비가 균형을 이루며 장시간 달리기가 가능한 구간입니다. 셔틀런 3~5단계의 핵심 페이스입니다.',
        statusText: '안정적 유산소',
        accentClass: 'text-[#059669] dark:text-[#34D399]',
      };
    }
    if (pct < 88) {
      return {
        name: '3존 · 최대산소섭취량(VO2max) 향상 구간',
        desc: '심장의 1회 박출량이 최대치에 가까워지며 심폐지구력이 가장 효과적으로 발달하는 구간입니다. (6~9단계)',
        statusText: '고강도 심폐 훈련',
        accentClass: 'text-[#D97706] dark:text-[#FBBF24]',
      };
    }
    return {
      name: '4존 · 무산소성 역치 및 한계 돌파 구간',
      desc: '젖산 축적이 빠르게 일어나는 최고 강도 구간입니다. 호흡 리듬 유지와 강한 정신력이 요구됩니다. (10단계 이상)',
      statusText: '최대 강도 주의',
      accentClass: 'text-[#DC2626] dark:text-[#F87171]',
    };
  };

  const zoneInfo = getZoneInfo(intensityPct);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const filteredChecklist =
    phaseFilter === '전체'
      ? SAFETY_CHECKLIST
      : SAFETY_CHECKLIST.filter((item) => item.phase === phaseFilter);

  // 심박수 회복(HRR) 계산
  const peakBpm = peakPulse15s * 4;
  const recoveryBpm = recoveryPulse15s * 4;
  const hrrDrop = Math.max(0, peakBpm - recoveryBpm);

  const getHrrEvaluation = (drop: number) => {
    if (drop >= 35) return { label: '매우 우수 (빠른 심폐 회복)', color: 'text-[#059669] dark:text-[#34D399]' };
    if (drop >= 22) return { label: '양호 (표준 회복 속도)', color: 'text-[#0284C7] dark:text-[#38BDF8]' };
    if (drop >= 12) return { label: '보통 (유산소 훈련 권장)', color: 'text-[#D97706] dark:text-[#FBBF24]' };
    return { label: '회복 지연 (충분한 쿨다운 필요)', color: 'text-[#DC2626] dark:text-[#F87171]' };
  };

  const hrrEval = getHrrEvaluation(hrrDrop);

  // SVG 회복 곡선 좌표 생성
  const curvePoints = [
    { x: 20, y: 120 - ((peakBpm - 60) / 150) * 95, label: '종료 직후' },
    { x: 110, y: 120 - ((peakBpm - hrrDrop * 0.55 - 60) / 150) * 95, label: '30초' },
    { x: 200, y: 120 - ((recoveryBpm - 60) / 150) * 95, label: '1분 후' },
    { x: 290, y: 120 - ((Math.max(restingHr, recoveryBpm - hrrDrop * 0.45) - 60) / 150) * 95, label: '2분 후' },
  ];
  const polylineStr = curvePoints.map((p) => `${p.x},${Math.max(12, Math.min(118, p.y))}`).join(' ');

  return (
    <div className="space-y-6">
      {/* 상단 섹션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] mb-1">
            01. 심폐지구력 원리 및 안전 수칙
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            셔틀런 기초 이론관
          </h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
          20m 왕복오래달리기(셔틀런)는 심장과 폐가 근육에 산소를 얼마나 효율적으로 공급하는지(최대산소섭취량, VO2max)를 측정하는 과학적 체력 평가입니다.
        </p>
      </div>

      {/* 메인 2단 대시보드 (데스크탑 16:9 최적화) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* 좌측 7컬럼: 심폐지구력 원리 + 인터랙티브 심박수 존 시뮬레이터 */}
        <div className="lg:col-span-7 surface-card rounded-xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  심박수 존(Heart Rate Zone) 시뮬레이터
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                카르보넨(Karvonen) 공식
              </span>
            </div>

            {/* 해부학/운동생리학 일러스트 */}
            <div className="relative overflow-hidden rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-slate-100 dark:bg-slate-900 aspect-[16/9] max-h-56 w-full">
              <img
                src="/src/assets/images/diagram_cardio_heart_1793943942819.jpg"
                alt="심폐지구력 산소 운반 및 혈액 순환 원리 도해"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="
                absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-4
                flex items-end justify-between gap-4
              ">
                <div>
                  <p className="text-xs text-sky-300 font-medium">유산소 에너지 대사 원리</p>
                  <p className="text-sm text-white font-medium">
                    폐포의 산소(O2) → 심장 좌심실 펌프 → 활동근 미토콘드리아 ATP 생성
                  </p>
                </div>
              </div>
            </div>

            {/* 실시간 계산 결과 요약 */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-[#E9ECEF] dark:border-[#232E44]">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">목표 심박수</p>
                <p className="text-2xl md:text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                  {targetHr} <span className="text-sm font-normal text-slate-500">bpm</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">추정 최대심박수</p>
                <p className="text-2xl md:text-3xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-0.5">
                  {maxHr} <span className="text-sm font-normal text-slate-500">bpm</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">현재 운동 강도</p>
                <p className={`text-sm md:text-base font-semibold mt-1.5 ${zoneInfo.accentClass}`}>
                  {zoneInfo.statusText}
                </p>
              </div>
            </div>

            {/* 인터랙티브 슬라이더 컨트롤 */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <label htmlFor="slider-intensity" className="text-slate-700 dark:text-slate-300">
                    운동 강도 (여유심박수 비율 %HRR)
                  </label>
                  <span className="font-mono-tabular text-[#0284C7] dark:text-[#38BDF8] font-semibold">
                    {intensityPct}%
                  </span>
                </div>
                <input
                  id="slider-intensity"
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={intensityPct}
                  onChange={(e) => setIntensityPct(Number(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono-tabular mt-1">
                  <span>40% (걷기)</span>
                  <span>60% (조깅)</span>
                  <span>80% (셔틀런 중반)</span>
                  <span>100% (최대)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <label htmlFor="slider-age" className="text-slate-700 dark:text-slate-300">
                      학생 연령
                    </label>
                    <span className="font-mono-tabular text-slate-900 dark:text-slate-100">만 {age}세</span>
                  </div>
                  <input
                    id="slider-age"
                    type="range"
                    min={12}
                    max={17}
                    step={1}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1.5">
                    <label htmlFor="slider-resting" className="text-slate-700 dark:text-slate-300">
                      안정시 심박수
                    </label>
                    <span className="font-mono-tabular text-slate-900 dark:text-slate-100">{restingHr} bpm</span>
                  </div>
                  <input
                    id="slider-resting"
                    type="range"
                    min={50}
                    max={95}
                    step={1}
                    value={restingHr}
                    onChange={(e) => setRestingHr(Number(e.target.value))}
                    className="w-full accent-[#0284C7] cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 현재 선택된 존 설명 */}
          <div className="pt-4 border-t border-[#E9ECEF] dark:border-[#232E44]">
            <p className={`text-sm font-semibold ${zoneInfo.accentClass}`}>{zoneInfo.name}</p>
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {zoneInfo.desc}
            </p>
          </div>
        </div>

        {/* 우측 5컬럼: 심박수 회복(HRR) 자가 진단 + 안전 수칙 체크리스트 */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 심박수 회복(HRR) 중요성 및 자가 진단 */}
          <div className="surface-card rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#059669] dark:text-[#34D399] shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  심박수 회복(HRR) 자가 진단
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">종료 후 1분 기준</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              심폐지구력이 우수할수록 부교감신경이 빠르게 활성화되어 운동 종료 1분 뒤 심박수가 큰 폭으로 떨어집니다. 손목(요골동맥)에서 15초간 맥박 수를 세어 입력해보세요.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="hrr-peak" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  종료 직후 15초 맥박
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="hrr-peak"
                    type="number"
                    min={20}
                    max={55}
                    value={peakPulse15s}
                    onChange={(e) => setPeakPulse15s(Math.max(20, Math.min(55, Number(e.target.value) || 20)))}
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  <span className="text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                    ({peakBpm}bpm)
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="hrr-rec" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  1분 휴식 후 15초 맥박
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="hrr-rec"
                    type="number"
                    min={15}
                    max={50}
                    value={recoveryPulse15s}
                    onChange={(e) => setRecoveryPulse15s(Math.max(15, Math.min(50, Number(e.target.value) || 15)))}
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                  <span className="text-xs text-slate-500 font-mono-tabular whitespace-nowrap">
                    ({recoveryBpm}bpm)
                  </span>
                </div>
              </div>
            </div>

            {/* SVG 회복 곡선 */}
            <div className="pt-1">
              <svg
                viewBox="0 0 310 138"
                className="w-full h-28 overflow-visible"
                role="img"
                aria-label="심박수 회복 곡선 그래프"
              >
                <line x1="20" y1="20" x2="290" y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                <line x1="20" y1="68" x2="290" y2="68" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
                <line x1="20" y1="116" x2="290" y2="116" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <polyline
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylineStr}
                />
                {curvePoints.map((pt) => {
                  const cy = Math.max(12, Math.min(118, pt.y));
                  return (
                    <g key={pt.label}>
                      <circle cx={pt.x} cy={cy} r="4" fill="#059669" />
                      <text
                        x={pt.x}
                        y="133"
                        textAnchor="middle"
                        className="fill-slate-500 dark:fill-slate-400 text-[10px]"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E9ECEF] dark:border-[#232E44]">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400">1분 회복 심박수 감소폭</span>
                <p className="text-lg font-bold font-mono-tabular text-slate-900 dark:text-white">
                  -{hrrDrop} bpm
                </p>
              </div>
              <p className={`text-xs font-semibold ${hrrEval.color}`}>{hrrEval.label}</p>
            </div>
          </div>

          {/* 측정 전후 안전 수칙 체크리스트 */}
          <div className="surface-card rounded-xl p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    안전 수칙 체크리스트
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckedIds([])}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  초기화
                </button>
              </div>

              {/* 단계 필터 탭 */}
              <div className="flex items-center gap-1 p-1 bg-[#F8F9FA] dark:bg-[#0B0F19] rounded-lg border border-[#E9ECEF] dark:border-[#232E44]">
                {(['전체', '측정 전', '측정 중', '측정 후'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPhaseFilter(tab)}
                    className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      phaseFilter === tab
                        ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* 체크리스트 항목 */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {filteredChecklist.map((item) => {
                  const isChecked = checkedIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      className="w-full text-left flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19]/60 transition-colors cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{item.phase}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-medium ${
                              isChecked
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {item.detail}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E9ECEF] dark:border-[#232E44] text-xs">
              <span className="text-slate-500 dark:text-slate-400">안전 점검 완료율</span>
              <span className="font-mono-tabular font-semibold text-[#0284C7] dark:text-[#38BDF8]">
                {checkedIds.length} / {SAFETY_CHECKLIST.length} 항목 ({Math.round((checkedIds.length / SAFETY_CHECKLIST.length) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
