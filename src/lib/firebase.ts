import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { enableIndexedDbPersistence, disableNetwork, enableNetwork } from "firebase/firestore";

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

// Initialisation de Firestore avec des options personnalisées
// Utiliser un objet de configuration
let firestoreSettings = {};

// Si nous sommes dans un environnement navigateur
if (typeof window !== "undefined") {
  firestoreSettings = {
    // Forcer l'utilisation du longPolling pour les environnements 
    // où les WebSockets ne fonctionnent pas bien
    experimentalForceLongPolling: true,
    // Augmenter le délai d'expiration des opérations
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  };
  
  console.log("✅ Configuration spéciale de Firestore activée");
}

// Exporter l'instance Firestore avec les paramètres personnalisés
export const db = getFirestore(app);

// Tentative d'application des paramètres (fallback)
if (typeof window !== "undefined") {
  try {
    // @ts-ignore - Accès direct au _settings qui existe mais n'est pas déclaré dans les types
    if (db._settings) {
      // @ts-ignore
      db._settings = { ...db._settings, ...firestoreSettings };
      console.log("✓ Paramètres Firestore appliqués avec succès");
    }
  } catch (err) {
    console.error("⚠️ Impossible d'appliquer les paramètres personnalisés à Firestore", err);
  }
  
  // Tenter d'activer la persistance en mode silencieux
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code !== 'failed-precondition') {
        console.warn("⚠️ Problème avec la persistance Firestore", err);
      }
    });
  } catch (err) {
    console.warn("⚠️ Persistance Firestore non supportée", err);
  }

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
