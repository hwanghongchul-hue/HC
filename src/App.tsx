import React, { useState, useEffect } from 'react';
import { BookOpen, Compass, Timer, Trophy, Sun, Moon } from 'lucide-react';
import { TheoryModule } from './components/TheoryModule';
import { TacticsModule } from './components/TacticsModule';
import { ShuttleTimerModule } from './components/ShuttleTimerModule';
import { LeaderboardModule } from './components/LeaderboardModule';

type TabId = 'theory' | 'tactics' | 'timer' | 'records';

interface NavItem {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'theory', label: '이론관', shortLabel: '이론관', icon: BookOpen },
  { id: 'tactics', label: '전술 가이드', shortLabel: '전술', icon: Compass },
  { id: 'timer', label: '셔틀런 측정기', shortLabel: '측정기', icon: Timer },
  { id: 'records', label: '기록 및 리더보드', shortLabel: '기록장', icon: Trophy },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('timer');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const [prefilledResult, setPrefilledResult] = useState<{
    level: number;
    totalShuttles: number;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('pacelab-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('pacelab-theme', 'light');
    }
  }, [isDark]);

  const handleCompleteAndSave = (result: { level: number; totalShuttles: number }) => {
    setPrefilledResult(result);
    setActiveTab('records');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* 상단 고정 3-Zone 내비게이션 바 */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#151C2C]/95 backdrop-blur-xs border-b border-[#E9ECEF] dark:border-[#232E44]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: 단일 라인 브랜드 워드마크 */}
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            페이스랩 20m
          </button>

          {/* Zone 2: 데스크탑 4개 단일 라인 내비게이션 링크 */}
          <nav aria-label="주요 메뉴" className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[#0284C7] dark:border-[#38BDF8] text-[#0284C7] dark:text-[#38BDF8]'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 다크/라이트 모드 토글 및 주요 액션 버튼 */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="p-2 rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 hover:text-[#0284C7] dark:hover:text-[#38BDF8] transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('timer')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              측정 시작
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 컨테이너 (데스크탑 16:9 와이드 대시보드 & 모바일 9:16 여백 확보) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-12">
        {activeTab === 'theory' && <TheoryModule />}
        {activeTab === 'tactics' && <TacticsModule />}
        {activeTab === 'timer' && <ShuttleTimerModule onCompleteAndSave={handleCompleteAndSave} />}
        {activeTab === 'records' && (
          <LeaderboardModule
            prefilledResult={prefilledResult}
            onClearPrefill={() => setPrefilledResult(null)}
          />
        )}
      </main>

      {/* 데스크탑 푸터 */}
      <footer className="hidden md:block border-t border-[#E9ECEF] dark:border-[#232E44] bg-white dark:bg-[#151C2C] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>페이스랩 20m · 중등 체육 심폐지구력(왕복오래달리기) 학습 및 측정 플랫폼</span>
          <span>PAPS 중등부 기준 및 Léger 20m 공식 페이스 규격 준수</span>
        </div>
      </footer>

      {/* 모바일 전용 하단 내비게이션 바 (9:16 세로 화면 최적화, 15% 높이 제한 준수) */}
      <nav
        aria-label="모바일 하단 메뉴"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#151C2C]/95 backdrop-blur-xs border-t border-[#E9ECEF] dark:border-[#232E44] h-16 px-2 flex items-center justify-around"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#0284C7] dark:text-[#38BDF8] font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] whitespace-nowrap">{item.shortLabel}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsDark((prev) => !prev)}
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          className="flex flex-col items-center justify-center gap-1 min-w-[52px] py-1.5 rounded-lg text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="text-[11px] whitespace-nowrap">{isDark ? '라이트' : '다크'}</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
