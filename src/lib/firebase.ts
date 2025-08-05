import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "fintrack-pro-qu937",
  appId: "1:760603247499:web:c26ec9f1c3de4fb488e58e",
  storageBucket: "fintrack-pro-qu937.firebasestorage.app",
  apiKey: "AIzaSyDgrVeGhTlAlIr9fUhTBLM_A5CY1BbDrf8",
  authDomain: "fintrack-pro-qu937.firebaseapp.com",
  messagingSenderId: "760603247499",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
