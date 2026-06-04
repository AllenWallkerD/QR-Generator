import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";

// Конфигурация берётся из переменных окружения (.env.local, не коммитится в git)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Firestore с постоянным кэшем (IndexedDB): после первого раза данные мгновенно
// отдаются с диска, а сеть досинхронизирует в фоне — статистика грузится быстрее
// даже после перезагрузки страницы. persistentMultipleTabManager — поддержка
// нескольких вкладок.
function createDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
  } catch {
    // Повторная инициализация (например, HMR) — берём уже созданный инстанс
    return getFirestore(app);
  }
}

export const db = createDb();

export default app;
