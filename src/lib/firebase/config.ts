import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const allConfigValuesPresent = Object.values(firebaseConfigValues).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (allConfigValuesPresent) {
  const firebaseConfig: FirebaseOptions = firebaseConfigValues;
  if (!getApps().length) {
      app = initializeApp(firebaseConfig);
  } else {
      app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn("Firebase configuration is incomplete. Please check your .env file. Some features like authentication will not work.");
}


export { app, auth, db, allConfigValuesPresent };