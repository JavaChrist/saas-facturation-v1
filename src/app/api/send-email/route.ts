import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email de test forcé en mode développement
const FORCE_TEST_EMAIL = "contact@javachrist.fr";
const isDevelopment = process.env.NODE_ENV === "development";

export async function POST(request: NextRequest) {
  try {
    const { type, ...data } = await request.json();

    let emailResponse;

    switch (type) {
      case 'contact':
        emailResponse = await sendContactEmail(data);
        break;
      case 'invitation':
        emailResponse = await sendInvitationEmail(data);
        break;
      default:
        return NextResponse.json(
          { success: false, message: "Type d'email non supporté" },
          { status: 400 }
        );
    }

    return NextResponse.json(emailResponse);
  } catch (error) {
    console.error("Erreur API email:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de l'envoi de l'email" },
      { status: 500 }
    );
  }
}

// Fonction pour envoyer un email de contact commercial
async function sendContactEmail(data: {
  name: string;
  email: string;
  message: string;
}) {
  try {
    if (!resend) {
      console.warn("RESEND_API_KEY non configurée - envoi d'email ignoré");
      return {
        success: true,
        message: "Mode démo: email non envoyé (RESEND_API_KEY manquante)",
      };
    }
    
    const { name, email, message } = data;

    // Template pour l'équipe commerciale
    const adminEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .message-box { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666; }
            .dev-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${isDevelopment ? `
            <div class="dev-notice">
              <strong>🔧 MODE DÉVELOPPEMENT</strong><br>
              Email original destiné à: <strong>${email}</strong><br>
              Redirigé vers: <strong>${FORCE_TEST_EMAIL}</strong>
            </div>
            ` : ''}
            <div class="header">
              <h2>🚀 Nouvelle demande commerciale - Facturation SaaS</h2>
            </div>
            <div class="content">
              <h3>Informations du prospect :</h3>
              <ul>
                <li><strong>Nom :</strong> ${name}</li>
                <li><strong>Email :</strong> ${email}</li>
                <li><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</li>
              </ul>
              
              <div class="message-box">
                <h4>💬 Message :</h4>
                <p>${message.replace(/\n/g, '<br>')}</p>
              </div>
              
              <p><strong>Actions à effectuer :</strong></p>
              <ul>
                <li>Répondre au prospect dans les 24h</li>
                <li>Analyser les besoins spécifiques</li>
                <li>Proposer le plan adapté</li>
              </ul>
            </div>
            <div class="footer">
              📧 Email automatique généré par le système de facturation SaaS
            </div>
          </div>
        </body>
      </html>
    `;

    // Template de confirmation pour le client (adapté pour le mode dev)
    const clientEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
            .content { background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .highlight { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666; text-align: center; }
            .dev-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${isDevelopment ? `
            <div class="dev-notice">
              <strong>🔧 EMAIL DE TEST</strong><br>
              Ceci est un email de confirmation qui aurait dû être envoyé à: <strong>${email}</strong>
            </div>
            ` : ''}
            <div class="header">
              <h2>✅ Votre demande a été reçue</h2>
              <p>Merci de nous avoir contactés !</p>
            </div>
            <div class="content">
              <p>Bonjour <strong>${name}</strong>,</p>
              
              <p>Nous avons bien reçu votre demande concernant notre solution de facturation SaaS.</p>
              
              <div class="highlight">
                <h4>🚀 Prochaines étapes :</h4>
                <ul>
                  <li>Notre équipe commerciale analysera votre demande</li>
                  <li>Vous recevrez une réponse personnalisée sous 24h</li>
                  <li>Nous vous proposerons une démonstration si nécessaire</li>
                </ul>
              </div>
              
              <p>En attendant, n'hésitez pas à explorer notre documentation ou nous contacter si vous avez des questions urgentes.</p>
              
              <p>Cordialement,<br>
              <strong>L'équipe Facturation SaaS</strong></p>
            </div>
            <div class="footer">
              📧 support@javachrist.fr | 🌐 www.javachrist.fr
            </div>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email à l'équipe commerciale
    const adminResult = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [FORCE_TEST_EMAIL], // Toujours vers l'email vérifié
      subject: `🚀 Nouvelle demande commerciale de ${name}`,
      html: adminEmailContent,
      replyTo: email,
    });

    // Envoyer l'email de confirmation au client (forcé vers test en dev)
    const clientResult = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [isDevelopment ? FORCE_TEST_EMAIL : email], // Conditionnel selon l'environnement
      subject: `✅ Confirmation de votre demande - Facturation SaaS`,
      html: clientEmailContent,
    });

    return {
      success: true,
      message: isDevelopment
        ? `Emails de test envoyés avec succès vers ${FORCE_TEST_EMAIL} (mode développement)`
        : "Emails envoyés avec succès",
      adminEmailId: adminResult.data?.id,
      clientEmailId: clientResult.data?.id,
      devMode: isDevelopment,
      originalEmail: email,
      sentTo: isDevelopment ? FORCE_TEST_EMAIL : email,
    };

  } catch (error) {
    console.error("Erreur envoi contact:", error);
    throw error;
  }
}

// Fonction pour envoyer une invitation utilisateur
async function sendInvitationEmail(data: {
  email: string;
  organizationId: string;
  role: string;
  invitationId: string;
  inviterName?: string;
}) {
  try {
    if (!resend) {
      console.warn("RESEND_API_KEY non configurée - envoi d'email ignoré");
      return {
        success: true,
        message: "Mode démo: email non envoyé (RESEND_API_KEY manquante)",
      };
    }
    
    const { email, organizationId, role, invitationId, inviterName = "L'équipe" } = data;

    const roleFrench = role === 'admin' ? 'Administrateur' : role === 'editor' ? 'Éditeur' : 'Visiteur';
    const invitationLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/invitation?id=${invitationId}&org=${organizationId}&email=${encodeURIComponent(email)}`;

    const invitationEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
            .content { background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; }
            .invite-box { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .btn { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
            .btn:hover { background: #45a049; }
            .role-info { background: #f0f8ff; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
            .footer { margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666; text-align: center; }
            .dev-notice { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${isDevelopment ? `
            <div class="dev-notice">
              <strong>🔧 EMAIL DE TEST</strong><br>
              Invitation originale destinée à: <strong>${email}</strong><br>
              Redirigée vers: <strong>${FORCE_TEST_EMAIL}</strong>
            </div>
            ` : ''}
            <div class="header">
              <h2>🎉 Invitation à rejoindre une organisation</h2>
              <p>Facturation SaaS</p>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              
              <p><strong>${inviterName}</strong> vous invite à rejoindre une organisation sur notre plateforme de facturation SaaS.</p>
              
              <div class="role-info">
                <h4>👤 Votre rôle : <strong>${roleFrench}</strong></h4>
                <p>
                  ${role === 'admin'
        ? 'Vous aurez un accès complet à toutes les fonctionnalités de l\'organisation.'
        : role === 'editor'
          ? 'Vous pourrez créer et modifier les factures et clients, mais pas supprimer.'
          : 'Vous aurez un accès en lecture seule pour consulter les données.'
      }
                </p>
              </div>
              
              <div class="invite-box">
                <h3>🚀 Accepter l'invitation</h3>
                <p>Cliquez sur le bouton ci-dessous pour rejoindre l'organisation :</p>
                <a href="${invitationLink}" class="btn">Accepter l'invitation</a>
                <p style="font-size: 12px; margin-top: 15px; color: #666;">
                  Cette invitation expire dans 7 jours
                </p>
              </div>
              
              <p><strong>Qu'est-ce que vous pourrez faire ?</strong></p>
              <ul>
                <li>Gérer les factures et clients</li>
                <li>Accéder aux rapports financiers</li>
                <li>Collaborer avec votre équipe</li>
                <li>Utiliser toutes les fonctionnalités SaaS</li>
              </ul>
              
              <p>Si vous n'arrivez pas à cliquer sur le bouton, copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace;">${invitationLink}</p>
            </div>
            <div class="footer">
              📧 support@javachrist.fr | 🌐 Facturation SaaS<br>
              <small>Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.</small>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [isDevelopment ? FORCE_TEST_EMAIL : email], // Conditionnel selon l'environnement
      subject: `🎉 Invitation à rejoindre une organisation - Facturation SaaS`,
      html: invitationEmailContent,
    });

    return {
      success: true,
      message: isDevelopment
        ? `Invitation de test envoyée vers ${FORCE_TEST_EMAIL} (mode développement)`
        : "Invitation envoyée avec succès",
      emailId: result.data?.id,
      devMode: isDevelopment,
      originalEmail: email,
      sentTo: isDevelopment ? FORCE_TEST_EMAIL : email,
    };

  } catch (error) {
    console.error("Erreur envoi invitation:", error);
    throw error;
  }
} 