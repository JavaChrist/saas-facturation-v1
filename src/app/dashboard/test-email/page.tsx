"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiMail, FiCheck, FiX, FiAlertTriangle } from 'react-icons/fi';

const TestEmailPage = () => {
  const router = useRouter();
  const [emailTest, setEmailTest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const testEmailConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: emailTest,
          senderEmail: 'onboarding@resend.dev'
        })
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Erreur lors du test' });
    }
    setIsLoading(false);
  };

  const testWithCustomDomain = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: emailTest,
          senderEmail: 'contact@javachrist.fr'
        })
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({ success: false, error: 'Erreur lors du test' });
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold text-text-light dark:text-text-dark">
            📧 Test de Configuration Email
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
        </div>

        {/* Configuration actuelle */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark flex items-center">
            <FiMail className="mr-2" />
            Configuration Actuelle
          </h2>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">✅ Configuration Temporaire (Fonctionnelle)</h3>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>Expéditeur :</strong> onboarding@resend.dev<br />
                <strong>Status :</strong> ✅ Vérifié et fonctionnel<br />
                <strong>Limitation :</strong> Nom d'expéditeur générique
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚠️ Configuration Personnalisée (En cours)</h3>
              <p className="text-amber-700 dark:text-amber-300">
                <strong>Expéditeur :</strong> contact@javachrist.fr<br />
                <strong>Status :</strong> ❌ DNS DKIM en cours de propagation<br />
                <strong>Action :</strong> Attendre 1-2h pour la propagation DNS
              </p>
            </div>
          </div>
        </div>

        {/* Test d'envoi */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark">
            🧪 Test d'Envoi
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email de test (votre email personnel)
              </label>
              <input
                type="email"
                value={emailTest}
                onChange={(e) => setEmailTest(e.target.value)}
                placeholder="votre@email.com ou email1@domain.com, email2@domain.com"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Exemples: <br />
                • Un seul : <code>contact@javachrist.fr</code><br />
                • Plusieurs : <code>contact@javachrist.fr, votre@gmail.com</code>
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={testEmailConfig}
                disabled={!emailTest || isLoading}
                className="bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <FiCheck className="mr-2" />
                Tester avec Resend (fonctionne)
              </button>

              <button
                onClick={testWithCustomDomain}
                disabled={!emailTest || isLoading}
                className="bg-amber-600 text-white py-3 px-6 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center"
              >
                <FiAlertTriangle className="mr-2" />
                Tester avec domaine perso
              </button>
            </div>
          </div>

          {/* Résultats */}
          {results && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Résultats du test :</h3>
              <div className={`p-4 rounded-lg ${results.success
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                {results.success ? (
                  <div className="flex items-center">
                    <FiCheck className="mr-2" />
                    ✅ Email envoyé avec succès ! Vérifiez votre boîte mail.
                    {results.resendId && <span className="text-xs ml-2">(ID: {results.resendId})</span>}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <FiX className="mr-2" />
                    ❌ Erreur : {results.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Guide de configuration */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark">
            📋 Guide de Configuration Domaine Personnalisé
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Étape 1 : Vérification DNS</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Vérifiez que vos enregistrements DNS sont corrects dans IONOS :
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li><strong>renvoyer._domainkey</strong> (TXT) : v=DKIM1; k=rsa; p=MIG...</li>
                <li><strong>MX</strong> : Vos enregistrements MX habituels</li>
                <li><strong>SPF</strong> : Ajouter include:resend.com</li>
              </ul>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Étape 2 : Attendre la propagation</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Les changements DNS peuvent prendre 1-2 heures pour se propager.
              </p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-green-800 dark:text-green-200">Étape 3 : Vérifier dans Resend</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Une fois propagé, le domaine javachrist.fr sera entièrement vérifié dans Resend.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-green-800 dark:text-green-200">
              <strong>💡 Conseil :</strong> En attendant, utilisez la configuration temporaire qui fonctionne parfaitement !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEmailPage; 