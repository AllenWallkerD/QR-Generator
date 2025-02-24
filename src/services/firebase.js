import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBGQCe7X2tZZfXZoQFdeyHeHyjaBiMnCM0",
  authDomain: "student-attendance-5cc24.firebaseapp.com",
  projectId: "student-attendance-5cc24",
  storageBucket: "student-attendance-5cc24.firebasestorage.app",
  messagingSenderId: "264595427004",
  appId: "1:264595427004:web:4af8b8a9818b2b3c34cab9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export default app;
