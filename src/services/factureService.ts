import { db } from "@/lib/firebase";
import {
  updateDoc,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { Facture } from "@/types/facture";
import { getAuth, getIdToken } from "firebase/auth";

/**
 * Met à jour le statut d'une facture avec un mécanisme de rafraîchissement de token
 * @param factureId ID de la facture à mettre à jour
 * @param statut Nouveau statut de la facture (Payée, En attente, etc.)
 * @param updateCache Fonction optionnelle pour mettre à jour le cache
 * @returns Un objet avec le statut de l'opération et un message éventuel
 */
export const updateFactureStatus = async (
  factureId: string,
  statut: "En attente" | "Envoyée" | "Payée" | "À relancer",
  updateCache?: (factureId: string, updates: Partial<Facture>) => void
): Promise<{ success: boolean; message: string }> => {
  // Première tentative
  const result = await performUpdateFactureStatus(factureId, statut, updateCache);
  
  // Si la première tentative échoue avec une erreur de permission, essayer de rafraîchir le token
  if (!result.success && 
      (result.message.toLowerCase().includes("permission") || 
       result.message.toLowerCase().includes("auth"))) {
    console.log("[DEBUG] Tentative de rafraîchissement du token avant seconde tentative");
    
    try {
      // Rafraîchir explicitement le token
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        await getIdToken(currentUser, true); // forceRefresh = true
        console.log("[DEBUG] Token rafraîchi avec succès, nouvelle tentative de mise à jour");
        
        // Seconde tentative avec le token rafraîchi
        return await performUpdateFactureStatus(factureId, statut, updateCache);
      }
    } catch (refreshError) {
      console.error("[DEBUG] Erreur lors du rafraîchissement du token:", refreshError);
    }
  }
  
  return result;
};

/**
 * Fonction interne pour effectuer la mise à jour du statut d'une facture
 */
async function performUpdateFactureStatus(
  factureId: string,
  statut: "En attente" | "Envoyée" | "Payée" | "À relancer",
  updateCache?: (factureId: string, updates: Partial<Facture>) => void
): Promise<{ success: boolean; message: string }> {
  try {
    // Vérification explicite de l'authentification
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error("[DEBUG] Utilisateur non authentifié lors de la mise à jour du statut");
      return {
        success: false,
        message: "Vous devez être connecté pour modifier une facture"
      };
    }
    
    console.log("[DEBUG] Mise à jour du statut de la facture:", {
      factureId,
      statut,
      currentUser: currentUser.uid
    });
    
    // Vérifier l'ID de la facture
    if (!factureId || factureId.trim() === '') {
      return {
        success: false,
        message: "ID de facture invalide"
      };
    }
    
    const factureRef = doc(db, "factures", factureId);
    const factureDoc = await getDoc(factureRef);
    
    if (!factureDoc.exists()) {
      console.error("[DEBUG] Facture non trouvée:", factureId);
      return {
        success: false,
        message: "Facture introuvable"
      };
    }
    
    const factureData = factureDoc.data();
    
    // Vérifier que l'utilisateur actuel est bien le propriétaire de la facture
    if (factureData.userId !== currentUser.uid) {
      console.error("[DEBUG] Tentative non autorisée de modifier une facture:", {
        factureId,
        factureUserId: factureData.userId,
        currentUserId: currentUser.uid
      });
      return {
        success: false,
        message: "Vous n'êtes pas autorisé à modifier cette facture"
      };
    }
    
    console.log("[DEBUG] Données de la facture:", {
      id: factureId,
      userId: factureData.userId,
      currentUser: currentUser.uid,
      statut: factureData.statut,
      nouveauStatut: statut
    });
    
    // Éviter une mise à jour inutile si le statut est déjà celui demandé
    if (factureData.statut === statut) {
      console.log("[DEBUG] Le statut de la facture est déjà", statut);
      // Mise à jour du cache quand même pour assurer la cohérence
      if (updateCache) {
        try {
          updateCache(factureId, { statut });
        } catch (cacheError) {
          console.error("[DEBUG] Erreur lors de la mise à jour du cache:", cacheError);
        }
      }
      return {
        success: true,
        message: "Le statut est déjà à jour"
      };
    }
    
    // Effectuer la mise à jour
    await updateDoc(factureRef, { statut });
    
    // Si une fonction de mise à jour du cache est fournie, l'appeler
    if (updateCache) {
      try {
        updateCache(factureId, { statut });
      } catch (cacheError) {
        console.error("[DEBUG] Erreur lors de la mise à jour du cache:", cacheError);
        // Ne pas bloquer le flux principal si le cache échoue
      }
    }
    
    console.log(`[DEBUG] Statut de la facture ${factureId} mis à jour: ${statut}`);
    return {
      success: true,
      message: "Statut mis à jour avec succès"
    };
  } catch (error) {
    console.error(
      `[DEBUG] Erreur lors de la mise à jour du statut de la facture ${factureId}:`,
      error
    );
    
    // Analyse détaillée de l'erreur
    let errorMessage = "Erreur lors de la mise à jour du statut de la facture.";
    
    if (error instanceof Error) {
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes("permission-denied") || errorText.includes("permission")) {
        errorMessage = "Erreur de permission: Impossible de modifier cette facture. Vérifiez que vous êtes bien connecté.";
      } else if (errorText.includes("not-found")) {
        errorMessage = "La facture n'existe pas ou a été supprimée.";
      } else if (errorText.includes("network") || errorText.includes("connection")) {
        errorMessage = "Erreur réseau: Vérifiez votre connexion Internet.";
      } else if (errorText.includes("unauthorized") || errorText.includes("unauthenticated") || 
                errorText.includes("auth") || errorText.includes("token")) {
        errorMessage = "Erreur d'authentification: Veuillez vous reconnecter et réessayer.";
      } else {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      // Log détaillé pour débogage
      console.error("[DEBUG] Détails de l'erreur de mise à jour:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        factureId: factureId,
        nouveauStatut: statut,
        currentUser: getAuth().currentUser?.uid || "non connecté"
      });
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
}

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

/**
 * Supprime une facture de manière robuste avec gestion des erreurs
 * @param factureId ID de la facture à supprimer
 * @param updateUI Fonction callback pour mettre à jour l'UI après suppression réussie
 * @returns Un objet avec le statut de l'opération et un message d'erreur éventuel
 */
export const deleteFacture = async (
  factureId: string,
  updateUI?: () => void
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("[DEBUG-DELETE] Tentative de suppression de la facture:", factureId);
    
    // Vérifier d'abord que la facture existe
    const factureRef = doc(db, "factures", factureId);
    const docSnap = await getDoc(factureRef);
    
    if (!docSnap.exists()) {
      return {
        success: false,
        message: "La facture n'existe pas ou a déjà été supprimée."
      };
    }
    
    // Suppression de la facture
    await deleteDoc(factureRef);
    
    // Mise à jour de l'UI si une fonction de callback est fournie
    if (updateUI) {
      updateUI();
    }
    
    return {
      success: true,
      message: "Facture supprimée avec succès."
    };
    
  } catch (error) {
    console.error("[DEBUG-DELETE] Erreur détaillée:", error);
    
    // Analyse de l'erreur pour fournir un message pertinent
    let errorMessage = "Erreur lors de la suppression de la facture.";
    
    if (error instanceof Error) {
      const errorText = error.message.toLowerCase();
      
      if (errorText.includes("permission-denied") || errorText.includes("permission")) {
        errorMessage = "Erreur de permission: Impossible de supprimer cette facture. Vérifiez que vous êtes bien connecté.";
      } else if (errorText.includes("not-found")) {
        errorMessage = "La facture n'existe pas ou a déjà été supprimée.";
      } else if (errorText.includes("network") || errorText.includes("connection")) {
        errorMessage = "Erreur réseau: Vérifiez votre connexion Internet.";
      } else {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      // Log détaillé de l'erreur pour débogage
      console.error("[DEBUG-DELETE] Détails de l'erreur:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
    }
    
    return {
      success: false,
      message: errorMessage
    };
  }
};
