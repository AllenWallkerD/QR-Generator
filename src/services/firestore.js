import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  writeBatch
} from 'firebase/firestore';

const ATTENDANCE_COLLECTION = 'attendance';

export const addAttendanceRecord = async ({
  sessionId,
  email,
  name,
  studentId,
  scannedAt,
  valid,
  distance,
  deviceFingerprint
}) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const record = {
    sessionId,
    email,
    name,
    studentId,
    scannedAt,
    valid,
    distance,
    createdAt: new Date()
  };
  if (deviceFingerprint) {
    record.deviceFingerprint = deviceFingerprint;
  }
  const docRef = await addDoc(colRef, record);
  return docRef.id;
};

export const fetchAllAttendance = async () => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    _id: doc.id,
    ...doc.data()
  }));
};

export const subscribeToAttendance = (callback) => {
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data()
    }));
    callback(data);
  });
};

export const getUserRecord = async (uid) => {
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
};

// Живая подписка на студентов
export const subscribeToUsers = (callback) => {
  const colRef = collection(db, 'users');
  return onSnapshot(colRef, (snapshot) => {
    callback(
      snapshot.docs.map((docItem) => {
        const data = docItem.data();
        return { studentId: data.studentId, name: data.name, email: data.email };
      })
    );
  });
};

// Живая подписка на сессии (отсортированы по startedAt по возрастанию)
export const subscribeToSessions = (callback) => {
  const colRef = collection(db, 'sessions');
  const q = query(colRef, orderBy('startedAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
  });
};

// Все студенты из коллекции `users`
export const fetchAllUsers = async () => {
  const colRef = collection(db, 'users');
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((docItem) => {
    const data = docItem.data();
    return { studentId: data.studentId, name: data.name, email: data.email };
  });
};

// Количество проведённых сессий — серверный счётчик, без скачивания документов
export const fetchSessionsCount = async () => {
  const colRef = collection(db, 'sessions');
  const snapshot = await getCountFromServer(colRef);
  return snapshot.data().count;
};

// Все сессии с их id, сортировка по startedAt по возрастанию на стороне сервера
export const fetchAllSessions = async () => {
  const colRef = collection(db, 'sessions');
  const q = query(colRef, orderBy('startedAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data()
  }));
};

// Удаление всей коллекции пачками (лимит batch — 500 операций)
const deleteAllInCollection = async (name) => {
  const colRef = collection(db, name);
  const snapshot = await getDocs(colRef);
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
};

export const deleteAllAttendanceRecords = async () => {
  await deleteAllInCollection(ATTENDANCE_COLLECTION);
};

// Удаление всех сессий — чтобы очистка не оставляла «пустые» уроки в статистике
export const deleteAllSessions = async () => {
  await deleteAllInCollection('sessions');
};
