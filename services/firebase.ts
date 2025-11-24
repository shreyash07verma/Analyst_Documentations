import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCoOYm-O6aoDO72qwE0oA16Cp4_2ANS4w",
  authDomain: "analystpro-471a1.firebaseapp.com",
  projectId: "analystpro-471a1",
  storageBucket: "analystpro-471a1.firebasestorage.app",
  messagingSenderId: "363397901310",
  appId: "1:363397901310:web:5025785510b691bd57eeaf",
  measurementId: "G-TTNW66F3DR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);