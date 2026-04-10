import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
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

export const deleteAllAttendanceRecords = async () => {
  const batch = writeBatch(db);
  const colRef = collection(db, ATTENDANCE_COLLECTION);
  const snapshot = await getDocs(colRef);
  snapshot.forEach((docItem) => {
    batch.delete(docItem.ref);
  });
  await batch.commit();
};
