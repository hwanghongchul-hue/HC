import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  query,
  orderByChild,
  limitToLast,
  remove,
  type Database,
} from 'firebase/database';

export interface ShuttleRecord {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  gender: 'male' | 'female';
  level: number;
  totalShuttles: number;
  distanceMeters: number;
  vo2Max: number;
  papsGrade: number;
  note: string;
  createdAt: number;
}

/**
 * Firebase Realtime Database 환경변수 설정
 * Vercel 배포 시 대시보드에서 VITE_FIREBASE_* 환경변수를 주입하면 자동으로 실시간 DB와 연동됩니다.
 * 환경변수가 비어 있을 경우 에러 없이 브라우저 LocalStorage + 초기 학급 샘플 데이터 모드로 안전하게 Fallback 됩니다.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  // Realtime Database URL 주입 위치 (예: https://your-project-id-default-rtdb.asia-southeast1.firebasedatabase.app)
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId
);

let appInstance: FirebaseApp | null = null;
let dbInstance: Database | null = null;

if (isFirebaseConfigured) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    dbInstance = getDatabase(appInstance);
  } catch {
    dbInstance = null;
  }
}

export function getStorageMode(): 'firebase' | 'local' {
  return dbInstance ? 'firebase' : 'local';
}

const LOCAL_STORAGE_KEY = 'pacelab_shuttle_records_v1';

const INITIAL_SAMPLE_RECORDS: ShuttleRecord[] = [
  {
    id: 'sample-1',
    studentId: '20304',
    studentName: '김민준',
    className: '2학년 3반',
    gender: 'male',
    level: 9,
    totalShuttles: 78,
    distanceMeters: 1560,
    vo2Max: 49.4,
    papsGrade: 1,
    note: '6단계 이후 2:1 호흡으로 전환하니 후반 페이스 유지가 훨씬 수월했습니다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 'sample-2',
    studentId: '20319',
    studentName: '이서연',
    className: '2학년 3반',
    gender: 'female',
    level: 7,
    totalShuttles: 58,
    distanceMeters: 1160,
    vo2Max: 44.0,
    papsGrade: 1,
    note: '라인 턴할 때 무게중심을 낮추고 오른발로 강하게 밀어내니 시간이 단축되었어요.',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: 'sample-3',
    studentId: '20211',
    studentName: '박지훈',
    className: '2학년 2반',
    gender: 'male',
    level: 7,
    totalShuttles: 61,
    distanceMeters: 1220,
    vo2Max: 44.0,
    papsGrade: 2,
    note: '초반 1~3단계에서 천천히 체력을 아낀 덕분에 지난주보다 7회 더 뛰었습니다.',
    createdAt: Date.now() - 1000 * 60 * 60 * 1,
  },
  {
    id: 'sample-4',
    studentId: '20108',
    studentName: '최수아',
    className: '2학년 1반',
    gender: 'female',
    level: 5,
    totalShuttles: 41,
    distanceMeters: 820,
    vo2Max: 38.6,
    papsGrade: 2,
    note: '측정 후 3분간 걸으면서 쿨다운하니 어지럼증 없이 심박수가 빠르게 회복되었습니다.',
    createdAt: Date.now() - 1000 * 60 * 35,
  },
];

function readLocalRecords(): ShuttleRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_RECORDS));
      return INITIAL_SAMPLE_RECORDS;
    }
    const parsed = JSON.parse(raw) as ShuttleRecord[];
    return Array.isArray(parsed) ? parsed : INITIAL_SAMPLE_RECORDS;
  } catch {
    return INITIAL_SAMPLE_RECORDS;
  }
}

function writeLocalRecords(records: ShuttleRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('pacelab-records-updated'));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * 실시간 기록 구독 (Firebase Realtime Database 또는 LocalStorage 이벤트)
 */
export function subscribeShuttleRecords(callback: (records: ShuttleRecord[]) => void): () => void {
  if (dbInstance) {
    const recordsRef = query(ref(dbInstance, 'shuttleRecords'), orderByChild('createdAt'), limitToLast(100));
    const unsubscribe = onValue(
      recordsRef,
      (snapshot) => {
        const val = snapshot.val() as Record<string, Omit<ShuttleRecord, 'id'>> | null;
        if (!val) {
          callback([]);
          return;
        }
        const list: ShuttleRecord[] = Object.entries(val).map(([key, item]) => ({
          id: key,
          ...item,
        }));
        callback(list);
      },
      () => {
        callback(readLocalRecords());
      }
    );
    return () => unsubscribe();
  }

  callback(readLocalRecords());
  const handler = () => callback(readLocalRecords());
  window.addEventListener('pacelab-records-updated', handler);
  return () => window.removeEventListener('pacelab-records-updated', handler);
}

/**
 * 새로운 셔틀런 기록 저장
 */
export async function saveShuttleRecord(record: Omit<ShuttleRecord, 'id' | 'createdAt'>): Promise<ShuttleRecord> {
  const newRecordPayload = {
    ...record,
    createdAt: Date.now(),
  };

  if (dbInstance) {
    const listRef = ref(dbInstance, 'shuttleRecords');
    const newRef = push(listRef);
    await set(newRef, newRecordPayload);
    return {
      id: newRef.key || String(Date.now()),
      ...newRecordPayload,
    };
  }

  const current = readLocalRecords();
  const created: ShuttleRecord = {
    id: `local-${Date.now()}`,
    ...newRecordPayload,
  };
  writeLocalRecords([created, ...current]);
  return created;
}

/**
 * 기록 삭제 (교사/학생 본인 기록 관리용)
 */
export async function deleteShuttleRecord(id: string): Promise<void> {
  if (dbInstance) {
    await remove(ref(dbInstance, `shuttleRecords/${id}`));
    return;
  }
  const current = readLocalRecords();
  writeLocalRecords(current.filter((item) => item.id !== id));
}
