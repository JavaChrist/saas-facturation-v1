import { Resend } from 'resend';
import { Facture } from '@/types/facture';

// Initialisation conditionnelle de Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Signature par défaut (peut être personnalisée par utilisateur plus tard)
const getDefaultSignature = () => {
  // URL de base dynamique selon l'environnement
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://facturation.javachrist.eu' // URL de production Vercel
    : 'http://localhost:3000';

  return `
  <hr style="margin: 24px 0;" />
  <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
    <tr>
      <td style="vertical-align: top; padding-right: 16px;">
        <img src="${baseUrl}/Avatar.png" alt="Signature" width="80" style="border-radius: 50%;" />
      </td>
      <td>
        <strong>Grohens Christian</strong><br/>
        <span style="font-weight: bold;">Freelance<br/>Développeur web<br/>Expert Technique</span><br/>
        5, rue Maurice Fonvieille<br/>
        31120 Portet sur Garonne<br/>
        📞 09 52 62 31 71<br/>
        🌐 <a href="https://www.javachrist.fr" target="_blank">www.javachrist.fr</a><br/><br/>
        <a href="https://github.com/JavaChrist" target="_blank" style="text-decoration: none;">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/github.svg" width="20" alt="GitHub" />
        </a>&nbsp;
        <a href="https://linkedin.com/in/christian-grohens" target="_blank" style="text-decoration: none;">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/linkedin.svg" width="20" alt="LinkedIn" />
        </a>&nbsp;
        <a href="https://twitter.com/javachrist" target="_blank" style="text-decoration: none;">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/twitter.svg" width="20" alt="Twitter" />
        </a>
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
          <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message.</p>
          <p>Cordialement,</p>
        `
      };

    case 'overdue':
      return {
        subject: `Facture en retard - ${invoiceNumber} - ${clientName}`,
        body: `
          <p>Bonjour,</p>
          <p>Nous constatons que la facture <strong>${invoiceNumber}</strong> d'un montant de <strong>${amount} €</strong> n'a pas encore été réglée.</p>
          <p>Merci de bien vouloir procéder au règlement dans les plus brefs délais.</p>
          <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message.</p>
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
  userSignature?: string;
}) {
  try {
    // Vérifier que Resend est configuré
    if (!resend) {
      throw new Error('Service d\'email non configuré. Vérifiez la variable RESEND_API_KEY.');
    }

    // Récupérer les emails du client
    const clientEmails = facture.client.emails && facture.client.emails.length > 0
      ? facture.client.emails.map(e => e.email)
      : [facture.client.email].filter(Boolean);

    if (clientEmails.length === 0) {
      throw new Error('Aucun email trouvé pour ce client');
    }

    // Générer le template d'email
    const template = getEmailTemplate(emailType, facture);

    // Utiliser le message personnalisé ou le template par défaut
    const emailBody = customMessage || template.body;

    // Utiliser la signature personnalisée ou celle par défaut
    const signature = userSignature || getDefaultSignature();

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
        ${emailBody}
        ${signature}
      </div>
    `;

    // Nom du fichier PDF
    const pdfFileName = `Facture_${facture.numero}.pdf`;

    const result = await resend.emails.send({
      from: senderEmail,
      to: clientEmails,
      subject: template.subject,
      html: htmlBody,
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer.toString('base64'),
        },
      ],
    });

    console.log('✅ Email envoyé avec succès:', {
      factureId: facture.id,
      factureNumero: facture.numero,
      clientName: facture.client.nom,
      emails: clientEmails,
      emailType,
      resendId: result.data?.id
    });

    return {
      success: true,
      data: result,
      sentTo: clientEmails,
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
      from: 'test@javachrist.eu',
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