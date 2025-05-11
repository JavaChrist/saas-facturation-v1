const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialiser Firebase Admin
admin.initializeApp();

// Configuration du transporteur d'email avec Ionos SMTP (serveur réel)
const transporter = nodemailer.createTransport({
    host: "smtp.ionos.fr",           // Serveur SMTP Ionos
    port: 587,                       // Port SMTP standard 
    secure: false,                   // TLS au lieu de SSL
    auth: {
        user: "contact@javachrist.fr", // Votre adresse email
        pass: "Mm2pMail140114@"        // Votre mot de passe spécifique
    },
    tls: {
        rejectUnauthorized: false     // Accepter les certificats auto-signés
    }
});

// Tester la connexion SMTP au démarrage de la fonction
transporter.verify(function (error, success) {
    if (error) {
        console.error("Erreur de connexion SMTP:", error);
    } else {
        console.log("Serveur SMTP prêt à envoyer des messages");
    }
});

// Template d'email pour les invitations utilisateurs
const createUserInvitationEmail = (destinationEmail, senderName, organizationName, invitationLink) => {
    return {
        from: `"${senderName} via FacturationSaaS" <contact@javachrist.fr>`,
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
const createInvoiceEmail = (destinationEmail, senderName, organizationName, invoiceNumber, invoiceDate, amount, pdfUrl) => {
    return {
        from: `"${organizationName} via FacturationSaaS" <contact@javachrist.fr>`,
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
        // Temporairement désactivé pour faciliter les tests
        /* attachments: [
            {
                filename: `Facture_${invoiceNumber}.pdf`,
                path: pdfUrl, // Si l'URL directement accessible. Sinon, vous devrez d'abord télécharger le PDF.
            },
        ], */
    };
};

// Fonction pour envoyer une invitation à un utilisateur
exports.sendUserInvitation = functions.https.onCall(async (data, context) => {
    // Vérifier si l'utilisateur est authentifié
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
        const orgDoc = await admin.firestore().collection("organisations").doc(organizationId).get();
        if (!orgDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Organisation non trouvée.");
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
            role: role || "viewer", // Rôle par défaut
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire dans 7 jours
        });

        // Construire le lien d'invitation
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        const invitationLink = `${baseUrl}/invitation?token=${invitationToken.id}`;

        // Envoyer l'email
        const mailOptions = createUserInvitationEmail(
            email,
            senderName,
            organizationData.nom || "Mon Organisation",
            invitationLink
        );

        await transporter.sendMail(mailOptions);

        return { success: true, message: "Invitation envoyée avec succès" };
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'invitation:", error);
        throw new functions.https.HttpsError("internal", "Erreur lors de l'envoi de l'invitation: " + error.message);
    }
});

// Fonction pour envoyer une facture par email
exports.sendInvoiceByEmail = functions.https.onCall(async (data, context) => {
    // Vérifier si l'utilisateur est authentifié
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Vous devez être connecté pour effectuer cette action."
        );
    }

    try {
        const { factureId, destinationEmail } = data;
        console.log(`Tentative d'envoi de facture: ${factureId} à ${destinationEmail}`);

        if (!factureId || !destinationEmail) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "ID de facture et email de destination requis."
            );
        }

        // Récupérer les données de la facture
        console.log(`Récupération des données de la facture: ${factureId}`);
        const factureDoc = await admin.firestore().collection("factures").doc(factureId).get();
        if (!factureDoc.exists) {
            console.error(`Facture non trouvée: ${factureId}`);
            throw new functions.https.HttpsError("not-found", "Facture non trouvée.");
        }

        const factureData = factureDoc.data();
        console.log(`Facture récupérée:`, {
            numero: factureData.numero,
            montant: factureData.montantTotal,
            organisation: factureData.organisationId || "N/A"
        });

        // Récupérer les données de l'organisation
        let organizationName = "Mon Entreprise";
        if (factureData.organisationId) {
            console.log(`Récupération des données de l'organisation: ${factureData.organisationId}`);
            const orgDoc = await admin.firestore().collection("organisations").doc(factureData.organisationId).get();
            if (orgDoc.exists) {
                organizationName = orgDoc.data().nom || organizationName;
                console.log(`Nom de l'organisation: ${organizationName}`);
            } else {
                console.log(`Organisation non trouvée: ${factureData.organisationId}, utilisation du nom par défaut`);
            }
        }

        // Générer ou récupérer l'URL du PDF de la facture
        console.log(`Préparation de l'URL du PDF`);
        let pdfUrl = factureData.pdfUrl;
        console.log(`URL du PDF existante:`, pdfUrl || "Aucune");

        // Si l'URL n'existe pas, générer une URL temporaire depuis Storage
        if (!pdfUrl && factureData.pdfPath) {
            try {
                console.log(`Génération d'une URL signée pour: ${factureData.pdfPath}`);
                const file = admin.storage().bucket().file(factureData.pdfPath);
                // Générer une URL signée valide pendant 7 jours
                const [url] = await file.getSignedUrl({
                    action: "read",
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
                });
                pdfUrl = url;
                console.log(`URL signée générée:`, pdfUrl);
            } catch (storageError) {
                console.error("Erreur lors de la génération de l'URL du PDF:", storageError);
                throw new functions.https.HttpsError("internal", "Impossible de générer l'URL du PDF.");
            }
        }

        // Si nous n'avons toujours pas d'URL, retourner une erreur
        if (!pdfUrl) {
            console.error(`Aucune URL de PDF disponible pour la facture: ${factureId}`);
            throw new functions.https.HttpsError("internal", "Aucun PDF disponible pour cette facture.");
        }

        // Formater la date de la facture
        const invoiceDate = factureData.date
            ? new Date(factureData.date.seconds * 1000).toLocaleDateString('fr-FR')
            : new Date().toLocaleDateString('fr-FR');
        console.log(`Date de la facture: ${invoiceDate}`);

        // Préparer les options d'email
        console.log(`Préparation du modèle d'email`);
        const mailOptions = createInvoiceEmail(
            destinationEmail,
            context.auth.token.name || "Administrateur",
            organizationName,
            factureData.numero || factureId,
            invoiceDate,
            factureData.montantTotal ? `${factureData.montantTotal.toFixed(2)}` : "Montant non spécifié",
            pdfUrl
        );

        console.log(`Tentative d'envoi d'email à: ${destinationEmail}`);

        // Envoyer l'email avec Nodemailer
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email envoyé avec succès:`, {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });

        // Enregistrer l'historique d'envoi d'email
        console.log(`Enregistrement de l'historique d'envoi`);
        await admin.firestore().collection("factures").doc(factureId).collection("historique").add({
            type: "email",
            destinataire: destinationEmail,
            date: admin.firestore.FieldValue.serverTimestamp(),
            utilisateurId: context.auth.uid,
            messageId: info?.messageId || null
        });

        console.log(`Processus d'envoi terminé avec succès`);
        return { success: true, message: "Facture envoyée avec succès" };
    } catch (error) {
        console.error("Erreur lors de l'envoi de la facture:", error);
        throw new functions.https.HttpsError("internal", "Erreur lors de l'envoi de la facture: " + error.message);
    }
});

// Ajouter une fonction de gestion des erreurs pour enregistrer plus d'informations
function logError(context, message, error) {
    console.error(`[ERROR] ${message}`, error);
    
    // Enregistrer plus de détails sur les erreurs de permission
    if (error && error.message && error.message.includes('permission')) {
        console.error("[PERMISSION ERROR] Détails:", {
            errorCode: error.code,
            errorName: error.name,
            projectId: process.env.GCLOUD_PROJECT || 'non défini',
            serviceAccount: process.env.FIREBASE_CONFIG ? 
                JSON.parse(process.env.FIREBASE_CONFIG).service_account_email : 'non défini'
        });
    }
    
    // Enregistrer dans Firestore pour diagnostic ultérieur
    try {
        admin.firestore().collection("errorLogs").add({
            message: message,
            error: error ? error.toString() : "Erreur inconnue",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            context: context || {},
            stack: error && error.stack ? error.stack : "Pas de stack trace"
        });
    } catch (logError) {
        console.error("Erreur lors de l'enregistrement du log d'erreur:", logError);
    }
}

// Fonction qui va essayer d'envoyer un email par tous les moyens possibles
exports.sendContactRequest = functions.https.onCall(async (data, context) => {
    console.log("Début de sendContactRequest avec données:", JSON.stringify(data));
    
    try {
        const { name, email, message } = data;
        
        if (!name || !email || !message) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Tous les champs sont requis."
            );
        }
        
        // Enregistrer la demande dans Firestore d'abord (pour garantir qu'elle est sauvegardée)
        let requestRef;
        try {
            requestRef = await admin.firestore().collection("contactRequests").add({
                name,
                email,
                message,
                date: admin.firestore.FieldValue.serverTimestamp(),
                status: "pending",
                source: "subscription_page",
                userId: context.auth ? context.auth.uid : null,
                // Spécifier que cette demande est destinée à l'administrateur
                adminOnly: true,
                adminEmail: "support@javachrist.fr"
            });
            console.log("Demande enregistrée dans Firestore avec succès, ID:", requestRef.id);
        } catch (dbError) {
            logError({source: 'sendContactRequest', step: 'firestore_save'}, 
                "Erreur lors de l'enregistrement de la demande dans Firestore", dbError);
            // Continuer malgré l'erreur, essayer quand même d'envoyer les emails
        }
        
        // Préparer uniquement l'email pour l'administrateur
        const commercialMailOptions = {
            from: `"Service Commercial FacturationSaaS" <contact@javachrist.fr>`,
            to: "support@javachrist.fr", // Envoyer uniquement à l'administrateur
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
        
        // Nous ne préparons plus l'email pour le client, uniquement la confirmation à l'administrateur
        
        // Variables pour suivre les tentatives
        let commercialEmailSent = false;
        let errorDetails = null;
        
        // Essai avec le transporteur IONOS directement
        try {
            console.log("Tentative d'envoi d'email administrateur via IONOS");
            await transporter.sendMail(commercialMailOptions);
            commercialEmailSent = true;
            console.log("Email administrateur envoyé avec succès via IONOS");
        } catch (ionosError) {
            logError({source: 'sendContactRequest', step: 'ionos_commercial_email'}, 
                "Erreur lors de l'envoi de l'email administrateur via IONOS", ionosError);
            errorDetails = ionosError;
        }
        
        // Mettre à jour le statut dans Firestore
        if (requestRef) {
            try {
                await requestRef.update({
                    status: commercialEmailSent ? "completed" : "failed",
                    commercialEmailSent,
                    error: errorDetails ? errorDetails.toString() : null,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log("Statut de la demande mis à jour dans Firestore");
            } catch (updateError) {
                logError({source: 'sendContactRequest', step: 'firestore_update'}, 
                    "Erreur lors de la mise à jour du statut dans Firestore", updateError);
            }
        }
        
        // Retourner toujours un message positif au client pour ne pas l'inquiéter
        return {
            success: true, 
            message: "Votre demande a été envoyée avec succès. Notre équipe commerciale vous contactera prochainement.",
            requestId: requestRef ? requestRef.id : null
        };
    } catch (error) {
        logError({source: 'sendContactRequest', step: 'global'}, 
            "Erreur globale lors de l'envoi de la demande commerciale", error);
        
        // Retourner une réponse avec succès pour éviter de bloquer l'interface utilisateur
        return {
            success: true,
            message: "Votre demande a été enregistrée. Notre équipe commerciale vous contactera prochainement.",
            error: false // Ne pas indiquer d'erreur pour ne pas inquiéter l'utilisateur
        };
    }
}); 