import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, PlusCircle, Download, Trash2, Search, BookOpenCheck } from 'lucide-react';
import {
  subscribeShuttleRecords,
  saveShuttleRecord,
  deleteShuttleRecord,
  getStorageMode,
  type ShuttleRecord,
} from '../lib/firebase';
import {
  calculateEstimatedVO2Max,
  evaluatePapsGrade,
  getLevelInfoFromTotalShuttles,
} from '../data/shuttleData';

interface LeaderboardModuleProps {
  prefilledResult: { level: number; totalShuttles: number } | null;
  onClearPrefill: () => void;
}

export const LeaderboardModule: React.FC<LeaderboardModuleProps> = ({
  prefilledResult,
  onClearPrefill,
}) => {
  const [records, setRecords] = useState<ShuttleRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageMode] = useState<'firebase' | 'local'>(() => getStorageMode());

  // 입력 폼 상태
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [className, setClassName] = useState<string>('2학년 3반');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [totalShuttles, setTotalShuttles] = useState<number>(45);
  const [level, setLevel] = useState<number>(6);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  // 필터 및 정렬 상태
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('전체');
  const [sortBy, setSortBy] = useState<'shuttles' | 'recent'>('shuttles');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const unsubscribe = subscribeShuttleRecords((data) => {
      setRecords(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 측정기에서 넘어온 결과 자동 반영
  useEffect(() => {
    if (prefilledResult) {
      setTotalShuttles(prefilledResult.totalShuttles);
      setLevel(prefilledResult.level);
      setFeedbackMsg(
        `측정기 기록(${prefilledResult.level}단계 · ${prefilledResult.totalShuttles}회)이 입력되었습니다. 학번과 이름을 입력해 저장하세요.`
      );
      onClearPrefill();
    }
  }, [prefilledResult, onClearPrefill]);

  // 왕복 횟수 변경 시 단계 자동 동기화
  const handleShuttlesChange = (val: number) => {
    const clamped = Math.max(1, Math.min(247, val));
    setTotalShuttles(clamped);
    const info = getLevelInfoFromTotalShuttles(clamped);
    setLevel(info.level);
  };

  // 실시간 PAPS 등급 및 VO2max 미리보기
  const previewLevelInfo = getLevelInfoFromTotalShuttles(totalShuttles);
  const previewVo2 = calculateEstimatedVO2Max(previewLevelInfo.spec.speedKmH, 14);
  const previewPaps = evaluatePapsGrade(totalShuttles, gender);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !studentName.trim()) {
      setFeedbackMsg('학번과 이름을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg('');
    try {
      await saveShuttleRecord({
        studentId: studentId.trim(),
        studentName: studentName.trim(),
        className: className.trim() || '2학년 1반',
        gender,
        level,
        totalShuttles,
        distanceMeters: totalShuttles * 20,
        vo2Max: previewVo2,
        papsGrade: previewPaps.grade,
        note: note.trim() || '꾸준한 페이스 조절로 완주했습니다.',
      });
      setFeedbackMsg(`${studentName.trim()} 학생의 기록(${totalShuttles}회 · PAPS ${previewPaps.grade}등급)이 저장되었습니다.`);
      setStudentId('');
      setStudentName('');
      setNote('');
    } catch {
      setFeedbackMsg('기록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 학급 목록 추출
  const classOptions = useMemo(() => {
    const set = new Set<string>(['2학년 1반', '2학년 2반', '2학년 3반']);
    records.forEach((r) => {
      if (r.className) set.add(r.className);
    });
    return ['전체', ...Array.from(set)];
  }, [records]);

  // 필터링 및 정렬된 기록
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (selectedClassFilter !== '전체' && r.className !== selectedClassFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          return (
            r.studentName.toLowerCase().includes(q) ||
            r.studentId.toLowerCase().includes(q) ||
            r.className.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'shuttles') {
          return b.totalShuttles - a.totalShuttles || b.createdAt - a.createdAt;
        }
        return b.createdAt - a.createdAt;
      });
  }, [records, selectedClassFilter, searchQuery, sortBy]);

  // 요약 통계
  const summaryStats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { count: 0, avgShuttles: 0, maxShuttles: 0, grade1Rate: 0 };
    }
    const sum = filteredRecords.reduce((acc, r) => acc + r.totalShuttles, 0);
    const max = Math.max(...filteredRecords.map((r) => r.totalShuttles));
    const grade1Count = filteredRecords.filter((r) => r.papsGrade === 1).length;
    return {
      count: filteredRecords.length,
      avgShuttles: Math.round(sum / filteredRecords.length),
      maxShuttles: max,
      grade1Rate: Math.round((grade1Count / filteredRecords.length) * 100),
    };
  }, [filteredRecords]);

  // 교사용 CSV 내보내기
  const handleExportCsv = () => {
    const headers = ['순위', '학급', '학번', '이름', '성별', '최종단계', '왕복횟수(회)', '누적거리(m)', '예상VO2max', 'PAPS등급', '학습일지메모'];
    const rows = filteredRecords.map((r, idx) => [
      idx + 1,
      r.className,
      r.studentId,
      r.studentName,
      r.gender === 'male' ? '남' : '여',
      `${r.level}단계`,
      r.totalShuttles,
      r.distanceMeters,
      r.vo2Max,
      `${r.papsGrade}등급`,
      `"${(r.note || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `셔틀런_학급기록_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 상단 섹션 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#38BDF8] mb-1">
            04. PAPS 등급 자동 판정 · 실시간 학급 리더보드 · 자기주도 학습 일지
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
            기록 저장 및 리더보드
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>
            저장소 모드: {storageMode === 'firebase' ? 'Firebase 실시간 동기화' : '브라우저 로컬 학습 일지'}
          </span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-white dark:bg-[#151C2C] border border-[#E9ECEF] dark:border-[#232E44] text-slate-700 dark:text-slate-300 hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19] transition-colors disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#38BDF8]" />
            CSV 내보내기
          </button>
        </div>
      </div>

      {/* 메인 2단 대시보드: 좌측 기록 입력 폼 / 우측 리더보드 & 학습 일지 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측 4컬럼: 기록 저장 및 학습 일지 작성 폼 */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 surface-card rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#0284C7] dark:text-[#38BDF8] shrink-0" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              측정 기록 등록
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-class" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                학급
              </label>
              <input
                id="input-class"
                type="text"
                placeholder="예: 2학년 3반"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>

            <div>
              <label htmlFor="input-student-id" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                학번
              </label>
              <input
                id="input-student-id"
                type="text"
                placeholder="예: 20314"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                이름
              </label>
              <input
                id="input-name"
                type="text"
                placeholder="예: 김민준"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                성별 (PAPS 기준)
              </span>
              <div className="flex items-center gap-1 p-1 bg-[#F8F9FA] dark:bg-[#0B0F19] rounded-lg border border-[#E9ECEF] dark:border-[#232E44]">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    gender === 'male'
                      ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  남학생
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    gender === 'female'
                      ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  여학생
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-shuttles" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                총 왕복 횟수 (회)
              </label>
              <input
                id="input-shuttles"
                type="number"
                min={1}
                max={247}
                value={totalShuttles}
                onChange={(e) => handleShuttlesChange(Number(e.target.value) || 1)}
                required
                className="w-full px-3 py-2 text-sm font-mono-tabular font-semibold rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>

            <div>
              <label htmlFor="input-level" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                최종 단계 (자동 계산)
              </label>
              <input
                id="input-level"
                type="number"
                min={1}
                max={21}
                value={level}
                onChange={(e) => setLevel(Math.max(1, Math.min(21, Number(e.target.value) || 1)))}
                className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              />
            </div>
          </div>

          {/* 실시간 PAPS 등급 미리보기 */}
          <div className="p-3.5 rounded-lg bg-[#F8F9FA] dark:bg-[#0B0F19] border border-[#E9ECEF] dark:border-[#232E44] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">예상 PAPS 등급</span>
              <span className="font-semibold text-[#0284C7] dark:text-[#38BDF8]">{previewPaps.label}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
              <span>누적 거리: {(totalShuttles * 20).toLocaleString()}m</span>
              <span>VO2max: {previewVo2}</span>
            </div>
          </div>

          <div>
            <label htmlFor="input-note" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              오늘의 학습 일지 (페이스·호흡 소감)
            </label>
            <textarea
              id="input-note"
              rows={2}
              placeholder="예: 5단계까지 2:2 호흡을 유지했고, 턴 동작 시 무릎을 낮추니 덜 힘들었습니다."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            />
          </div>

          {feedbackMsg && (
            <p className="text-xs font-medium text-[#059669] dark:text-[#34D399] leading-relaxed">
              {feedbackMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? '저장 중...' : '기록 및 학습 일지 저장'}
          </button>
        </form>

        {/* 우측 8컬럼: 학급 요약 + 실시간 리더보드 & 학습 일지 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 학급 요약 4열 스트립 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">참여 학생 수</p>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-1">
                {summaryStats.count}명
              </p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">평균 왕복 횟수</p>
              <p className="text-2xl font-bold font-mono-tabular text-[#0284C7] dark:text-[#38BDF8] mt-1">
                {summaryStats.avgShuttles}회
              </p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">최고 기록</p>
              <p className="text-2xl font-bold font-mono-tabular text-[#059669] dark:text-[#34D399] mt-1">
                {summaryStats.maxShuttles}회
              </p>
            </div>
            <div className="surface-card rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">PAPS 1등급 비율</p>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white mt-1">
                {summaryStats.grade1Rate}%
              </p>
            </div>
          </div>

          {/* 리더보드 테이블 및 학습 일지 피드 */}
          <div className="surface-card rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  실시간 학급 리더보드 및 학습 일지
                </h3>
              </div>

              {/* 검색 및 정렬 컨트롤 */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="이름 또는 학번 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
                  />
                </div>

                <select
                  aria-label="학급 필터"
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E9ECEF] dark:border-[#232E44] bg-[#F8F9FA] dark:bg-[#0B0F19] text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  {classOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 p-0.5 bg-[#F8F9FA] dark:bg-[#0B0F19] rounded-lg border border-[#E9ECEF] dark:border-[#232E44]">
                  <button
                    type="button"
                    onClick={() => setSortBy('shuttles')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortBy === 'shuttles'
                        ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    기록순
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortBy('recent')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      sortBy === 'recent'
                        ? 'bg-white dark:bg-[#151C2C] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    최신순
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                학급 기록을 불러오는 중입니다...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpenCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  등록된 측정 기록이 없습니다.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  왼쪽 입력 폼에서 첫 번째 셔틀런 기록과 학습 일지를 등록해보세요.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-[#E9ECEF] dark:border-[#232E44] text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">순위</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">학생 정보</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">최종 단계</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">왕복 횟수</th>
                      <th className="py-2.5 px-3 font-medium whitespace-nowrap">PAPS 등급</th>
                      <th className="py-2.5 px-3 font-medium">학습 일지 메모</th>
                      <th className="py-2.5 px-2 font-medium text-right whitespace-nowrap">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9ECEF] dark:divide-[#232E44]">
                    {filteredRecords.map((rec, idx) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-[#F8F9FA] dark:hover:bg-[#0B0F19]/50 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono-tabular font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {idx + 1}위
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {rec.studentName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                            {rec.className} · {rec.studentId}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono-tabular text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {rec.level}단계
                        </td>
                        <td className="py-3 px-3 font-mono-tabular font-bold text-[#0284C7] dark:text-[#38BDF8] whitespace-nowrap">
                          {rec.totalShuttles}회 ({rec.distanceMeters.toLocaleString()}m)
                        </td>
                        <td className="py-3 px-3 font-mono-tabular font-semibold text-[#059669] dark:text-[#34D399] whitespace-nowrap">
                          {rec.papsGrade}등급
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          <p className="line-clamp-2">{rec.note}</p>
                        </td>
                        <td className="py-3 px-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => deleteShuttleRecord(rec.id)}
                            aria-label={`${rec.studentName} 기록 삭제`}
                            className="p-1.5 text-slate-400 hover:text-[#DC2626] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
