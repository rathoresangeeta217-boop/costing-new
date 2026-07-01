import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "gen-lang-client-0388415499",
  appId: "1:86856480452:web:ba318a7f60c16bd5a47b91",
  apiKey: "AIzaSyDzPOShwcwpv4VC-3dS3F2uEUA9ib33z6s",
  authDomain: "gen-lang-client-0388415499.firebaseapp.com",
  storageBucket: "gen-lang-client-0388415499.firebasestorage.app",
  messagingSenderId: "86856480452"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-furniturecostcal-08e3ffd5-cae0-4670-8bdd-25c043275ed4");
export const auth = getAuth(app);
