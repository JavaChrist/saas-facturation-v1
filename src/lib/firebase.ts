import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
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

// Configuration simplifiée de Firestore
const firestoreDB = getFirestore(app);

// Ajuster des paramètres d'exploitation
let firebaseDiagnostic = "✓ Configuration standard";

// Enregistrer des métriques pour debug en production
if (typeof window !== "undefined") {
  // Ne pas utiliser onSnapshot(), mais uniquement get()
  try {
    // Mesurer le temps d'accès à Firestore
    window.addEventListener('load', () => {
      console.log("📊 Diagnostic Firebase démarré");
      // Information de diagnostic
      console.log(`🔑 Projet Firebase: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
      console.log(`🔑 Auth Domain: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}`);
      
      // Vérifier l'état de la connexion
      console.log("🌐 État de la connexion: " + (navigator.onLine ? "En ligne" : "Hors ligne"));
    });
    
    firebaseDiagnostic = "✓ Diagnostic activé";
  } catch (err) {
    console.warn("⚠️ Erreur de configuration diagnostic:", err);
  }
  
  // Gérer les événements de connexion/déconnexion au réseau
  window.addEventListener('online', () => {
    try {
      console.log("🌐 Connexion internet détectée, rétablissement de Firestore");
      enableNetwork(firestoreDB).catch(e => {
        console.warn("Erreur enableNetwork:", e);
      });
    } catch (e) {
      console.warn("⚠️ Erreur lors de la réactivation du réseau Firestore", e);
    }
  });

  window.addEventListener('offline', () => {
    try {
      console.log("📴 Déconnexion internet détectée, mise en veille de Firestore");
      disableNetwork(firestoreDB).catch(e => {
        console.warn("Erreur disableNetwork:", e);
      });
    } catch (e) {
      console.warn("⚠️ Erreur lors de la mise en veille du réseau Firestore", e);
    }
  });
}

// Exportation des services Firebase
export const db = firestoreDB;
export const auth = getAuth(app);
export const storage = getStorage(app);

console.log(`Firebase initialisé: ${firebaseDiagnostic}`);

// Connecter à l'émulateur Firestore en mode développement
if (process.env.NODE_ENV === 'development' && typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("✅ Connecté à l'émulateur Firestore local");
  } catch (error) {
    console.error("❌ Erreur de connexion à l'émulateur Firestore:", error);
  }
}
