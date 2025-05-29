import { Resend } from 'resend';
import { Facture } from '@/types/facture';
import { UserSignature } from '@/types/user';

// Initialisation conditionnelle de Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Signature par défaut générique (utilisée seulement si aucune signature personnalisée)
const getDefaultSignature = () => {
  return `
  <hr style="margin: 24px 0;" />
  <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <tr>
      <td>
        <p style="color: #666; font-style: italic; font-size: 12px;">
          Cette facture a été générée automatiquement.<br/>
          Pour configurer votre signature personnalisée, rendez-vous dans votre profil.
        </p>
      </td>
    </tr>
  </table>
`;
};

// Génération de signature personnalisée pour un utilisateur
const getUserSignature = (userInfo?: any) => {
  if (!userInfo || !userInfo.nom) {
    console.log('🔧 [SIGNATURE] Aucune signature utilisateur valide, utilisation de la signature par défaut');
    return getDefaultSignature();
  }

  console.log('🔧 [SIGNATURE] Génération de signature personnalisée pour:', userInfo.nom);

  return `
  <hr style="margin: 24px 0;" />
  <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <tr>
      ${userInfo.avatar ? `
      <td style="vertical-align: top; padding-right: 16px;">
        <img src="${userInfo.avatar}" alt="Signature" width="80" style="border-radius: 50%;" onerror="this.style.display='none'" />
      </td>
      ` : ''}
      <td>
        <strong>${userInfo.nom}</strong><br/>
        ${userInfo.fonction ? `<span style="font-weight: bold;">${userInfo.fonction}</span><br/>` : ''}
        ${userInfo.adresse ? `${userInfo.adresse.replace(/\n/g, '<br/>')}<br/>` : ''}
        ${userInfo.telephone ? `📞 ${userInfo.telephone}<br/>` : ''}
        ${userInfo.email ? `📧 ${userInfo.email}<br/>` : ''}
        ${userInfo.siteWeb ? `🌐 <a href="${userInfo.siteWeb}" target="_blank">${userInfo.siteWeb}</a><br/>` : ''}
        ${userInfo.reseauxSociaux && userInfo.reseauxSociaux.length > 0 ?
      userInfo.reseauxSociaux.map((reseau: any) =>
        reseau.nom && reseau.url ? `<a href="${reseau.url}" target="_blank" style="text-decoration: none; margin-right: 8px;">
              ${reseau.nom}
            </a>` : ''
      ).join('') : ''}
      </td>
    </tr>
  </table>
`;
};

interface EmailTemplate {
  subject: string;
  body: string;
}

// Templates d'emails prédéfinis
const getEmailTemplate = (type: 'invoice' | 'reminder' | 'overdue', facture: Facture): EmailTemplate => {
  const clientName = facture.client.nom;
  const invoiceNumber = facture.numero;
  const amount = facture.totalTTC.toFixed(2);

  switch (type) {
    case 'invoice':
      return {
        subject: `Facture ${invoiceNumber} - ${clientName}`,
        body: `
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint la facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${amount} €</strong>.</p>
          <p>Cette facture est à régler selon les conditions convenues.</p>
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          <p>Cordialement,</p>
        `
      };

    case 'reminder':
      return {
        subject: `Rappel - Facture ${invoiceNumber} - ${clientName}`,
        body: `
          <p>Bonjour,</p>
          <p>Nous vous rappelons que la facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${amount} €</strong> arrive à échéance prochainement.</p>
          <p>Afin d'éviter tout désagrément, nous vous prions de bien vouloir procéder au règlement dans les meilleurs délais.</p>
          <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message.</p>
          <p>Pour toute question concernant cette facture, n'hésitez pas à nous contacter.</p>
          <p>Nous vous remercions de votre confiance.</p>
          <p>Cordialement,</p>
        `
      };

    case 'overdue':
      return {
        subject: `Facture en retard - ${invoiceNumber} - ${clientName}`,
        body: `
          <p>Bonjour,</p>
          <p>Nous constatons que la facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${amount} €</strong> n'a pas encore été réglée.</p>
          <p>Cette facture étant maintenant en retard de paiement, nous vous prions de bien vouloir procéder au règlement <strong>dans les plus brefs délais</strong>.</p>
          <p>Si vous rencontrez des difficultés pour honorer cette échéance, nous vous invitons à nous contacter afin de trouver ensemble une solution.</p>
          <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message et nous excuser de ce rappel.</p>
          <p>Nous restons à votre disposition pour tout renseignement complémentaire.</p>
          <p>Cordialement,</p>
        `
      };

    default:
      return {
        subject: `Facture ${invoiceNumber} - ${clientName}`,
        body: `
          <p>Bonjour,</p>
          <p>Veuillez trouver ci-joint votre facture.</p>
          <p>Cordialement,</p>
        `
      };
  }
};

export async function sendInvoiceEmail({
  facture,
  pdfBuffer,
  emailType = 'invoice',
  customMessage,
  senderEmail = 'onboarding@resend.dev',
  userSignature,
}: {
  facture: Facture;
  pdfBuffer: Buffer;
  emailType?: 'invoice' | 'reminder' | 'overdue';
  customMessage?: string;
  senderEmail?: string;
  userSignature?: string | UserSignature;
}) {
  try {
    // Vérifier que Resend est configuré
    if (!resend) {
      throw new Error('Service d\'email non configuré. Vérifiez la variable RESEND_API_KEY.');
    }

    // 🔍 LOG DEBUG : Structure de la facture reçue
    console.log('🔍 [DEBUG] Structure facture reçue:', {
      clientEmails: facture.client.emails,
      clientEmail: facture.client.email,
      clientNom: facture.client.nom,
      emailType: emailType
    });

    // Récupérer les emails du client de manière plus robuste
    const clientEmails: string[] = [];

    // Ajouter tous les emails de la structure emails[]
    if (facture.client.emails && facture.client.emails.length > 0) {
      facture.client.emails.forEach(emailObj => {
        if (emailObj.email && emailObj.email.trim()) {
          clientEmails.push(emailObj.email.trim());
          console.log('📧 [DEBUG] Email ajouté depuis emails[]:', emailObj.email.trim());
        }
      });
    }

    // Ajouter l'email principal s'il existe et n'est pas déjà dans la liste
    if (facture.client.email && facture.client.email.trim()) {
      const emailPrincipal = facture.client.email.trim();
      if (!clientEmails.includes(emailPrincipal)) {
        clientEmails.push(emailPrincipal);
        console.log('📧 [DEBUG] Email principal ajouté:', emailPrincipal);
      } else {
        console.log('📧 [DEBUG] Email principal déjà présent:', emailPrincipal);
      }
    }

    // Supprimer les doublons et emails vides
    const uniqueEmails = [...new Set(clientEmails)].filter(email => email && email.trim().length > 0);

    console.log('📧 [DEBUG] Emails finaux pour Resend:', uniqueEmails);
    console.log('📧 [DEBUG] Nombre d\'emails:', uniqueEmails.length);

    if (uniqueEmails.length === 0) {
      throw new Error('Aucun email trouvé pour ce client');
    }

    // Générer le template d'email
    const template = getEmailTemplate(emailType, facture);

    // Utiliser le message personnalisé ou le template par défaut
    const emailBody = customMessage || template.body;

    // 🔧 GESTION DES SIGNATURES : Nouvelle logique améliorée
    let signature: string;

    console.log('🔧 [SIGNATURE] Type de userSignature reçu:', typeof userSignature);
    console.log('🔧 [SIGNATURE] Contenu userSignature:', userSignature ? 'Présent' : 'Absent');

    if (typeof userSignature === 'string' && userSignature.trim()) {
      // Si c'est une string HTML non vide, l'utiliser directement
      console.log('🔧 [SIGNATURE] Utilisation de signature HTML directe');
      signature = userSignature;
    } else if (userSignature && typeof userSignature === 'object' && userSignature.nom) {
      // Si c'est un objet UserSignature valide, générer la signature
      console.log('🔧 [SIGNATURE] Génération depuis objet UserSignature');
      signature = getUserSignature(userSignature);
    } else {
      // Utiliser la signature par défaut
      console.log('🔧 [SIGNATURE] Aucune signature valide trouvée, utilisation de la signature par défaut');
      signature = getDefaultSignature();
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
        ${emailBody}
        ${signature}
      </div>
    `;

    // Nom du fichier PDF
    const pdfFileName = `Facture_${facture.numero}.pdf`;

    // 🔍 LOG DEBUG : Paramètres envoyés à Resend
    console.log('🚀 [DEBUG] Paramètres Resend.emails.send:', {
      from: senderEmail,
      to: uniqueEmails,
      subject: template.subject,
      attachmentName: pdfFileName,
      emailType: emailType
    });

    const result = await resend.emails.send({
      from: senderEmail,
      to: uniqueEmails,
      subject: template.subject,
      html: htmlBody,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    // 🔍 LOG DEBUG : Réponse de Resend
    console.log('✅ [DEBUG] Réponse Resend:', result);

    // Vérifier les erreurs
    if (result.error) {
      console.error('❌ [DEBUG] Erreur Resend détectée:', result.error);
      throw new Error(`Erreur Resend : ${result.error.message || 'Erreur inconnue'}`);
    }

    if (result.data) {
      console.log('✅ [DEBUG] ID email Resend:', result.data.id);
    }

    console.log('✅ Email envoyé avec succès:', {
      factureId: facture.id,
      factureNumero: facture.numero,
      clientName: facture.client.nom,
      emails: uniqueEmails,
      emailType,
      resendId: result.data?.id
    });

    return {
      success: true,
      data: result,
      sentTo: uniqueEmails,
      factureNumero: facture.numero
    };
  } catch (err) {
    console.error('❌ Erreur lors de l\'envoi du mail:', {
      factureId: facture.id,
      factureNumero: facture.numero,
      error: err
    });
    throw err;
  }
}

// Fonction pour valider la configuration Resend
export function validateResendConfig(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Fonction pour tester la connexion Resend
export async function testResendConnection(): Promise<boolean> {
  try {
    if (!validateResendConfig() || !resend) {
      return false;
    }

    // Test simple avec l'API Resend
    const result = await resend.emails.send({
      from: 'test@javachrist.fr',
      to: ['test@example.com'],
      subject: 'Test de connexion',
      html: '<p>Test</p>',
    });

    return true;
  } catch (error) {
    console.error('Erreur de test Resend:', error);
    return false;
  }
} 