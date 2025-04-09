import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
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

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Initialisation de Firestore avec l'approche standard
export const db = getFirestore(app);

// Exportation des services Firebase
export const auth = getAuth(app);
export const storage = getStorage(app);

// ATTENTION : Fix temporaire pour les problèmes de permission
// Pour le développement uniquement, ne pas utiliser en production
if (typeof window !== "undefined") {
  console.log(
    "⚠️ ATTENTION: Configuration spéciale de Firestore activée pour le développement"
  );

  // Activer la persistance pour améliorer les performances
  // Note: Cette fonctionnalité sera dépréciée dans le futur, mais elle est toujours
  // la méthode la plus simple et compatible pour activer le cache
  (async () => {
    try {
      await enableIndexedDbPersistence(db)
        .then(() => console.log("✅ Persistance Firestore activée"))
        .catch((err) => {
          if (err.code === "failed-precondition") {
            console.warn(
              "⚠️ La persistance ne peut pas être activée car plusieurs onglets sont ouverts"
            );
          } else if (err.code === "unimplemented") {
            console.warn(
              "⚠️ Le navigateur ne prend pas en charge la persistance"
            );
          } else {
            console.error(
              "Erreur lors de l'activation de la persistance:",
              err
            );
          }
        });
    } catch (error) {
      console.error("Erreur lors de la configuration de Firestore:", error);
    }
  })();
}
