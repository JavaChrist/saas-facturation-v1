import * as admin from "firebase-admin";

// Fonction pour initialiser Firebase Admin si ce n'est pas déjà fait
export function initAdmin() {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log("Firebase Admin initialisé avec succès");
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

// Export des services
export const auth = admin.auth();
export const firestore = admin.firestore();

export default app;
