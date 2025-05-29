import { NextRequest, NextResponse } from 'next/server';
import { sendInvoiceEmail, validateResendConfig } from '@/lib/email/sendInvoiceEmail';
import { generateInvoicePDFForEmail } from '@/services/pdfGenerator';
import { Facture } from '@/types/facture';

export async function POST(request: NextRequest) {
  try {
    // Vérifier la configuration Resend
    if (!validateResendConfig()) {
      return NextResponse.json(
        { error: 'Configuration Resend manquante. Vérifiez RESEND_API_KEY.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      facture,
      emailType = 'invoice',
      customMessage,
      senderEmail,
      userSignature
    } = body;

    if (!facture || !facture.id) {
      return NextResponse.json(
        { error: 'Données de facture manquantes' },
        { status: 400 }
      );
    }

    console.log(`[EMAIL] Traitement de la demande d'envoi pour la facture ${facture.numero}`);

    // Vérifier que le client a au moins un email
    const hasEmail = (facture.client.emails && facture.client.emails.length > 0) ||
      facture.client.email;

    if (!hasEmail) {
      return NextResponse.json(
        { error: 'Aucun email configuré pour ce client' },
        { status: 400 }
      );
    }

    console.log(`[EMAIL] Génération du PDF pour la facture ${facture.numero}`);

    // Générer le PDF de la facture avec la fonction dédiée pour l'email
    const pdfBuffer = await generateInvoicePDFForEmail(facture);

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du PDF' },
        { status: 500 }
      );
    }

    console.log(`[EMAIL] Envoi de l'email pour la facture ${facture.numero}`);

    // Envoyer l'email
    const result = await sendInvoiceEmail({
      facture,
      pdfBuffer,
      emailType,
      customMessage,
      senderEmail,
      userSignature,
    });

    console.log(`[EMAIL] ✅ Email envoyé avec succès pour la facture ${facture.numero}`);

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      data: {
        factureNumero: result.factureNumero,
        sentTo: result.sentTo,
        emailType,
        resendId: result.data?.data?.id
      }
    });

  } catch (error) {
    console.error('[EMAIL] ❌ Erreur lors de l\'envoi de l\'email:', error);

    return NextResponse.json(
      {
        error: 'Erreur lors de l\'envoi de l\'email',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Endpoint pour tester la configuration
export async function GET() {
  try {
    const isConfigured = validateResendConfig();

    return NextResponse.json({
      configured: isConfigured,
      message: isConfigured
        ? 'Configuration Resend OK'
        : 'Configuration Resend manquante'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la configuration' },
      { status: 500 }
    );
  }
} 