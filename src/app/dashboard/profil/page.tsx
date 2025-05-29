"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserSignature } from "@/types/user";
import { useModal } from "@/hooks/useModal";
import ModalManager from "@/components/ui/ModalManager";
import { FiArrowLeft, FiSave, FiEye } from "react-icons/fi";

export default function ProfilPage() {
  const router = useRouter();
  const { user } = useAuth();
  const modal = useModal();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<UserSignature>({
    nom: '',
    fonction: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    avatar: '',
    reseauxSociaux: []
  });

  const [showPreview, setShowPreview] = useState(false);

  console.log("[PROFIL] Début du rendu, user:", user);

  // Chargement du profil au montage
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setSignature({
            nom: userData.nomAffichage || user.displayName || '',
            fonction: '',
            adresse: '',
            telephone: userData.telephone || '',
            email: userData.email || user.email || '',
            siteWeb: '',
            avatar: user.photoURL || '',
            reseauxSociaux: []
          });

          if (userData.signature) {
            setSignature(userData.signature);
          } else {
            // Créer une signature par défaut
            const defaultSignature: UserSignature = {
              nom: userData.nomAffichage || user.displayName || '',
              fonction: '',
              adresse: '',
              telephone: userData.telephone || '',
              email: userData.email || user.email || '',
              siteWeb: '',
              avatar: user.photoURL || '',
              reseauxSociaux: []
            };
            setSignature(defaultSignature);
          }
        } else {
          // Créer un profil par défaut si aucun n'existe
          const defaultProfile: UserSignature = {
            nom: user.displayName || '',
            fonction: '',
            adresse: '',
            telephone: '',
            email: user.email || '',
            siteWeb: '',
            avatar: user.photoURL || '',
            reseauxSociaux: []
          };

          setSignature(defaultProfile);

          const defaultSignature: UserSignature = {
            nom: user.displayName || '',
            fonction: '',
            adresse: '',
            telephone: '',
            email: user.email || '',
            siteWeb: '',
            avatar: user.photoURL || '',
            reseauxSociaux: []
          };

          setSignature(defaultSignature);

          // Sauvegarder le profil par défaut
          await setDoc(userRef, {
            ...defaultProfile,
            signature: defaultSignature,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        setError('Erreur lors du chargement du profil');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, router]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", user.uid);

      // Utiliser setDoc avec merge pour éviter les erreurs si le document n'existe pas
      await setDoc(userRef, {
        signature: signature,
        lastUpdated: new Date()
      }, { merge: true });

      // Afficher le succès avec gestion d'erreur sur la modale
      try {
        modal.showSuccess("Signature sauvegardée avec succès !");
      } catch (modalError) {
        console.warn("[PROFIL] Erreur de modale, utilisation d'alert:", modalError);
        alert("Signature sauvegardée avec succès !");
      }
    } catch (error) {
      console.error("[PROFIL] Erreur lors de la sauvegarde:", error);

      // Afficher l'erreur avec gestion d'erreur sur la modale
      try {
        modal.showError("Erreur lors de la sauvegarde");
      } catch (modalError) {
        console.warn("[PROFIL] Erreur de modale, utilisation d'alert:", modalError);
        alert("Erreur lors de la sauvegarde");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addReseauSocial = () => {
    setSignature(prev => ({
      ...prev,
      reseauxSociaux: [
        ...(prev.reseauxSociaux || []),
        { nom: '', url: '' }
      ]
    }));
  };

  const removeReseauSocial = (index: number) => {
    setSignature(prev => ({
      ...prev,
      reseauxSociaux: prev.reseauxSociaux?.filter((_, i) => i !== index) || []
    }));
  };

  const updateReseauSocial = (index: number, field: 'nom' | 'url', value: string) => {
    setSignature(prev => ({
      ...prev,
      reseauxSociaux: prev.reseauxSociaux?.map((reseau, i) =>
        i === index ? { ...reseau, [field]: value } : reseau
      ) || []
    }));
  };

  // Aperçu de la signature
  const getSignaturePreview = () => {
    return `
      <hr style="margin: 24px 0; border-color: #666;" />
      <table cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; font-size: 14px; color: inherit;">
        <tr>
          ${signature.avatar ? `
          <td style="vertical-align: top; padding-right: 16px;">
            <img src="${signature.avatar}" alt="Signature" width="80" style="border-radius: 50%;" onerror="this.style.display='none'" />
          </td>
          ` : ''}
          <td>
            <strong style="color: inherit;">${signature.nom || 'Nom utilisateur'}</strong><br/>
            ${signature.fonction ? `<span style="font-weight: bold; color: inherit;">${signature.fonction}</span><br/>` : ''}
            ${signature.adresse ? `<span style="color: inherit;">${signature.adresse.replace(/\n/g, '<br/>')}</span><br/>` : ''}
            ${signature.telephone ? `<span style="color: inherit;">📞 ${signature.telephone}</span><br/>` : ''}
            ${signature.email ? `<span style="color: inherit;">📧 ${signature.email}</span><br/>` : ''}
            ${signature.siteWeb ? `<span style="color: inherit;">🌐 <a href="${signature.siteWeb}" target="_blank" style="color: #3b82f6; text-decoration: none;">${signature.siteWeb}</a></span><br/>` : ''}
            ${signature.reseauxSociaux && signature.reseauxSociaux.length > 0 ?
        signature.reseauxSociaux.map((reseau) =>
          reseau.nom && reseau.url ? `<a href="${reseau.url}" target="_blank" style="color: #3b82f6; text-decoration: none; margin-right: 8px;">
                  ${reseau.nom}
                </a>` : ''
        ).join('') : ''}
          </td>
        </tr>
      </table>
    `;
  };

  if (isLoading) {
    console.log("[PROFIL] Affichage du loader");
    return (
      <div className="flex justify-center items-center min-h-screen bg-background-light dark:bg-background-dark">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <p className="ml-4 text-text-light dark:text-text-dark">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    console.log("[PROFIL] Pas d'utilisateur après chargement");
    return <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">Redirection vers login...</div>;
  }

  if (error) {
    console.log("[PROFIL] Affichage d'erreur:", error);
    return (
      <div className="p-6 min-h-screen bg-background-light dark:bg-background-dark">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-semibold mb-6 text-text-light dark:text-text-dark">👤 Mon Profil - Erreur</h1>
          <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            <strong>Erreur :</strong> {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log("[PROFIL] Rendu principal de la page");

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-4xl font-semibold text-text-light dark:text-text-dark">
            👤 Mon Profil
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
            >
              <FiArrowLeft size={18} className="mr-2" /> Retour
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center transform hover:scale-105 transition-transform duration-300"
            >
              <FiEye size={18} className="mr-2" />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center transform hover:scale-105 transition-transform duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <FiSave size={18} className="mr-2" /> Sauvegarder
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Formulaire de signature */}
          <div className="bg-white dark:bg-card-dark p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark">
              📝 Signature Email
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={signature.nom}
                  onChange={(e) => setSignature(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Votre nom complet"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fonction / Poste
                </label>
                <input
                  type="text"
                  value={signature.fonction || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, fonction: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: Directeur, Freelance, Consultant..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                <textarea
                  value={signature.adresse || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, adresse: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Adresse complète&#10;Lieu-dit, complément d'adresse&#10;Code postal et ville"
                  rows={5}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Vous pouvez utiliser plusieurs lignes pour une adresse complète (lieu-dit, complément, etc.)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={signature.telephone || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Ex: 01 23 45 67 89"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={signature.email || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Site Web
                </label>
                <input
                  type="url"
                  value={signature.siteWeb || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, siteWeb: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://votre-site.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Avatar (URL)
                </label>
                <input
                  type="url"
                  value={signature.avatar || ''}
                  onChange={(e) => setSignature(prev => ({ ...prev, avatar: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://exemple.com/avatar.jpg"
                />
              </div>

              {/* Réseaux sociaux */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Réseaux sociaux
                  </label>
                  <button
                    type="button"
                    onClick={addReseauSocial}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {signature.reseauxSociaux?.map((reseau, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex flex-col space-y-2">
                        <input
                          type="text"
                          value={reseau.nom}
                          onChange={(e) => updateReseauSocial(index, 'nom', e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Nom du réseau (ex: LinkedIn, Twitter, GitHub...)"
                        />
                        <div className="flex space-x-2">
                          <input
                            type="url"
                            value={reseau.url}
                            onChange={(e) => updateReseauSocial(index, 'url', e.target.value)}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            placeholder="URL complète (https://...)"
                          />
                          <button
                            type="button"
                            onClick={() => removeReseauSocial(index)}
                            className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600 flex-shrink-0"
                            title="Supprimer ce réseau social"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!signature.reseauxSociaux || signature.reseauxSociaux.length === 0) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                      Aucun réseau social ajouté
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu de la signature - Desktop */}
          {showPreview && (
            <div className="hidden xl:block bg-white dark:bg-card-dark p-6 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark">
                👁️ Aperçu de la signature
              </h2>

              <div className="border border-gray-200 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-800">
                <div className="text-gray-900 dark:text-gray-100">
                  <div
                    dangerouslySetInnerHTML={{ __html: getSignaturePreview() }}
                    className="signature-preview"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Cette signature apparaîtra automatiquement dans tous vos emails de factures.
              </p>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Astuce :</strong> L'aperçu s'adapte automatiquement au mode sombre/clair de votre interface.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Aperçu de la signature - Mobile */}
        {showPreview && (
          <div className="xl:hidden mt-6 bg-white dark:bg-card-dark p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark">
              👁️ Aperçu de la signature
            </h2>

            <div className="border border-gray-200 dark:border-gray-600 rounded p-4 bg-gray-50 dark:bg-gray-800">
              <div className="text-gray-900 dark:text-gray-100">
                <div
                  dangerouslySetInnerHTML={{ __html: getSignaturePreview() }}
                  className="signature-preview"
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Cette signature apparaîtra automatiquement dans tous vos emails de factures.
            </p>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Astuce :</strong> L'aperçu s'adapte automatiquement au mode sombre/clair de votre interface.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gestionnaire de modales */}
      {modal && modal.isOpen !== undefined && (
        <ModalManager
          isOpen={modal.isOpen}
          onClose={modal.closeModal}
          onConfirm={modal.handleConfirm}
          modalType={modal.modalType}
          modalData={modal.modalData}
          isLoading={modal.isLoading}
        />
      )}
    </div>
  );
} 