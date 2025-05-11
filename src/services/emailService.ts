/**
 * Service d'envoi d'emails avec EmailJS
 * 
 * CONFIGURATION DU SERVICE D'EMAIL
 * ================================
 * 
 * EmailJS est utilisé pour l'envoi des emails depuis le formulaire de contact.
 * Ce service fonctionne directement depuis le navigateur et ne nécessite pas de backend.
 */

import {
  collection,
  addDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import emailjs from '@emailjs/browser';

// Configuration EmailJS
const EMAILJS_SERVICE_ID = "service_7p7k9dm"; // ID de service correct fourni par l'utilisateur
const EMAILJS_TEMPLATE_ID_ADMIN = "template_hpsrdrj"; // ID du template admin 
const EMAILJS_TEMPLATE_ID_CLIENT = "template_fvccesb"; // ID du template client
const EMAILJS_PUBLIC_KEY = "YCx1G77Q033P704UD"; // Clé publique EmailJS

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
          // Information pour l'administrateur uniquement
          adminOnly: true,
          adminEmail: "support@javachrist.fr",
          // Informations sur le dispositif pour traçabilité
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        });
        console.log("Demande commerciale enregistrée dans Firestore avec succès");
        
        // Envoyer un email via EmailJS
        try {
          console.log("Configuration EmailJS:", { 
            service: EMAILJS_SERVICE_ID, 
            template: EMAILJS_TEMPLATE_ID_ADMIN,
            publicKey: EMAILJS_PUBLIC_KEY
          });
           
          const templateParams = {
            to_email: "support@javachrist.fr",
            from_name: name,
            from_email: email,
            message: message,
            reply_to: email,
            subject: "Nouvelle demande de contact - Facturation SaaS"
          };
           
          console.log("Paramètres du template:", templateParams);
          
          const emailResult = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID_ADMIN,
            templateParams,
            EMAILJS_PUBLIC_KEY
          );
          
          console.log("Email envoyé avec succès via EmailJS:", emailResult.text);
          
          // Essayer d'envoyer un email de confirmation au client également
          try {
            const confirmationParams = {
              to_email: email,
              to_name: name,
              message: "Nous avons bien reçu votre demande et nous vous répondrons dans les plus brefs délais. Merci de nous avoir contactés!",
              subject: "Confirmation de votre demande - Facturation SaaS"
            };
            
            await emailjs.send(
              EMAILJS_SERVICE_ID,
              EMAILJS_TEMPLATE_ID_CLIENT,
              confirmationParams,
              EMAILJS_PUBLIC_KEY
            );
            
            console.log("Email de confirmation envoyé au client");
          } catch (confirmationError) {
            console.error("Erreur lors de l'envoi de l'email de confirmation:", confirmationError);
            // Ne pas échouer si l'email de confirmation n'est pas envoyé
          }
          
          return {
            success: true,
            message: `Votre demande a été envoyée avec succès. Notre équipe commerciale vous contactera prochainement.`,
          };
        } catch (emailError) {
          console.error("Erreur lors de l'envoi via EmailJS:", emailError);
          
          // Même si l'email échoue, nous avons enregistré la demande dans Firestore
          return {
            success: true,
            message: `Votre demande a été enregistrée. Notre équipe commerciale vous contactera prochainement.`,
          };
        }
      } catch (dbError) {
        console.error("Erreur lors de l'enregistrement de la demande:", dbError);
        throw dbError;
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
