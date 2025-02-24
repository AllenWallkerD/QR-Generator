import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';

const ATTENDANCE_COLLECTION = 'attendance';

export const addAttendanceRecord = async (data) => {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding attendance record:', error);
    throw error;
  }
};

export const fetchAllAttendance = async () => {
  try {
    const colRef = collection(db, ATTENDANCE_COLLECTION);
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    return results;
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw error;
  }
};

export const getUserRecord = async (uid) => {
  const userDocRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    return null;
  }
};
