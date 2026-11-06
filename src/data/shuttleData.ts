export interface ShuttleLevelSpec {
  level: number;
  speedKmH: number;
  shuttlesInLevel: number;
  cumulativeShuttles: number;
  cumulativeDistanceM: number;
  shuttleDurationSec: number;
  phaseLabel: string;
}

const RAW_LEVELS: Array<{ level: number; speedKmH: number; shuttlesInLevel: number; phaseLabel: string }> = [
  { level: 1, speedKmH: 8.5, shuttlesInLevel: 7, phaseLabel: '워밍업 · 리듬 적응' },
  { level: 2, speedKmH: 9.0, shuttlesInLevel: 8, phaseLabel: '워밍업 · 리듬 적응' },
  { level: 3, speedKmH: 9.5, shuttlesInLevel: 8, phaseLabel: '기초 유산소 · 호흡 안정' },
  { level: 4, speedKmH: 10.0, shuttlesInLevel: 9, phaseLabel: '기초 유산소 · 호흡 안정' },
  { level: 5, speedKmH: 10.5, shuttlesInLevel: 9, phaseLabel: '기초 유산소 · 호흡 안정' },
  { level: 6, speedKmH: 11.0, shuttlesInLevel: 10, phaseLabel: '중강도 지속주 · 턴 집중' },
  { level: 7, speedKmH: 11.5, shuttlesInLevel: 10, phaseLabel: '중강도 지속주 · 턴 집중' },
  { level: 8, speedKmH: 12.0, shuttlesInLevel: 11, phaseLabel: '중강도 지속주 · 턴 집중' },
  { level: 9, speedKmH: 12.5, shuttlesInLevel: 11, phaseLabel: '고강도 역치 · 2:1 호흡 전환' },
  { level: 10, speedKmH: 13.0, shuttlesInLevel: 11, phaseLabel: '고강도 역치 · 2:1 호흡 전환' },
  { level: 11, speedKmH: 13.5, shuttlesInLevel: 12, phaseLabel: '고강도 역치 · 2:1 호흡 전환' },
  { level: 12, speedKmH: 14.0, shuttlesInLevel: 12, phaseLabel: '최대산소섭취량(VO2max) 구간' },
  { level: 13, speedKmH: 14.5, shuttlesInLevel: 13, phaseLabel: '최대산소섭취량(VO2max) 구간' },
  { level: 14, speedKmH: 15.0, shuttlesInLevel: 13, phaseLabel: '최대산소섭취량(VO2max) 구간' },
  { level: 15, speedKmH: 15.5, shuttlesInLevel: 13, phaseLabel: '무산소성 스프린트 구간' },
  { level: 16, speedKmH: 16.0, shuttlesInLevel: 14, phaseLabel: '무산소성 스프린트 구간' },
  { level: 17, speedKmH: 16.5, shuttlesInLevel: 14, phaseLabel: '무산소성 스프린트 구간' },
  { level: 18, speedKmH: 17.0, shuttlesInLevel: 15, phaseLabel: '엘리트 한계 도전 구간' },
  { level: 19, speedKmH: 17.5, shuttlesInLevel: 15, phaseLabel: '엘리트 한계 도전 구간' },
  { level: 20, speedKmH: 18.0, shuttlesInLevel: 16, phaseLabel: '엘리트 한계 도전 구간' },
  { level: 21, speedKmH: 18.5, shuttlesInLevel: 16, phaseLabel: '엘리트 한계 도전 구간' },
];

export const SHUTTLE_LEVEL_TABLE: ShuttleLevelSpec[] = (() => {
  let cumulative = 0;
  return RAW_LEVELS.map((item) => {
    cumulative += item.shuttlesInLevel;
    const speedMs = item.speedKmH / 3.6;
    const shuttleDurationSec = Number((20 / speedMs).toFixed(2));
    return {
      level: item.level,
      speedKmH: item.speedKmH,
      shuttlesInLevel: item.shuttlesInLevel,
      cumulativeShuttles: cumulative,
      cumulativeDistanceM: cumulative * 20,
      shuttleDurationSec,
      phaseLabel: item.phaseLabel,
    };
  });
})();

/**
 * Léger et al. (1988) 공식 기반 예상 최대산소섭취량(VO2max, mL/kg/min) 계산
 * 중학생(만 14세 기준) 보정 공식 적용
 */
export function calculateEstimatedVO2Max(speedKmH: number, age = 14): number {
  const vo2 = 31.025 + 3.238 * speedKmH - 3.248 * age + 0.1536 * speedKmH * age;
  return Math.max(20, Number(vo2.toFixed(1)));
}

/**
 * 총 왕복 횟수로부터 해당 단계(Level)와 단계 내 셔틀 번호를 역산
 */
export function getLevelInfoFromTotalShuttles(totalShuttles: number): {
  level: number;
  shuttleInLevel: number;
  spec: ShuttleLevelSpec;
} {
  const clamped = Math.max(1, totalShuttles);
  let prevCumulative = 0;
  for (const spec of SHUTTLE_LEVEL_TABLE) {
    if (clamped <= spec.cumulativeShuttles) {
      return {
        level: spec.level,
        shuttleInLevel: clamped - prevCumulative,
        spec,
      };
    }
    prevCumulative = spec.cumulativeShuttles;
  }
  const last = SHUTTLE_LEVEL_TABLE[SHUTTLE_LEVEL_TABLE.length - 1];
  return {
    level: last.level,
    shuttleInLevel: last.shuttlesInLevel,
    spec: last,
  };
}

export interface PapsEvaluation {
  grade: 1 | 2 | 3 | 4 | 5;
  label: string;
  feedback: string;
}

/**
 * 교육부 PAPS(학생건강체력평가) 중학교 2학년 기준 왕복오래달리기 등급 판정
 */
export function evaluatePapsGrade(totalShuttles: number, gender: 'male' | 'female'): PapsEvaluation {
  if (gender === 'male') {
    if (totalShuttles >= 74) {
      return { grade: 1, label: '1등급 · 매우 우수', feedback: '최상위권 심폐지구력입니다. 후반 고강도 페이스 유지가 뛰어납니다.' };
    }
    if (totalShuttles >= 55) {
      return { grade: 2, label: '2등급 · 우수', feedback: '우수한 유산소 능력을 갖추고 있습니다. 턴 동작을 가다듬으면 1등급에 도달할 수 있습니다.' };
    }
    if (totalShuttles >= 37) {
      return { grade: 3, label: '3등급 · 보통', feedback: '중학생 평균 수준의 심폐지구력입니다. 주 2~3회 20분 지속주로 지구력을 높여보세요.' };
    }
    if (totalShuttles >= 23) {
      return { grade: 4, label: '4등급 · 노력 요함', feedback: '초반 오버페이스를 줄이고 2:2 호흡 리듬을 유지하는 연습이 필요합니다.' };
    }
    return { grade: 5, label: '5등급 · 집중 관리', feedback: '걷기와 가벼운 조깅을 번갈아 실시하며 기초 심폐 체력을 차근차근 길러봅시다.' };
  } else {
    if (totalShuttles >= 54) {
      return { grade: 1, label: '1등급 · 매우 우수', feedback: '최상위권 심폐지구력입니다. 안정적인 호흡과 효율적인 턴 동작이 돋보입니다.' };
    }
    if (totalShuttles >= 39) {
      return { grade: 2, label: '2등급 · 우수', feedback: '우수한 유산소 능력입니다. 6단계 이후 보폭을 일정하게 유지하면 더 좋은 기록이 가능합니다.' };
    }
    if (totalShuttles >= 26) {
      return { grade: 3, label: '3등급 · 보통', feedback: '표준 심폐지구력 수준입니다. 규칙적인 유산소 운동으로 회복 심박수를 낮춰보세요.' };
    }
    if (totalShuttles >= 16) {
      return { grade: 4, label: '4등급 · 노력 요함', feedback: '1~2단계 워밍업 구간에서 호흡을 고르게 유지하며 끝까지 완주하는 데 집중해보세요.' };
    }
    return { grade: 5, label: '5등급 · 집중 관리', feedback: '무리하지 않는 선에서 목표 왕복 횟수를 매주 3~4회씩 늘려가는 것을 권장합니다.' };
  }
}

export interface SafetyCheckItem {
  id: string;
  phase: '측정 전' | '측정 중' | '측정 후';
  title: string;
  detail: string;
}

export const SAFETY_CHECKLIST: SafetyCheckItem[] = [
  {
    id: 'pre-1',
    phase: '측정 전',
    title: '동적 스트레칭 및 관절 가동성 확보',
    detail: '발목 돌리기, 무릎 굽혀 펴기, 런지 트위스트를 각 15초씩 실시해 턴 동작 시 발목 염좌를 예방합니다.',
  },
  {
    id: 'pre-2',
    phase: '측정 전',
    title: '운동화 끈 이중 매듭 및 수분 섭취',
    detail: '급격한 방향 전환 시 신발이 벗겨지지 않도록 발등에 맞게 끈을 조이고, 측정 15분 전 물 한 컵을 마십니다.',
  },
  {
    id: 'mid-1',
    phase: '측정 중',
    title: '자각 증상 모니터링 및 즉시 중단 원칙',
    detail: '어지럼증, 시야 흐림, 가슴 통증, 극심한 호흡곤란이 나타나면 신호음과 무관하게 즉시 달리기 속도를 줄이고 중단합니다.',
  },
  {
    id: 'mid-2',
    phase: '측정 중',
    title: '2회 연속 미도달 시 측정 종료 규칙',
    detail: '신호음이 울리기 전에 20m 라인에 한 발이 닿지 못한 경우가 2회 연속 발생하면 해당 기록으로 측정을 마칩니다.',
  },
  {
    id: 'post-1',
    phase: '측정 후',
    title: '급정지 금지 및 3분 쿨다운 걷기',
    detail: '측정 직후 자리에 주저앉으면 하지에 혈액이 몰려 어지러울 수 있으므로, 반드시 2~3분간 천천히 걸으며 호흡을 고릅니다.',
  },
];
