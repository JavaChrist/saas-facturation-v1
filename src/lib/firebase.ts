import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, disableNetwork, enableNetwork } from "firebase/firestore";

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

// Initialisation de Firestore avec des options optimisées pour la production
export const db = getFirestore(app);

// Activer la persistance locale et optimiser les paramètres de connexion
if (typeof window !== "undefined") {
  // Activer la persistance locale pour améliorer les performances et l'expérience hors ligne
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Plusieurs onglets ouverts, la persistance ne peut être activée que dans un seul onglet
      console.warn("La persistance de Firestore n'a pas pu être activée car plusieurs onglets sont ouverts");
    } else if (err.code === 'unimplemented') {
      // Le navigateur actuel ne prend pas en charge la persistance
      console.warn("Le navigateur actuel ne prend pas en charge la persistance Firestore");
    } else {
      console.error("Erreur lors de l'activation de la persistance Firestore:", err);
    }
  });

  // Gérer les problèmes de connectivité
  window.addEventListener('online', () => {
    enableNetwork(db).catch(err => {
      console.error("Erreur lors de la reconnexion à Firestore:", err);
    });
  });

  window.addEventListener('offline', () => {
    disableNetwork(db).catch(err => {
      console.error("Erreur lors de la déconnexion de Firestore:", err);
    });
  });
}

// Exportation des services Firebase
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connecter à l'émulateur Firestore en mode développement
if (process.env.NODE_ENV === 'development' && typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("✅ Connecté à l'émulateur Firestore local");
  } catch (error) {
    console.error("❌ Erreur de connexion à l'émulateur Firestore:", error);
  }
}
