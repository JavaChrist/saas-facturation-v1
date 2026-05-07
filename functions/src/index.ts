/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as dotenv from "dotenv";
dotenv.config();

import * as functions from "firebase-functions/v1"; // Utiliser v1 pour la compatibilité
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Type pour corriger les erreurs de compilation
interface InvitationData {
  email: string;
  organizationId: string;
  role?: string;
}

interface InvoiceData {
  factureId: string;
  destinationEmail: string;
}

interface ContactRequestData {
  name: string;
  email: string;
  message: string;
}

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// Initialiser Firebase Admin
admin.initializeApp();

// Configuration email via .env (functions.config() déprécié depuis déc. 2025)
const COMMERCIAL_EMAIL = process.env.COMMERCIAL_EMAIL || process.env.EMAIL_USER || "votre-email@domaine.com";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || "facturation@votredomaine.com";

// Région Europe pour les fonctions (RGPD, latence)
const europeFunctions = functions.region("europe-west1");

// Configuration du transporteur d'email - IONOS SMTP (France)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ionos.fr",
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Fonction utilitaire pour envoyer un email via Nodemailer
async function sendEmail(mailOptions: any): Promise<void> {
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Erreur lors de l'envoi d'email:", error);
    throw error;
  }
}

// Template d'email pour les invitations utilisateurs
const createUserInvitationEmail = (
  destinationEmail: string,
  senderName: string,
  organizationName: string,
  invitationLink: string
) => {
  return {
    from: `"${senderName} via FacturationSaaS" <${EMAIL_FROM}>`,
    to: destinationEmail,
    subject: `Invitation à rejoindre ${organizationName} sur FacturationSaaS`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Invitation à rejoindre ${organizationName}</h2>
        <p>Bonjour,</p>
        <p>${senderName} vous invite à rejoindre ${organizationName} sur FacturationSaaS, la plateforme de facturation en ligne.</p>
        <p>Avec FacturationSaaS, vous pourrez :</p>
        <ul>
          <li>Gérer les factures</li>
          <li>Suivre les paiements</li>
          <li>Collaborer avec votre équipe</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationLink}" style="background-color: #4a6cf7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Accepter l'invitation
          </a>
        </div>
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${invitationLink}</p>
        <p>Ce lien expirera dans 7 jours.</p>
        <p>Cordialement,<br>L'équipe FacturationSaaS</p>
      </div>
    `,
  };
};

// Template d'email pour l'envoi de factures
const createInvoiceEmail = (
  destinationEmail: string,
  senderName: string,
  organizationName: string,
  invoiceNumber: string,
  invoiceDate: string,
  amount: string,
  pdfUrl: string
) => {
  return {
    from: `"${organizationName} via FacturationSaaS" <${EMAIL_FROM}>`,
    to: destinationEmail,
    subject: `Facture ${invoiceNumber} de ${organizationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Facture ${invoiceNumber}</h2>
        <p>Bonjour,</p>
        <p>Vous trouverez ci-joint la facture ${invoiceNumber} de ${organizationName} datée du ${invoiceDate} d'un montant de ${amount} €.</p>
        <p>Vous pouvez consulter cette facture en ligne ou la télécharger en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="background-color: #4a6cf7; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Voir la facture
          </a>
        </div>
        <p>Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :</p>
        <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${pdfUrl}</p>
        <p>Merci pour votre confiance.</p>
        <p>Cordialement,<br>${organizationName}</p>
      </div>
    `,
    attachments: [
      {
        filename: `Facture_${invoiceNumber}.pdf`,
        path: pdfUrl, // Si l'URL directement accessible. Sinon, vous devrez d'abord télécharger le PDF.
      },
    ],
  };
};

// Template d'email pour le service commercial (notification interne)
const createCommercialEmail = (
  name: string,
  email: string,
  message: string
) => {
  return {
    from: `"Service Commercial FacturationSaaS" <${EMAIL_FROM}>`,
    to: COMMERCIAL_EMAIL,
    subject: `Nouvelle demande commerciale de ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Nouvelle demande commerciale</h2>
        <p><strong>De:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p>Pour répondre, vous pouvez directement contacter cette personne à l'adresse: ${email}</p>
      </div>
    `,
  };
};

// Template d'email pour la confirmation au client
const createClientConfirmationEmail = (
  name: string,
  email: string
) => {
  return {
    from: `"Service Commercial FacturationSaaS" <${EMAIL_FROM}>`,
    to: email,
    subject: `Confirmation de votre demande commerciale`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">Votre demande a bien été reçue</h2>
        <p>Bonjour ${name},</p>
        <p>Nous confirmons avoir bien reçu votre demande commerciale.</p>
        <p>Notre équipe commerciale vous contactera dans les plus brefs délais pour discuter de vos besoins.</p>
        <p>Nous vous remercions de l'intérêt que vous portez à nos services.</p>
        <p>Cordialement,<br>L'équipe FacturationSaaS</p>
      </div>
    `,
  };
};

// Fonction pour envoyer une invitation à un utilisateur
exports.sendUserInvitation = europeFunctions.https.onCall(
  async (data: InvitationData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour effectuer cette action."
      );
    }

    try {
      const { email, organizationId, role } = data;

      if (!email || !organizationId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email et ID d'organisation requis."
        );
      }

      // Obtenir les détails de l'organisation
      const orgDoc = await admin
        .firestore()
        .collection("organisations")
        .doc(organizationId)
        .get();
      if (!orgDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Organisation non trouvée."
        );
      }

      const organizationData = orgDoc.data();

      // Obtenir les informations de l'utilisateur qui envoie l'invitation
      const sender = await admin.auth().getUser(context.auth.uid);
      const senderName = sender.displayName || sender.email || "Administrateur";

      // Générer un token d'invitation (valide 7 jours)
      const invitationToken = admin.firestore().collection("invitations").doc();
      await invitationToken.set({
        email: email,
        organizationId: organizationId,
        role: role || "viewer",
        createdBy: context.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Construire le lien d'invitation
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const invitationLink = `${baseUrl}/invitation?token=${invitationToken.id}`;

      // Envoyer l'email
      const mailOptions = createUserInvitationEmail(
        email,
        senderName,
        organizationData?.nom || "Mon Organisation",
        invitationLink
      );

      await sendEmail(mailOptions);

      return { success: true, message: "Invitation envoyée avec succès" };
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Erreur lors de l'envoi de l'invitation: " + error.message
      );
    }
  }
);

// Fonction pour envoyer une facture par email
exports.sendInvoiceByEmail = europeFunctions.https.onCall(
  async (data: InvoiceData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Vous devez être connecté pour effectuer cette action."
      );
    }

    try {
      const { factureId, destinationEmail } = data;

      if (!factureId || !destinationEmail) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "ID de facture et email de destination requis."
        );
      }

      // Récupérer les données de la facture
      const factureDoc = await admin
        .firestore()
        .collection("factures")
        .doc(factureId)
        .get();
      if (!factureDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Facture non trouvée."
        );
      }

      const factureData = factureDoc.data();

      // Récupérer les données de l'organisation
      let organizationName = "Mon Entreprise";
      if (factureData?.organisationId) {
        const orgDoc = await admin
          .firestore()
          .collection("organisations")
          .doc(factureData.organisationId)
          .get();
        if (orgDoc.exists) {
          organizationName = orgDoc.data()?.nom || organizationName;
        }
      }

      // Générer ou récupérer l'URL du PDF de la facture
      let pdfUrl = factureData?.pdfUrl;

      // Si l'URL n'existe pas, générer une URL temporaire depuis Storage
      if (!pdfUrl && factureData?.pdfPath) {
        try {
          const file = admin.storage().bucket().file(factureData.pdfPath);
          // Générer une URL signée valide pendant 7 jours
          const [url] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          pdfUrl = url;
        } catch (storageError) {
          console.error("Erreur lors de la génération de l'URL du PDF:", storageError);
          throw new functions.https.HttpsError(
            "internal",
            "Impossible de générer l'URL du PDF."
          );
        }
      }

      // Si nous n'avons toujours pas d'URL, retourner une erreur
      if (!pdfUrl) {
        throw new functions.https.HttpsError(
          "internal",
          "Aucun PDF disponible pour cette facture."
        );
      }

      // Formater la date de la facture
      const invoiceDate = factureData?.date
        ? new Date(factureData.date.seconds * 1000).toLocaleDateString("fr-FR")
        : new Date().toLocaleDateString("fr-FR");

      // Envoyer l'email
      const mailOptions = createInvoiceEmail(
        destinationEmail,
        context.auth.token.name || "Administrateur",
        organizationName,
        factureData?.numero || factureId,
        invoiceDate,
        factureData?.montantTotal
          ? `${factureData.montantTotal.toFixed(2)}`
          : "Montant non spécifié",
        pdfUrl
      );

      await sendEmail(mailOptions);

      // Enregistrer l'historique d'envoi d'email
      await admin
        .firestore()
        .collection("factures")
        .doc(factureId)
        .collection("historique")
        .add({
          type: "email",
          destinataire: destinationEmail,
          date: admin.firestore.FieldValue.serverTimestamp(),
          utilisateurId: context.auth.uid,
        });

      return { success: true, message: "Facture envoyée avec succès" };
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la facture:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Erreur lors de l'envoi de la facture: " + error.message
      );
    }
  }
);

// Fonction planifiée : rappels automatiques pour les factures en retard (tous les jours à 9h)
exports.sendDailyPaymentReminders = europeFunctions.pubsub
  .schedule("0 9 * * *")
  .timeZone("Europe/Paris")
  .onRun(async (context) => {
    console.log("Démarrage des rappels automatiques pour factures en retard");

    // Vérifier la config email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error("EMAIL_USER ou EMAIL_PASSWORD manquant dans .env");
      return null;
    }

    try {
      const db = admin.firestore();
      const facturesSnapshot = await db
        .collection("factures")
        .where("statut", "==", "À relancer")
        .get();

      console.log(`${facturesSnapshot.size} facture(s) à relancer trouvée(s)`);

      let emailsSent = 0;
      for (const doc of facturesSnapshot.docs) {
        const facture = doc.data();
        const client = facture.client;
        const clientEmail =
          client?.emails?.[0]?.email || client?.email;

        if (!clientEmail) {
          console.log(`Facture ${doc.id}: pas d'email client, ignorée`);
          continue;
        }

        const montant = typeof facture.totalTTC === "number"
          ? facture.totalTTC
          : parseFloat(facture.totalTTC) || 0;
        const numero = facture.numero || doc.id;
        const clientNom = client?.nom || "Client";

        const mailOptions = {
          from: `"FacturationSaaS - Rappel" <${process.env.EMAIL_USER}>`,
          to: clientEmail,
          subject: `Rappel : Facture ${numero} en attente de paiement`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Rappel de paiement</h2>
              <p>Bonjour ${clientNom},</p>
              <p>Nous vous rappelons que la facture <strong>${numero}</strong> d'un montant de <strong>${montant.toFixed(2)} €</strong> est en attente de paiement.</p>
              <p>Merci de procéder au règlement dans les plus brefs délais.</p>
              <p>Cordialement,<br>L'équipe FacturationSaaS</p>
            </div>
          `,
        };

        try {
          await sendEmail(mailOptions);
          emailsSent++;
          console.log(`Email de rappel envoyé pour facture ${numero} à ${clientEmail}`);
        } catch (emailError) {
          console.error(`Erreur envoi email pour facture ${doc.id}:`, emailError);
        }
      }

      console.log(`${emailsSent} email(s) de rappel envoyé(s)`);
      return null;
    } catch (error) {
      console.error("Erreur rappels automatiques:", error);
      // Ne pas rethrow pour éviter Internal Server Error - les logs restent visibles
      return null;
    }
  });

// Fonction pour envoyer une demande commerciale
exports.sendContactRequest = europeFunctions.https.onCall(
  async (data: ContactRequestData, context: functions.https.CallableContext) => {
    try {
      const { name, email, message } = data;

      if (!name || !email || !message) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Tous les champs sont requis."
        );
      }

      // Enregistrer la demande dans Firestore
      const requestRef = await admin.firestore().collection("contactRequests").add({
        name,
        email,
        message,
        date: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending",
        source: "subscription_page",
        userId: context.auth ? context.auth.uid : null,
      });

      // Envoyer un email au service commercial
      const commercialMailOptions = createCommercialEmail(name, email, message);
      await sendEmail(commercialMailOptions);

      // Envoyer un email de confirmation au client
      const clientMailOptions = createClientConfirmationEmail(name, email);
      await sendEmail(clientMailOptions);

      return { 
        success: true, 
        message: "Votre demande a été envoyée avec succès. Notre équipe commerciale vous contactera prochainement.",
        requestId: requestRef.id
      };
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la demande commerciale:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Erreur lors de l'envoi de la demande: " + error.message
      );
    }
  }
);
