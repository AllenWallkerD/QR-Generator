import { db } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// Браузерный сид демо-данных (пишет в `sessions` и `attendance`, `users` НЕ трогает).
// Сначала удаляет все прошлые данные, затем пишет реалистичный набор ПАЧКАМИ
// (writeBatch) — записи появляются разом, а статистика (она считается из этих же
// записей) обновляется сама.

const ROTATE_SECONDS = 60;
const SESSION_MINUTES = 15;
const PRESENT_MINUTES = 5;
const GENERATOR_LAT = 43.238949;
const GENERATOR_LNG = 76.889709;
const DAY = 24 * 60 * 60 * 1000;

function randomHex(length) {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Студенты из коллекции `users`
async function fetchStudents() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => {
    const data = d.data();
    return { studentId: data.studentId, name: data.name, email: data.email };
  });
}

// Полная очистка коллекции пачками (лимит batch — 500 операций)
async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// Удаляем все прошлые сиды перед новым
async function clearAll() {
  await clearCollection('attendance');
  await clearCollection('sessions');
}

// Подготовить документ урока (без записи).
// Возвращаем startedAt на верхнем уровне — он нужен при расчёте времени посещений.
function buildSession(startedAt) {
  const id = `class-${startedAt}`;
  const token = randomHex(32);
  return {
    id,
    startedAt,
    data: {
      startedAt,
      expiresAt: startedAt + SESSION_MINUTES * 60000,
      rotateSeconds: ROTATE_SECONDS,
      currentToken: token,
      previousToken: null,
      tokenIssuedAt: startedAt,
      tokenExpiresAt: startedAt + (ROTATE_SECONDS + 10) * 1000,
      generatorLat: GENERATOR_LAT,
      generatorLng: GENERATOR_LNG,
      active: false,
      createdAt: new Date(startedAt)
    }
  };
}

// Записать уроки пачками
async function writeSessions(list) {
  for (let i = 0; i < list.length; i += 450) {
    const batch = writeBatch(db);
    list.slice(i, i + 450).forEach((s) => batch.set(doc(db, 'sessions', s.id), s.data));
    await batch.commit();
  }
}

// Записать посещения пачками (один commit -> один апдейт live-таблицы)
async function writeAttendance(records) {
  for (let i = 0; i < records.length; i += 450) {
    const batch = writeBatch(db);
    records.slice(i, i + 450).forEach((rec) => batch.set(doc(collection(db, 'attendance')), rec));
    await batch.commit();
  }
}

function buildAttendance(sessionId, student, { valid, distance, status, scannedAt, device }) {
  return {
    sessionId,
    email: student.email,
    name: student.name,
    studentId: student.studentId,
    scannedAt: new Date(scannedAt),
    valid,
    distance,
    status,
    deviceFingerprint: device,
    createdAt: new Date(scannedAt)
  };
}

// Профили поведения (повышенная посещаемость для "хорошего" сида)
const PROFILES = {
  excellent: { attend: 0.98, late: 0.04, drift: 0.0 },
  good: { attend: 0.92, late: 0.12, drift: 0.0 },
  average: { attend: 0.8, late: 0.25, drift: 0.0 },
  improving: { attend: 0.72, late: 0.3, drift: 0.35 },
  declining: { attend: 0.85, late: 0.2, drift: -0.45 },
  at_risk: { attend: 0.55, late: 0.4, drift: -0.2 }
};

// Взвешенное распределение: хорошие профили встречаются чаще
const WEIGHTED_PROFILES = [
  'excellent', 'excellent', 'excellent',
  'good', 'good', 'good',
  'average', 'average',
  'improving',
  'declining',
  'at_risk'
];

// Сид: реалистичный набор со смещением в сторону хорошей посещаемости
export async function seedRealistic() {
  const base = await fetchStudents();
  if (base.length === 0) return { error: 'no-users' };

  const students = base.map((s, i) => ({
    ...s,
    device: randomHex(32),
    profile: PROFILES[WEIGHTED_PROFILES[i % WEIGHTED_PROFILES.length]]
  }));

  await clearAll();

  const now = Date.now();
  const N = 12;
  const sessions = [];
  for (let i = 0; i < N; i++) {
    const d = new Date(now - (N - i) * 1.6 * DAY);
    d.setHours(9, 0, 0, 0); // урок в 09:00
    sessions.push(buildSession(d.getTime()));
  }
  await writeSessions(sessions);

  const lastThree = sessions.slice(-3).map((s) => s.id);
  const forcedAbsent = students[0].email; // один студент — для блока "Ескерту"

  const records = [];
  for (let si = 0; si < sessions.length; si++) {
    const session = sessions[si];
    const progress = sessions.length > 1 ? si / (sessions.length - 1) : 0;

    for (const student of students) {
      if (student.email === forcedAbsent && lastThree.includes(session.id)) continue;

      const p = student.profile;
      const effAttend = clamp(p.attend + p.drift * (progress - 0.5), 0.05, 0.99);
      if (Math.random() > effAttend) continue;

      const isLate = Math.random() < p.late;
      const status = isLate ? 'late' : 'present';
      const offsetMin = isLate
        ? PRESENT_MINUTES + Math.random() * (SESSION_MINUTES - PRESENT_MINUTES)
        : Math.random() * PRESENT_MINUTES;

      let distance;
      let valid;
      if (Math.random() < 0.08) {
        distance = 11 + Math.random() * 15; // редкое нарушение дистанции
        valid = false;
      } else {
        distance = 2 + Math.random() * 7;
        valid = true;
      }

      records.push(
        buildAttendance(session.id, student, {
          valid,
          distance,
          status,
          scannedAt: session.startedAt + offsetMin * 60000,
          device: student.device
        })
      );
    }
  }
  await writeAttendance(records);

  return { students: students.length, sessions: sessions.length, attendance: records.length };
}
