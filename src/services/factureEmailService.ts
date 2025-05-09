// Ce service simule l'envoi de factures par email
// Pour une implémentation réelle, il faudrait intégrer un service SMTP comme Nodemailer ou une API d'emailing

import { Facture } from "@/types/facture";
import { generateInvoicePDF } from "./pdfGenerator";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Interface pour les options d'envoi d'e-mail
export interface EmailOptions {
  objetEmail?: string;
  corpsEmail?: string;
  includeFacturePDF?: boolean;
  includeSignature?: boolean;
  ccEmail?: string[];
  bccEmail?: string[];
}

// Options par défaut
const defaultOptions: EmailOptions = {
  objetEmail: "Votre facture [NUM_FACTURE]",
  corpsEmail: `Bonjour,

Veuillez trouver ci-joint votre facture [NUM_FACTURE] d'un montant de [MONTANT_TTC] € datée du [DATE_FACTURE].

Nous vous remercions de votre confiance.

Cordialement,
[NOM_ENTREPRISE]`,
  includeFacturePDF: true,
  includeSignature: true,
  ccEmail: [],
  bccEmail: [],
};

/**
 * Envoyer une facture par e-mail
 * Cette fonction est une simulation - dans un environnement de production,
 * il faudrait implémenter un véritable service d'envoi d'e-mails côté serveur
 */
export const envoyerFactureParEmail = async (
  facture: Facture,
  options: EmailOptions = {}
): Promise<{ success: boolean; message: string }> => {
  try {
    // Fusionner les options fournies avec les options par défaut
    const emailOptions = { ...defaultOptions, ...options };

    // Vérifier que le client a un e-mail
    if (!facture.client.email) {
      return {
        success: false,
        message: "Le client n'a pas d'adresse e-mail",
      };
    }

    // Générer le PDF de la facture si nécessaire
    if (emailOptions.includeFacturePDF) {
      await generateInvoicePDF(facture);
    }

    // Simulation de l'envoi d'e-mail - dans une vraie implémentation,
    // on appellerait ici un service d'e-mail
    console.log(
      `Simulation d'envoi d'e-mail pour la facture ${facture.numero}`
    );
    console.log(`Destinataire: ${facture.client.email}`);
    console.log(
      `Objet: ${remplacerVariables(emailOptions.objetEmail || "", facture)}`
    );
    console.log(
      `Corps: ${remplacerVariables(emailOptions.corpsEmail || "", facture)}`
    );

    // Dans un environnement de production, c'est ici qu'on enverrait réellement l'e-mail
    // à l'aide d'une API côté serveur

    // Mise à jour du statut de la facture à "Envoyée" si elle n'est pas déjà "Payée"
    if (facture.statut !== "Payée") {
      await updateDoc(doc(db, "factures", facture.id), {
        statut: "Envoyée",
      });
    }

    return {
      success: true,
      message: `Facture ${facture.numero} envoyée avec succès à ${facture.client.email}`,
    };
  } catch (error) {
    console.error("Erreur lors de l'envoi de la facture par e-mail:", error);
    return {
      success: false,
      message: `Erreur: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
    };
  }
};

/**
 * Envoyer un rappel pour une facture impayée
 */
export const envoyerRappelFacture = async (
  facture: Facture,
  options: EmailOptions = {}
): Promise<{ success: boolean; message: string }> => {
  try {
    // Options par défaut pour les rappels
    const rappelOptions: EmailOptions = {
      objetEmail: "RAPPEL: Facture [NUM_FACTURE] en attente de paiement",
      corpsEmail: `Bonjour,

Nous vous rappelons que la facture [NUM_FACTURE] d'un montant de [MONTANT_TTC] € datée du [DATE_FACTURE] est toujours en attente de paiement.

Merci de bien vouloir procéder à son règlement dans les meilleurs délais.

Cordialement,
[NOM_ENTREPRISE]`,
      includeFacturePDF: true,
      includeSignature: true,
    };

    // Fusionner avec les options fournies
    const emailOptions = { ...rappelOptions, ...options };

    // Utiliser la fonction d'envoi standard
    return await envoyerFactureParEmail(facture, emailOptions);
  } catch (error) {
    console.error("Erreur lors de l'envoi du rappel:", error);
    return {
      success: false,
      message: `Erreur: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
    };
  }
};

/**
 * Remplacer les variables dans le texte de l'e-mail
 */
const remplacerVariables = (texte: string, facture: Facture): string => {
  let dateStr = "";

  if (facture.dateCreation instanceof Date) {
    dateStr = facture.dateCreation.toLocaleDateString("fr-FR");
  } else if (typeof facture.dateCreation === "string") {
    try {
      dateStr = new Date(facture.dateCreation).toLocaleDateString("fr-FR");
    } catch (e) {
      dateStr = new Date().toLocaleDateString("fr-FR");
    }
  } else {
    dateStr = new Date().toLocaleDateString("fr-FR");
  }

  return texte
    .replace(/\[NUM_FACTURE\]/g, facture.numero)
    .replace(/\[MONTANT_TTC\]/g, facture.totalTTC.toFixed(2))
    .replace(/\[MONTANT_HT\]/g, facture.totalHT.toFixed(2))
    .replace(/\[DATE_FACTURE\]/g, dateStr)
    .replace(/\[NOM_CLIENT\]/g, facture.client.nom)
    .replace(/\[NOM_ENTREPRISE\]/g, "Votre Entreprise"); // À remplacer par le nom réel de l'entreprise
};
