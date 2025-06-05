import * as admin from "firebase-admin";

// Fonction pour obtenir ou créer l'app Firebase Admin
const getOrCreateFirebaseApp = () => {
  // Ne pas initialiser pendant le build
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV) {
    return null;
  }

  // Vérifier si l'app existe déjà
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  // Vérifications des variables d'environnement
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return null;
  }

  try {
    // En mode développement, utiliser la config simplifiée
    if (process.env.NODE_ENV === 'development') {
      return admin.initializeApp({
        projectId: projectId,
      });
    }

    // En production, utiliser les clés de service si disponibles
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (privateKey && clientEmail) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          privateKey: privateKey,
          clientEmail: clientEmail,
        }),
        projectId: projectId,
      });
    } else {
      // Fallback : utiliser les identifiants par défaut
      return admin.initializeApp({
        projectId: projectId,
      });
    }
    } catch (error) {
    console.error("Erreur Firebase Admin:", error);
    return null;
  }
};

// Fonction d'initialisation
export function initAdmin() {
  try {
    const app = getOrCreateFirebaseApp();
    if (!app) {
      return null;
    }
    return app;
  } catch (error) {
      return null;
    }
  }

// Fonction pour obtenir Firestore Admin de manière sécurisée
export function getAdminFirestore() {
  try {
    const app = initAdmin();
    if (!app) {
      throw new Error("Firebase Admin non disponible");
    }
    return admin.firestore(app);
  } catch (error) {
    throw error;
  }
}

// Exports pour compatibilité (null en mode build)
export const firestore = null;
export const auth = null;

// Export par défaut sécurisé
let defaultApp: any = null;
try {
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV) {
    defaultApp = getOrCreateFirebaseApp();
  }
} catch (error) {
  // Silent fail
}

export default defaultApp;
