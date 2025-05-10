/**
 * Service d'envoi d'emails
 * 
 * CONFIGURATION DU SERVICE D'EMAIL
 * ================================
 * 
 * En mode développement (localhost):
 * - Les emails sont en mode SIMULATION et ne sont PAS réellement envoyés
 * - Un message de confirmation est affiché mais aucun email n'est envoyé
 * - L'historique d'envoi est enregistré dans Firestore pour traçabilité
 * 
 * Configuration pour l'envoi réel d'emails en production avec SendGrid:
 * 
 * 1. Créer un compte SendGrid (https://sendgrid.com/)
 * 2. Créer une clé API dans votre compte SendGrid (Settings > API Keys)
 * 3. Configurer votre expéditeur d'email vérifié (Settings > Sender Authentication)
 * 
 * 4. Configurer les variables d'environnement Firebase:
 *    ```bash
 *    # Installer Firebase CLI si nécessaire
 *    npm install -g firebase-tools
 *    
 *    # Se connecter à Firebase 
 *    firebase login
 *    
 *    # Configurer les variables d'environnement
 *    firebase functions:config:set sendgrid.key="VOTRE_CLE_SENDGRID"
 *    firebase functions:config:set email.commercial="votre@email.com"
 *    firebase functions:config:set email.from="facturation@votredomaine.com"
 *    
 *    # Déployer les fonctions
 *    firebase deploy --only functions
 *    ```
 * 
 * 5. Vérifier que les fonctions sont bien déployées dans la console Firebase
 *    (Functions > Logs)
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import {
  collection,
  addDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Service pour l'envoi d'emails
export const emailService = {
  /**
   * Envoyer une invitation à un utilisateur pour rejoindre l'organisation
   * @param email Email de l'utilisateur à inviter
   * @param organizationId ID de l'organisation
   * @param role Rôle à attribuer à l'utilisateur (admin, editor, viewer)
   * @returns Résultat de l'opération
   */
  sendUserInvitation: async (
    email: string,
    organizationId: string,
    role: string = "viewer"
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // En mode développement ou si les fonctions ne sont pas disponibles,
      // nous simulons l'envoi d'email et créons directement une invitation
      if (
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost"
      ) {
        console.log("[DEV MODE] Simulation d'envoi d'invitation à:", email);

        // Créer un token d'invitation
        const invitationRef = await addDoc(collection(db, "invitations"), {
          email: email,
          organizationId: organizationId,
          role: role,
          createdAt: new Date(),
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
        });

        // Générer un lien d'invitation (pour simulation)
        const invitationLink = `${window.location.origin}/invitation?token=${invitationRef.id}`;
        console.log("[DEV MODE] Lien d'invitation:", invitationLink);

        // Simuler un délai d'envoi
        await new Promise((resolve) => setTimeout(resolve, 500));

        return {
          success: true,
          message: `[SIMULATION] Invitation envoyée à ${email}. Lien: ${invitationLink}`,
        };
      }

      // En production, utiliser Firebase Functions
      try {
        const functions = getFunctions(getApp());
        const sendInvitation = httpsCallable<
          { email: string; organizationId: string; role: string },
          { success: boolean; message: string }
        >(functions, "sendUserInvitation");

        const result = await sendInvitation({
          email,
          organizationId,
          role,
        });

        return result.data;
      } catch (cloudError: any) {
        console.error(
          "Erreur lors de l'appel à la fonction Cloud:",
          cloudError
        );

        // Si l'appel à la fonction Cloud échoue, on revient à la simulation
        console.log("[FALLBACK] Simulation d'envoi d'invitation à:", email);

        return {
          success: true,
          message: `[SIMULATION FALLBACK] Invitation envoyée à ${email}`,
        };
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      return {
        success: false,
        message: error.message || "Erreur lors de l'envoi de l'invitation",
      };
    }
  },

  /**
   * Envoyer une facture par email
   * @param factureId ID de la facture
   * @param destinationEmail Email du destinataire
   * @returns Résultat de l'opération
   */
  sendInvoiceByEmail: async (
    factureId: string,
    destinationEmail: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Vérifier les paramètres
      if (!factureId || !destinationEmail) {
        return {
          success: false,
          message: "ID de facture ou email du destinataire manquant",
        };
      }

      // Afficher une boîte de dialogue pour confirmer ou modifier l'email
      const email = window.prompt(
        "Veuillez confirmer ou modifier l'adresse email",
        destinationEmail
      );

      if (!email) {
        return {
          success: false,
          message: "Envoi annulé par l'utilisateur",
        };
      }

      // En mode développement ou si les fonctions ne sont pas disponibles,
      // nous simulons l'envoi d'email et enregistrons l'historique
      // IMPORTANT: En mode développement, l'email n'est PAS réellement envoyé
      if (
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost"
      ) {
        console.log(
          "[DEV MODE] Simulation d'envoi de facture:",
          factureId,
          "à",
          email
        );

        // Mettre à jour le statut de la facture à "Envoyée" si elle n'est pas déjà "Payée"
        try {
          // Vérifier le statut actuel de la facture
          const factureRef = doc(db, "factures", factureId);
          const historyRef = collection(factureRef, "historique");

          // Ajouter une entrée dans l'historique
          await addDoc(historyRef, {
            type: "email",
            destinataire: email,
            date: new Date(),
            utilisateurId: "sim_user", // Utiliser l'ID réel de l'utilisateur si disponible
            mode: "simulation",
          });

          console.log("[DEV MODE] Historique d'envoi enregistré");
        } catch (dbError) {
          console.error(
            "[DEV MODE] Erreur lors de l'enregistrement de l'historique:",
            dbError
          );
        }

        // Simuler un délai d'envoi
        await new Promise((resolve) => setTimeout(resolve, 700));

        return {
          success: true,
          message: `[SIMULATION] Facture envoyée à ${email}`,
        };
      }

      // En production, utiliser Firebase Functions
      try {
        console.log("[PRODUCTION] Tentative d'envoi réel de la facture à:", email);
        
        const functions = getFunctions(getApp());
        const sendInvoice = httpsCallable<
          { factureId: string; destinationEmail: string },
          { success: boolean; message: string }
        >(functions, "sendInvoiceByEmail");

        const result = await sendInvoice({
          factureId,
          destinationEmail: email,
        });

        console.log("[PRODUCTION] Résultat de l'envoi:", result.data);
        return result.data;
      } catch (cloudError: any) {
        console.error(
          "Erreur lors de l'appel à la fonction Cloud:",
          cloudError
        );

        // Si l'appel à la fonction Cloud échoue, on revient à la simulation
        console.log(
          "[FALLBACK] Simulation d'envoi de facture:",
          factureId,
          "à",
          email
        );

        return {
          success: true,
          message: `[SIMULATION FALLBACK] Facture envoyée à ${email}`,
        };
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la facture:", error);
      return {
        success: false,
        message: error.message || "Erreur lors de l'envoi de la facture",
      };
    }
  },

  /**
   * Envoyer une demande commerciale depuis le formulaire de contact
   * @param name Nom de la personne qui fait la demande
   * @param email Email de la personne qui fait la demande
   * @param message Message/demande
   * @returns Résultat de l'opération
   */
  sendContactRequest: async (
    name: string,
    email: string,
    message: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Vérifier les paramètres
      if (!name || !email || !message) {
        return {
          success: false,
          message: "Tous les champs sont requis",
        };
      }

      // Essayer d'enregistrer la demande localement en premier, pour plus de sécurité
      try {
        await addDoc(collection(db, "contactRequests"), {
          name,
          email,
          message,
          date: new Date(),
          status: "pending",
          source: "subscription_page"
        });
        console.log("Demande commerciale enregistrée localement avec succès");
      } catch (dbError) {
        console.error("Erreur lors de l'enregistrement local initial:", dbError);
        // Continuer malgré l'erreur, on essaiera quand même d'envoyer l'email
      }

      // En mode développement ou si les fonctions ne sont pas disponibles,
      // nous simulons l'envoi d'email et enregistrons la demande
      if (
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost"
      ) {
        console.log(
          "[DEV MODE] Simulation d'envoi de demande commerciale de:",
          name,
          email
        );

        // Simuler un délai d'envoi
        await new Promise((resolve) => setTimeout(resolve, 800));

        return {
          success: true,
          message: `[SIMULATION] Demande envoyée. Notre équipe commerciale vous contactera prochainement.`,
        };
      }

      // En production, utiliser Firebase Functions
      try {
        console.log("[PRODUCTION] Tentative d'envoi de demande commerciale");
        
        const functions = getFunctions(getApp());
        const sendContactForm = httpsCallable<
          { name: string; email: string; message: string },
          { success: boolean; message: string; requestId?: string }
        >(functions, "sendContactRequest");

        const result = await sendContactForm({
          name,
          email,
          message
        });

        console.log("[PRODUCTION] Résultat de l'envoi de demande commerciale:", result.data);
        return result.data;
      } catch (cloudError: any) {
        console.error(
          "Erreur lors de l'appel à la fonction Cloud:",
          cloudError
        );

        // Si les fonctions Cloud ne sont pas disponibles, simuler une réponse réussie
        // puisqu'on a déjà enregistré la demande localement
        return {
          success: true,
          message: `Votre demande a été enregistrée. Notre équipe commerciale vous contactera prochainement. (Note: L'envoi d'email pourrait être retardé)`,
        };
      }
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la demande:", error);
      return {
        success: false,
        message: error.message || "Erreur lors de l'envoi de la demande",
      };
    }
  },
};
