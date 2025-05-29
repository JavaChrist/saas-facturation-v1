/**
 * Service d'envoi d'emails avec Resend
 * 
 * CONFIGURATION DU SERVICE D'EMAIL
 * ================================
 * 
 * Resend est utilisé pour l'envoi des emails depuis l'application.
 * Ce service utilise l'API route /api/send-email pour traiter les demandes.
 */

import {
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";

// Service pour l'envoi d'emails
export const emailService = {
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

      // Créer un ID unique pour la demande
      const requestId = `request_${new Date().getTime()}_${Math.random().toString(36).substring(2, 11)}`;

      // Enregistrer la demande dans Firestore
      try {
        await addDoc(collection(db, "contactRequests"), {
          name,
          email,
          message,
          date: new Date(),
          status: "pending",
          source: "subscription_page",
          requestId,
          adminOnly: true,
          adminEmail: "support@javachrist.fr",
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'Server',
            language: typeof navigator !== 'undefined' ? navigator.language : 'fr-FR',
          },
        });

        // Envoyer l'email via l'API Resend
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'contact',
            name,
            email,
            message,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erreur lors de l\'envoi de l\'email');
        }

        return {
          success: true,
          message: `Votre demande a été envoyée avec succès. Notre équipe commerciale vous contactera prochainement.`,
        };
      } catch (dbError) {
        console.error("Erreur enregistrement contact:", dbError);
        throw dbError;
      }
    } catch (error: any) {
      console.error("Erreur envoi contact:", error);
      return {
        success: false,
        message: error.message || "Erreur lors de l'envoi de la demande",
      };
    }
  },

  /**
   * Envoyer une invitation à un utilisateur pour rejoindre l'organisation
   * @param email Email de l'utilisateur à inviter
   * @param organizationId Identifiant de l'organisation
   * @param role Rôle de l'utilisateur dans l'organisation
   * @returns Résultat de l'opération
   */
  sendUserInvitation: async (
    email: string,
    organizationId: string,
    role: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Vérifier les paramètres
      if (!email || !organizationId) {
        return {
          success: false,
          message: "Email et ID d'organisation requis",
        };
      }

      // Créer un ID unique pour l'invitation
      const invitationId = `inv_${new Date().getTime()}_${Math.random().toString(36).substring(2, 11)}`;

      // Enregistrer l'invitation dans Firestore
      try {
        // Obtenir l'ID de l'utilisateur authentifié 
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          return {
            success: false,
            message: "Vous devez être connecté pour envoyer une invitation",
          };
        }

        await addDoc(collection(db, "invitations"), {
          email,
          organizationId,
          role,
          invitationId,
          date: new Date(),
          status: "pending",
          createdBy: currentUser.uid,
        });

        // Envoyer l'email d'invitation via l'API Resend
        const response = await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'invitation',
            email,
            organizationId,
            role,
            invitationId,
            inviterName: currentUser.displayName || currentUser.email || "L'équipe",
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erreur lors de l\'envoi de l\'invitation');
        }

        return {
          success: true,
          message: `Invitation envoyée avec succès à ${email}.`,
        };
      } catch (dbError) {
        console.error("Erreur enregistrement invitation:", dbError);
        throw dbError;
      }
    } catch (error: any) {
      console.error("Erreur envoi invitation:", error);
      return {
        success: false,
        message: error.message || "Erreur lors de l'envoi de l'invitation",
      };
    }
  },
};
