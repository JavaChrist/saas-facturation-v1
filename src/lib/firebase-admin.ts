import * as admin from "firebase-admin";

// Fonction pour initialiser Firebase Admin si ce n'est pas déjà fait
export function initAdmin() {
  if (!admin.apps.length) {
    try {
      // Vérifier si nous sommes en production (Vercel) ou en développement
      if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        // Configuration en production avec variables d'environnement
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
        console.log(
          "Firebase Admin initialisé avec les variables d'environnement"
        );
      } else {
        // Fallback en développement ou si les variables ne sont pas définies
        // Créer une configuration simulée pour les environnements de prévisualisation/développement
        admin.initializeApp({
          projectId: "demo-facturation-app",
        });
        console.log(
          "Firebase Admin initialisé en mode développement/prévisualisation"
        );
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation de Firebase Admin:",
        error
      );
    }
  }
  return admin.app();
}

// Initialisation de l'application Admin
const app = initAdmin();

// Export des services - avec vérification de disponibilité
export const auth = admin.apps.length ? admin.auth() : null;
export const firestore = admin.apps.length ? admin.firestore() : null;

export default app;
