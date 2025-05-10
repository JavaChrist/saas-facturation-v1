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
    console.log("[DEBUG-FACTURE] Début de récupération de la facture:", factureId);
    
    if (!factureId || factureId.trim() === '') {
      console.error("[DEBUG-FACTURE] ID de facture vide ou invalide");
      return null;
    }
    
    const factureRef = doc(db, "factures", factureId);
    console.log("[DEBUG-FACTURE] Tentative de lecture du document:", factureRef.path);
    
    const factureSnap = await getDoc(factureRef);

    if (factureSnap.exists()) {
      const factureData = factureSnap.data();
      console.log("[DEBUG-FACTURE] Données de la facture:", {
        id: factureId,
        userId: factureData.userId,
        numero: factureData.numero,
        dateCreation: factureData.dateCreation,
        totalTTC: factureData.totalTTC,
        statut: factureData.statut
      });
      
      // Vérifier les données essentielles
      if (!factureData.userId) {
        console.error("[DEBUG-FACTURE] La facture n'a pas d'ID utilisateur!");
      }
      
      if (!factureData.client) {
        console.error("[DEBUG-FACTURE] La facture n'a pas de client!");
      }
      
      if (!factureData.articles || !Array.isArray(factureData.articles)) {
        console.error("[DEBUG-FACTURE] La facture n'a pas d'articles ou le format est incorrect!");
      }
      
      // Convertir correctement la date de création
      const dateConvertie = convertToDate(factureData.dateCreation);
      console.log("[DEBUG-FACTURE] Date convertie:", dateConvertie);
      
      return {
        id: factureSnap.id,
        ...factureData,
        dateCreation: dateConvertie,
      } as Facture;
    }

    console.log("[DEBUG-FACTURE] Facture non trouvée:", factureId);
    return null;
  } catch (error) {
    console.error(
      `[DEBUG-FACTURE] Erreur lors de la récupération de la facture ${factureId}:`,
      error
    );
    // Ajouter plus de détails sur l'erreur
    if (error instanceof Error) {
      console.error("[DEBUG-FACTURE] Détails de l'erreur:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return null;
  }
};
