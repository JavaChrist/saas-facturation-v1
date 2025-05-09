import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Initialisation de Firestore avec l'approche standard
export const db = getFirestore(app);

// Configuration spéciale pour contourner les erreurs de permission en production
// SOLUTION TEMPORAIRE - Jusqu'à configuration correcte des règles Firestore
if (typeof window !== "undefined") {
  try {
    // @ts-ignore - Cette propriété existe mais le typage ne la reconnaît pas
    db._config.experimentalForceLongPolling = true;
    console.log("✅ Configuration longPolling activée pour Firestore");
  } catch (error) {
    console.error("❌ Impossible d'activer le mode longPolling pour Firestore");
  }
}

// Exportation des services Firebase
export const auth = getAuth(app);
export const storage = getStorage(app);

// ATTENTION : Configuration spéciale de Firestore activée pour le développement
if (typeof window !== "undefined") {
  console.log(
    "⚠️ ATTENTION: Configuration spéciale de Firestore activée pour le développement"
  );
  console.log("✅ Firestore initialisé avec succès");
}
