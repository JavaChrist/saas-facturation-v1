import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Configuration Firebase simplifiée
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialisation de Firebase avec une seule instance
let firebaseApp;
try {
  // Éviter de réinitialiser l'application si elle existe déjà
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    console.log(`Firebase initialisé avec le projet: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  }
} catch (error) {
  console.error("Erreur d'initialisation Firebase:", error);
  // Gérer l'erreur silencieusement pour éviter les plantages
  firebaseApp = initializeApp(firebaseConfig, "facturation-saas-" + Date.now());
}

// Initialisation des services
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// Vérifier que l'utilisateur est authentifié avant d'accéder à Firestore
const waitForAuth = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Exportation des services
export { auth, db, storage, waitForAuth };
