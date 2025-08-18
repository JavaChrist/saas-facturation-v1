import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 [TEST-EMAIL] Début du test email API');

    const { testEmail, senderEmail } = await req.json();

    console.log('🧪 [TEST-EMAIL] Paramètres reçus:', {
      testEmail,
      senderEmail,
      hasResend: !!resend,
      apiKey: process.env.RESEND_API_KEY ? 'Configurée' : 'MANQUANTE'
    });

    if (!resend) {
      console.error('🧪 [TEST-EMAIL] ❌ Resend non configuré');
      return NextResponse.json({
        success: false,
        error: 'Service d\'email non configuré. Vérifiez RESEND_API_KEY.'
      }, { status: 500 });
    }

    if (!testEmail) {
      console.error('🧪 [TEST-EMAIL] ❌ Email de test manquant');
      return NextResponse.json({
        success: false,
        error: 'Email de test requis'
      }, { status: 400 });
    }

    const emailsArray = testEmail.includes(',')
      ? testEmail.split(',').map((e: string) => e.trim()).filter((e: string) => e)
      : [testEmail];

    console.log('🧪 [TEST-EMAIL] Emails destinataires:', emailsArray);
    console.log('🧪 [TEST-EMAIL] Expéditeur:', senderEmail || 'onboarding@resend.dev');

    // Test d'envoi d'email
    const result = await resend.emails.send({
      from: senderEmail || 'onboarding@resend.dev',
      to: emailsArray,
      subject: 'Test de Configuration Email - Facturation App',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #333;">🧪 Test de Configuration Email</h2>
          
          <p>Félicitations ! Ce test d'email a fonctionné.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Détails du test :</h3>
            <ul style="color: #6c757d;">
              <li><strong>Expéditeur :</strong> ${senderEmail || 'onboarding@resend.dev'}</li>
              <li><strong>Destinataires :</strong> ${emailsArray.join(', ')}</li>
              <li><strong>Nombre d'emails :</strong> ${emailsArray.length}</li>
              <li><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</li>
            </ul>
          </div>
          
          <p style="color: #28a745;"><strong>✅ Votre configuration email fonctionne parfaitement !</strong></p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #dee2e6;">
          
          <p style="font-size: 12px; color: #6c757d;">
            Cet email a été envoyé automatiquement depuis votre application de facturation.<br/>
            Si vous n'avez pas demandé ce test, vous pouvez ignorer cet email.
          </p>
        </div>
      `,
    });

    console.log('🧪 [TEST-EMAIL] ✅ Réponse Resend:', result);

    return NextResponse.json({
      success: true,
      message: 'Email de test envoyé avec succès',
      resendId: result.data?.id,
      sentTo: emailsArray,
      sentFrom: senderEmail || 'onboarding@resend.dev',
      debugInfo: {
        resendResponse: result,
        emailCount: emailsArray.length
      }
    });

  } catch (error: any) {
    console.error('🧪 [TEST-EMAIL] ❌ Erreur:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur lors de l\'envoi du test email',
      debugInfo: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack
      }
    }, { status: 500 });
  }
} 