import { db } from './firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Общие константы (должны совпадать со сканером)
export const ROTATE_SECONDS = 60;
export const SESSION_MINUTES = 15;

// ВНИМАНИЕ по безопасности: генератор работает без авторизации и пишет в
// коллекцию `sessions` анонимно. Чтобы закрыть запись в `sessions`, в будущем
// нужно добавить авторизацию преподавателя и ужесточить правила Firestore.

const SESSIONS_COLLECTION = 'sessions';

// Случайный токен через crypto.getRandomValues (32 hex-символа)
const generateToken = () => {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};

// Создаёт документ сессии в коллекции `sessions` с id `class-<timestamp>`
export const createClassSession = async ({ generatorLat, generatorLng }) => {
  const startedAt = Date.now();
  const classSessionId = `class-${startedAt}`;
  const token = generateToken();

  const sessionRef = doc(db, SESSIONS_COLLECTION, classSessionId);
  await setDoc(sessionRef, {
    startedAt,
    expiresAt: startedAt + SESSION_MINUTES * 60000,
    rotateSeconds: ROTATE_SECONDS,
    currentToken: token,
    previousToken: null,
    tokenIssuedAt: startedAt,
    tokenExpiresAt: startedAt + (ROTATE_SECONDS + 10) * 1000,
    generatorLat,
    generatorLng,
    active: true,
    createdAt: serverTimestamp()
  });

  return { classSessionId, token };
};

// Меняет текущий токен, перенося старый в previousToken
export const rotateToken = async (classSessionId, previousToken) => {
  const now = Date.now();
  const token = generateToken();

  const sessionRef = doc(db, SESSIONS_COLLECTION, classSessionId);
  await updateDoc(sessionRef, {
    currentToken: token,
    previousToken: previousToken ?? null,
    tokenIssuedAt: now,
    tokenExpiresAt: now + (ROTATE_SECONDS + 10) * 1000
  });

  return token;
};

// Завершает сессию (active: false)
export const endClassSession = async (classSessionId) => {
  const sessionRef = doc(db, SESSIONS_COLLECTION, classSessionId);
  await updateDoc(sessionRef, { active: false });
};
