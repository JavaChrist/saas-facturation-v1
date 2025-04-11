import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { Facture } from "@/types/facture";

/**
 * Met à jour le statut d'une facture
 * @param factureId ID de la facture à mettre à jour
 * @param statut Nouveau statut de la facture (Payée, En attente, etc.)
 * @returns true si la mise à jour a réussi, false sinon
 */
export const updateFactureStatus = async (
  factureId: string,
  statut: string
): Promise<boolean> => {
  try {
    const factureRef = doc(db, "factures", factureId);
    await updateDoc(factureRef, { statut });

    console.log(`Statut de la facture ${factureId} mis à jour: ${statut}`);
    return true;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour du statut de la facture ${factureId}:`,
      error
    );
    return false;
  }
};

/**
 * Récupère une facture spécifique par son ID
 * @param factureId ID de la facture
 * @returns La facture ou null si non trouvée
 */
export const getFacture = async (
  factureId: string
): Promise<Facture | null> => {
  try {
    const factureRef = doc(db, "factures", factureId);
    const factureSnap = await getDoc(factureRef);

    if (factureSnap.exists()) {
      const factureData = factureSnap.data();

      // Gestion des dates Firestore
      let dateCreation: Date | null = null;
      if (factureData.dateCreation) {
        if (factureData.dateCreation instanceof Timestamp) {
          dateCreation = factureData.dateCreation.toDate();
        } else if (typeof factureData.dateCreation === "string") {
          dateCreation = new Date(factureData.dateCreation);
        }
      }

      return {
        id: factureSnap.id,
        ...factureData,
        dateCreation: dateCreation || new Date(),
      } as Facture;
    }

    return null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de la facture ${factureId}:`,
      error
    );
    return null;
  }
};
