import { db } from "@/lib/firebase";
import {
  updateDoc,
  doc,
  getDoc,
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
    console.log("[DEBUG] Mise à jour du statut de la facture:", {
      factureId,
      statut
    });
    
    const factureRef = doc(db, "factures", factureId);
    const factureDoc = await getDoc(factureRef);
    
    if (!factureDoc.exists()) {
      console.error("[DEBUG] Facture non trouvée:", factureId);
      return false;
    }
    
    const factureData = factureDoc.data();
    console.log("[DEBUG] Données de la facture:", {
      id: factureId,
      userId: factureData.userId,
      data: factureData
    });
    
    await updateDoc(factureRef, { statut });
    console.log(`[DEBUG] Statut de la facture ${factureId} mis à jour: ${statut}`);
    return true;
  } catch (error) {
    console.error(
      `[DEBUG] Erreur lors de la mise à jour du statut de la facture ${factureId}:`,
      error
    );
    return false;
  }
};

// Fonction utilitaire pour convertir une date en format standard
export const convertToDate = (date: any): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date) {
    return date;
  }
  
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }
  
  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  return new Date();
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
    console.log("[DEBUG] Récupération de la facture:", factureId);
    
    const factureRef = doc(db, "factures", factureId);
    const factureSnap = await getDoc(factureRef);

    if (factureSnap.exists()) {
      const factureData = factureSnap.data();
      console.log("[DEBUG] Données de la facture:", {
        id: factureId,
        userId: factureData.userId,
        data: factureData
      });
      
      return {
        id: factureSnap.id,
        ...factureData,
        dateCreation: convertToDate(factureData.dateCreation),
      } as Facture;
    }

    console.log("[DEBUG] Facture non trouvée:", factureId);
    return null;
  } catch (error) {
    console.error(
      `[DEBUG] Erreur lors de la récupération de la facture ${factureId}:`,
      error
    );
    return null;
  }
};
