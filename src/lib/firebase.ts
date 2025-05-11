import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore,
  connectFirestoreEmulator,
  type Firestore
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Utilisation des variables d'environnement pour la configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialisation de Firebase - S'assurer qu'une seule instance est créée
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Configuration très simple de Firestore
const firestoreDB = getFirestore(app);

// Exportation des services Firebase
export const db = firestoreDB;
export const auth = getAuth(app);
export const storage = getStorage(app);

console.log(`Firebase initialisé avec le projet: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);

// Connecter à l'émulateur Firestore en mode développement
if (process.env.NODE_ENV === 'development' && 
    typeof window !== "undefined" && 
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("✅ Connecté à l'émulateur Firestore local");
  } catch (error) {
    console.error("❌ Erreur de connexion à l'émulateur Firestore:", error);
  }
}
