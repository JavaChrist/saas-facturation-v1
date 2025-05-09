import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

// Types de collections à sauvegarder
const COLLECTIONS = [
  "factures",
  "clients",
  "modeles",
  "parametres",
  "facturesRecurrentes",
];

// Interface pour les données exportées
interface ExportData {
  version: string;
  timestamp: number;
  userId: string;
  collections: {
    [key: string]: any[]; // Données de chaque collection
  };
}

/**
 * Exporte toutes les données de l'utilisateur courant
 * @param userId ID de l'utilisateur
 * @returns Les données exportées au format JSON
 */
export const exportUserData = async (userId: string): Promise<string> => {
  if (!userId) {
    throw new Error("Utilisateur non authentifié");
  }

  try {
    const exportData: ExportData = {
      version: "1.0",
      timestamp: Date.now(),
      userId,
      collections: {},
    };

    // Collections standard avec userId comme champ
    try {
      // Récupérer les données de chaque collection
      for (const collectionName of COLLECTIONS.filter(
        (c) => c !== "parametres"
      )) {
        try {
          const q = query(
            collection(db, collectionName),
            where("userId", "==", userId)
          );
          const querySnapshot = await getDocs(q);

          // Initialiser le tableau pour cette collection
          exportData.collections[collectionName] = [];

          // Ajouter chaque document à la collection
          querySnapshot.forEach((doc) => {
            exportData.collections[collectionName].push({
              id: doc.id,
              ...doc.data(),
            });
          });

          console.log(
            `Exportation de ${collectionName}: ${exportData.collections[collectionName].length} éléments`
          );
        } catch (collectionError) {
          console.warn(
            `Erreur lors de l'exportation de ${collectionName}:`,
            collectionError
          );
          exportData.collections[collectionName] = [];
        }
      }
    } catch (collectionsError) {
      console.error(
        "Erreur lors de l'exportation des collections standards:",
        collectionsError
      );
    }

    // Cas spécial pour les paramètres qui peuvent avoir une structure différente
    try {
      // Essayer de récupérer les paramètres de l'entreprise
      const parametresSnapshot = await getDocs(
        collection(db, "parametres", userId, "entreprise")
      );

      if (!parametresSnapshot.empty) {
        exportData.collections["parametres"] = [];
        parametresSnapshot.forEach((doc) => {
          exportData.collections["parametres"].push({
            id: doc.id,
            type: "entreprise",
            ...doc.data(),
          });
        });

        console.log(
          `Exportation de parametres: ${exportData.collections["parametres"].length} éléments`
        );
      }
    } catch (parametresError) {
      console.warn(
        "Erreur lors de l'exportation des paramètres:",
        parametresError
      );
      exportData.collections["parametres"] = [];
    }

    // Vérifier si nous avons des données à exporter
    const totalItems = Object.values(exportData.collections).reduce(
      (sum, items) => sum + items.length,
      0
    );

    if (totalItems === 0) {
      throw new Error(
        "Aucune donnée à exporter. Vérifiez les permissions de votre base de données."
      );
    }

    // Convertir en JSON
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error("Erreur lors de l'exportation des données :", error);

    // Message d'erreur amélioré pour les problèmes de permissions
    if (error instanceof Error && error.message.includes("permission")) {
      throw new Error(
        "Erreur de permissions Firebase. Veuillez mettre à jour les règles de sécurité Firestore pour autoriser la lecture des collections."
      );
    } else {
      throw new Error(
        `Erreur lors de l'exportation des données : ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  }
};

/**
 * Importe les données utilisateur à partir d'un fichier JSON
 * @param jsonData Données JSON à importer
 * @param userId ID de l'utilisateur actuel
 * @returns Un résumé des données importées
 */
export const importUserData = async (
  jsonData: string,
  userId: string
): Promise<{ success: boolean; summary: string }> => {
  if (!userId) {
    throw new Error("Utilisateur non authentifié");
  }

  try {
    // Analyser les données JSON
    const importData: ExportData = JSON.parse(jsonData);

    // Vérifier la version et les données
    if (!importData.version || !importData.collections) {
      throw new Error("Format de fichier de sauvegarde invalide");
    }

    // S'assurer que les données appartiennent à l'utilisateur actuel ou forcer l'ID
    const dataUserId = importData.userId;
    const forceUserId = dataUserId !== userId;

    if (forceUserId) {
      console.warn(
        "Les données importées appartiennent à un autre utilisateur. L'ID utilisateur sera mis à jour."
      );
    }

    // Statistiques d'importation
    const stats: { [key: string]: number } = {};

    // Utiliser un batch pour les opérations d'écriture
    const batch = writeBatch(db);

    // Importer chaque collection
    for (const collectionName of COLLECTIONS) {
      const items = importData.collections[collectionName] || [];
      stats[collectionName] = 0;

      for (const item of items) {
        const { id, ...data } = item;

        // Cas spécial pour les paramètres
        if (collectionName === "parametres" && item.type === "entreprise") {
          batch.set(doc(db, "parametres", userId, "entreprise", id), {
            ...data,
            ...(forceUserId ? { userId } : {}),
          });
        } else {
          // Documents normaux
          batch.set(doc(db, collectionName, id), {
            ...data,
            ...(forceUserId ? { userId } : {}),
          });
        }

        stats[collectionName]++;
      }
    }

    // Exécuter le batch
    await batch.commit();

    // Générer un résumé
    const summary = Object.entries(stats)
      .map(([collection, count]) => `${collection}: ${count} éléments`)
      .join(", ");

    return {
      success: true,
      summary: `Importation réussie. ${summary}`,
    };
  } catch (error) {
    console.error("Erreur lors de l'importation des données :", error);
    throw new Error(
      `Erreur lors de l'importation des données : ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`
    );
  }
};

/**
 * Télécharge les données sous forme de fichier JSON
 * @param data Données à télécharger
 * @param filename Nom du fichier
 */
export const downloadJson = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Génère un nom de fichier pour l'exportation
 * @returns Nom du fichier avec date et heure
 */
export const generateExportFilename = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toTimeString().split(" ")[0].replace(/:/g, "-");
  return `saas-facturation-backup-${dateStr}-${timeStr}.json`;
};
