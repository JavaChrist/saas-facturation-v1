import * as admin from "firebase-admin";

// Vérifie si Firebase Admin est déjà initialisé
const getOrCreateFirebaseApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Si nous sommes en développement ou test, créer une app simulée
  if (process.env.NODE_ENV !== "production") {
    try {
      return admin.initializeApp({
        projectId: "demo-facturation-app",
      });
    } catch (error) {
      console.error(
        "Erreur lors de l'initialisation de Firebase Admin:",
        error
      );
      return null;
    }
  }

  // En production, ne rien initialiser
  console.log("Mode production: Firebase Admin non initialisé");
  return null;
};

// Tentative d'obtenir ou créer l'app
const app = getOrCreateFirebaseApp();

// Pas d'exports des services
export const firestore = null;
export const auth = null;

export function initAdmin() {
  return app;
}

export default app;
