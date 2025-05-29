import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 [DEBUG-MULTI] Test multi-email simple');

    const { emails } = await req.json();

    if (!resend) {
      return NextResponse.json({ success: false, error: 'Resend non configuré' });
    }

    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ success: false, error: 'Paramètre emails requis (tableau)' });
    }

    console.log('🧪 [DEBUG-MULTI] Emails à tester:', emails);

    // Test d'envoi ultra-simple
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: emails,
      subject: `🧪 Test Multi-Email Simple - ${new Date().toLocaleTimeString()}`,
      html: `
        <h2>Test Multi-Email</h2>
        <p>Cet email de test a été envoyé simultanément à :</p>
        <ul>
          ${emails.map(email => `<li><strong>${email}</strong></li>`).join('')}
        </ul>
        <p>Si vous recevez cet email, la délivrance vers votre adresse fonctionne !</p>
        <p><small>Envoyé le ${new Date().toLocaleString()}</small></p>
      `,
    });

    console.log('🧪 [DEBUG-MULTI] Réponse Resend:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Test envoyé',
      emails: emails,
      resendId: result.data?.id,
      fullResponse: result
    });

  } catch (error: any) {
    console.error('🧪 [DEBUG-MULTI] Erreur:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 