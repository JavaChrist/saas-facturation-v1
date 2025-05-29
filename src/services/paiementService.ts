// Service pour gérer les paiements partiels
import { Facture, Paiement } from "@/types/facture";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

/**
 * Arrondit un montant à 2 décimales pour éviter les problèmes de précision
 * @param montant Montant à arrondir
 * @returns Montant arrondi
 */
const arrondirMontant = (montant: number): number => {
  return Math.round(montant * 100) / 100;
};

/**
 * Calcule le montant total payé pour une facture
 * @param paiements Liste des paiements
 * @returns Montant total payé
 */
export const calculerMontantPaye = (paiements: Paiement[] = []): number => {
  const total = paiements.reduce((total, paiement) => total + paiement.montant, 0);
  return arrondirMontant(total);
};

/**
 * Calcule le reste à payer pour une facture
 * @param totalTTC Montant total TTC de la facture
 * @param montantPaye Montant déjà payé
 * @returns Reste à payer
 */
export const calculerResteAPayer = (totalTTC: number, montantPaye: number): number => {
  const reste = Math.max(0, totalTTC - montantPaye);
  return arrondirMontant(reste);
};

/**
 * Détermine le statut d'une facture en fonction des paiements
 * @param totalTTC Montant total TTC
 * @param montantPaye Montant payé
 * @param statutActuel Statut actuel de la facture
 * @returns Nouveau statut
 */
export const determinerStatutFacture = (
  totalTTC: number,
  montantPaye: number,
  statutActuel: Facture["statut"]
): Facture["statut"] => {
  const resteAPayer = calculerResteAPayer(totalTTC, montantPaye);

  if (resteAPayer === 0) {
    return "Payée";
  } else if (montantPaye > 0) {
    return "Partiellement payée";
  } else {
    // Si aucun paiement, garder le statut actuel (sauf si c'était "Payée" ou "Partiellement payée")
    if (statutActuel === "Payée" || statutActuel === "Partiellement payée") {
      return "Envoyée"; // Retour à "Envoyée" si les paiements ont été supprimés
    }
    return statutActuel;
  }
};

/**
 * Ajoute un paiement à une facture
 * @param factureId ID de la facture
 * @param nouveauPaiement Nouveau paiement à ajouter
 * @param facture Données actuelles de la facture
 */
export const ajouterPaiement = async (
  factureId: string,
  nouveauPaiement: Omit<Paiement, "id">,
  facture: Facture
): Promise<void> => {
  try {
    console.log("=== DÉBUT AJOUT PAIEMENT ===");
    console.log("Facture ID:", factureId);
    console.log("Facture actuelle:", facture);
    console.log("Nouveau paiement:", nouveauPaiement);

    // Vérifications préliminaires
    if (!factureId) {
      throw new Error("ID de facture manquant");
    }

    if (!facture) {
      throw new Error("Données de facture manquantes");
    }

    if (!nouveauPaiement.montant || nouveauPaiement.montant <= 0) {
      throw new Error("Montant de paiement invalide");
    }

    // Générer un ID unique plus robuste pour éviter les conflits
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const nombrePaiementsExistants = (facture.paiements || []).length;
    const paiementId = `paiement_${timestamp}_${nombrePaiementsExistants}_${random}`;

    console.log("Génération du paiement avec ID:", paiementId);

    // S'assurer que la date est valide
    let datePaiement = nouveauPaiement.datePaiement;
    if (!(datePaiement instanceof Date) || isNaN(datePaiement.getTime())) {
      console.log("Date invalide détectée, utilisation de la date actuelle");
      datePaiement = new Date();
    }

    // Arrondir le montant pour éviter les problèmes de précision
    const montantArrondi = arrondirMontant(nouveauPaiement.montant);

    const paiementComplet: Paiement = {
      ...nouveauPaiement,
      id: paiementId,
      montant: montantArrondi,
      datePaiement: datePaiement
    };

    console.log("Paiement à ajouter:", paiementComplet);

    // Vérifier qu'il n'y a pas de doublon (même montant, même date, même méthode)
    const paiementsExistants = facture.paiements || [];
    const datePaiementStr = datePaiement.toDateString();
    const doublon = paiementsExistants.find(p =>
      p.montant === montantArrondi &&
      (p.datePaiement instanceof Date ? p.datePaiement.toDateString() : new Date(p.datePaiement).toDateString()) === datePaiementStr &&
      p.methodePaiement === nouveauPaiement.methodePaiement
    );

    if (doublon) {
      console.warn("Doublon détecté:", doublon);
      throw new Error("Un paiement identique existe déjà (même montant, date et méthode)");
    }

    // Ajouter le nouveau paiement à la liste existante
    const paiements = [...paiementsExistants, paiementComplet];

    // Calculer les nouveaux montants
    const montantPaye = calculerMontantPaye(paiements);
    const resteAPayer = calculerResteAPayer(facture.totalTTC, montantPaye);
    const nouveauStatut = determinerStatutFacture(facture.totalTTC, montantPaye, facture.statut);

    console.log("Nouveaux calculs:", {
      montantPaye,
      resteAPayer,
      nouveauStatut,
      totalTTC: facture.totalTTC
    });

    // Mettre à jour la facture dans Firestore
    const factureRef = doc(db, "factures", factureId);

    // Préparer les paiements pour Firestore avec gestion sécurisée des dates
    const paiementsPourFirestore = paiements.map(p => {
      let dateFirestore;
      try {
        if (p.datePaiement instanceof Date && !isNaN(p.datePaiement.getTime())) {
          dateFirestore = Timestamp.fromDate(p.datePaiement);
        } else if (typeof p.datePaiement === 'string') {
          const dateFromString = new Date(p.datePaiement);
          if (!isNaN(dateFromString.getTime())) {
            dateFirestore = Timestamp.fromDate(dateFromString);
          } else {
            console.warn("Date string invalide, utilisation de la date actuelle:", p.datePaiement);
            dateFirestore = Timestamp.fromDate(new Date());
          }
        } else {
          console.warn("Format de date non reconnu, utilisation de la date actuelle:", p.datePaiement);
          dateFirestore = Timestamp.fromDate(new Date());
        }
      } catch (error) {
        console.error("Erreur lors de la conversion de date pour Firestore:", error, p.datePaiement);
        dateFirestore = Timestamp.fromDate(new Date());
      }

      return {
        ...p,
        datePaiement: dateFirestore
      };
    });

    const updateData = {
      paiements: paiementsPourFirestore,
      montantPaye,
      resteAPayer,
      statut: nouveauStatut
    };

    console.log("Données à mettre à jour dans Firestore:", updateData);

    await updateDoc(factureRef, updateData);

    console.log("=== PAIEMENT AJOUTÉ AVEC SUCCÈS ===");
  } catch (error) {
    console.error("=== ERREUR LORS DE L'AJOUT DU PAIEMENT ===");
    console.error("Erreur détaillée:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "Pas de stack trace");
    throw error;
  }
};

/**
 * Supprime un paiement d'une facture
 * @param factureId ID de la facture
 * @param paiementId ID du paiement à supprimer
 * @param facture Données actuelles de la facture
 */
export const supprimerPaiement = async (
  factureId: string,
  paiementId: string,
  facture: Facture
): Promise<void> => {
  try {
    // Filtrer les paiements pour supprimer celui avec l'ID spécifié
    const paiements = (facture.paiements || []).filter(p => p.id !== paiementId);

    // Calculer les nouveaux montants
    const montantPaye = calculerMontantPaye(paiements);
    const resteAPayer = calculerResteAPayer(facture.totalTTC, montantPaye);
    const nouveauStatut = determinerStatutFacture(facture.totalTTC, montantPaye, facture.statut);

    // Mettre à jour la facture dans Firestore
    const factureRef = doc(db, "factures", factureId);
    await updateDoc(factureRef, {
      paiements: paiements.map(p => ({
        ...p,
        datePaiement: Timestamp.fromDate(p.datePaiement instanceof Date ? p.datePaiement : new Date(p.datePaiement))
      })),
      montantPaye,
      resteAPayer,
      statut: nouveauStatut
    });

    console.log("Paiement supprimé avec succès:", paiementId);
  } catch (error) {
    console.error("Erreur lors de la suppression du paiement:", error);
    throw error;
  }
};

/**
 * Met à jour les montants calculés d'une facture (utile pour la migration)
 * @param facture Facture à mettre à jour
 * @returns Facture avec les montants mis à jour
 */
export const mettreAJourMontantsFacture = (facture: Facture): Facture => {
  const paiements = facture.paiements || [];
  const montantPaye = calculerMontantPaye(paiements);
  const resteAPayer = calculerResteAPayer(facture.totalTTC, montantPaye);
  const statut = determinerStatutFacture(facture.totalTTC, montantPaye, facture.statut);

  return {
    ...facture,
    paiements,
    montantPaye,
    resteAPayer,
    statut
  };
};

/**
 * Formate un montant en euros
 * @param montant Montant à formater
 * @returns Montant formaté
 */
export const formaterMontant = (montant: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
};

/**
 * Obtient le texte court du statut pour l'affichage dans le tableau
 * @param statut Statut de la facture
 * @returns Texte court du statut
 */
export const getTexteCourtStatut = (statut: Facture["statut"]): string => {
  switch (statut) {
    case "Payée":
      return "Payée";
    case "Partiellement payée":
      return "Partiel";
    case "En attente":
      return "En attente";
    case "Envoyée":
      return "Envoyée";
    case "À relancer":
      return "À relancer";
    default:
      return statut;
  }
};

/**
 * Obtient la couleur du statut pour l'affichage
 * @param statut Statut de la facture
 * @returns Classe CSS pour la couleur
 */
export const getCouleurStatut = (statut: Facture["statut"]): string => {
  switch (statut) {
    case "Payée":
      return "bg-green-500";
    case "Partiellement payée":
      return "bg-amber-500"; // Amber pour les paiements partiels (plus visible)
    case "En attente":
      return "bg-yellow-500";
    case "Envoyée":
      return "bg-blue-500";
    case "À relancer":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

/**
 * Obtient la couleur du statut en style inline comme fallback
 * @param statut Statut de la facture
 * @returns Style inline pour la couleur de fond
 */
export const getCouleurStatutInline = (statut: Facture["statut"]): { backgroundColor: string } => {
  switch (statut) {
    case "Payée":
      return { backgroundColor: "#10B981" }; // green-500
    case "Partiellement payée":
      return { backgroundColor: "#F59E0B" }; // amber-500
    case "En attente":
      return { backgroundColor: "#EAB308" }; // yellow-500
    case "Envoyée":
      return { backgroundColor: "#3B82F6" }; // blue-500
    case "À relancer":
      return { backgroundColor: "#EF4444" }; // red-500
    default:
      return { backgroundColor: "#6B7280" }; // gray-500
  }
}; 