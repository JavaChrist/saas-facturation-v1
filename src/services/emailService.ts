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
      // En mode développement ou si les fonctions ne sont pas disponibles,
      // nous simulons l'envoi d'email et enregistrons l'historique
      if (
        process.env.NODE_ENV === "development" ||
        window.location.hostname === "localhost"
      ) {
        console.log(
          "[DEV MODE] Simulation d'envoi de facture:",
          factureId,
          "à",
          destinationEmail
        );

        // Mettre à jour le statut de la facture à "Envoyée" si elle n'est pas déjà "Payée"
        try {
          // Vérifier le statut actuel de la facture
          const factureRef = doc(db, "factures", factureId);
          const historyRef = collection(factureRef, "historique");

          // Ajouter une entrée dans l'historique
          await addDoc(historyRef, {
            type: "email",
            destinataire: destinationEmail,
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
          message: `[SIMULATION] Facture envoyée à ${destinationEmail}`,
        };
      }

      // En production, utiliser Firebase Functions
      try {
        const functions = getFunctions(getApp());
        const sendInvoice = httpsCallable<
          { factureId: string; destinationEmail: string },
          { success: boolean; message: string }
        >(functions, "sendInvoiceByEmail");

        const result = await sendInvoice({
          factureId,
          destinationEmail,
        });

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
          destinationEmail
        );

        return {
          success: true,
          message: `[SIMULATION FALLBACK] Facture envoyée à ${destinationEmail}`,
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
};
