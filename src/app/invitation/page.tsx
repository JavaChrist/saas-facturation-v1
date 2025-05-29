"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiMail,
  FiUser,
  FiShield,
  FiEdit,
  FiEye
} from "react-icons/fi";

interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  invitationId: string;
  date: any;
  status: string;
  createdBy: string;
}

type InvitationStatus = 'loading' | 'valid' | 'expired' | 'used' | 'not-found' | 'error';
type AuthStatus = 'checking' | 'guest' | 'wrong-email' | 'correct-email';

// Composant pour le contenu de la page qui utilise useSearchParams
function InvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();

  // Paramètres de l'invitation depuis l'URL
  const invitationId = searchParams.get('id');
  const organizationId = searchParams.get('org');
  const invitedEmail = searchParams.get('email');

  // États de l'application
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>('loading');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // États pour l'authentification
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Vérifier l'invitation au chargement
  useEffect(() => {
    if (!invitationId || !organizationId || !invitedEmail) {
      setInvitationStatus('not-found');
      return;
    }

    verifyInvitation();
  }, [invitationId, organizationId, invitedEmail]);

  // Vérifier le statut d'authentification
  useEffect(() => {
    if (invitationStatus !== 'valid') return;

    if (!user) {
      setAuthStatus('guest');
    } else if (user.email !== invitedEmail) {
      setAuthStatus('wrong-email');
    } else {
      setAuthStatus('correct-email');
      // Si l'utilisateur est connecté avec le bon email, accepter automatiquement
      acceptInvitation();
    }
  }, [user, invitedEmail, invitationStatus]);

  const verifyInvitation = async () => {
    try {
      // Chercher l'invitation dans Firestore
      const invitationsQuery = query(
        collection(db, "invitations"),
        where("invitationId", "==", invitationId),
        where("email", "==", invitedEmail)
      );

      const querySnapshot = await getDocs(invitationsQuery);

      if (querySnapshot.empty) {
        setInvitationStatus('not-found');
        return;
      }

      const invitationDoc = querySnapshot.docs[0];
      const invitationData = {
        id: invitationDoc.id,
        ...invitationDoc.data()
      } as Invitation;

      setInvitation(invitationData);

      // Vérifier le statut
      if (invitationData.status === 'accepted') {
        setInvitationStatus('used');
        return;
      }

      // Vérifier l'expiration (7 jours)
      const invitationDate = invitationData.date.toDate ? invitationData.date.toDate() : new Date(invitationData.date);
      const expirationDate = new Date(invitationDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (new Date() > expirationDate) {
        setInvitationStatus('expired');
        return;
      }

      // Récupérer le nom de l'organisation
      try {
        const orgDoc = await getDoc(doc(db, "organizations", organizationId));
        if (orgDoc.exists()) {
          setOrganizationName(orgDoc.data().nom || 'Organisation');
        }
      } catch (error) {
        setOrganizationName('Organisation');
      }

      setInvitationStatus('valid');

    } catch (error) {
      console.error("Erreur vérification invitation:", error);
      setInvitationStatus('error');
    }
  };

  const acceptInvitation = async () => {
    if (!user || !invitation) return;

    try {
      setLoading(true);

      // Ajouter l'utilisateur à l'organisation
      const memberRef = doc(db, "organizations", organizationId, "membres", user.uid);
      await setDoc(memberRef, {
        email: user.email,
        nomAffichage: user.displayName || user.email,
        role: invitation.role,
        dateAjout: new Date(),
        actif: true,
      });

      // Marquer l'invitation comme acceptée
      await updateDoc(doc(db, "invitations", invitation.id), {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: user.uid,
      });

      // Rediriger vers le dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error("Erreur acceptation invitation:", error);
      setError('Erreur lors de l\'acceptation de l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      // L'effet useEffect se chargera de vérifier l'email et accepter l'invitation
    } catch (error) {
      setError('Erreur lors de la connexion avec Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError('');

      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }

      // L'effet useEffect se chargera de vérifier l'email et accepter l'invitation
    } catch (error: any) {
      setError(error.message || 'Erreur lors de l\'authentification');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = (role: string) => {
    const roles = {
      'admin': { name: 'Administrateur', icon: <FiShield className="text-red-500" />, desc: 'Accès complet' },
      'editor': { name: 'Éditeur', icon: <FiEdit className="text-blue-500" />, desc: 'Peut modifier' },
      'viewer': { name: 'Visiteur', icon: <FiEye className="text-green-500" />, desc: 'Lecture seule' }
    };
    return roles[role as keyof typeof roles] || roles.viewer;
  };

  // Interface de chargement
  if (invitationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-text-light dark:text-text-dark">Vérification de l'invitation...</p>
        </div>
      </div>
    );
  }

  // Interface d'erreur ou invitation invalide
  if (invitationStatus !== 'valid') {
    const statusConfig = {
      'not-found': {
        icon: <FiXCircle className="text-red-500" size={48} />,
        title: 'Invitation introuvable',
        message: 'Cette invitation n\'existe pas ou le lien est incorrect.',
      },
      'expired': {
        icon: <FiClock className="text-orange-500" size={48} />,
        title: 'Invitation expirée',
        message: 'Cette invitation a expiré. Demandez une nouvelle invitation.',
      },
      'used': {
        icon: <FiCheckCircle className="text-green-500" size={48} />,
        title: 'Invitation déjà utilisée',
        message: 'Cette invitation a déjà été acceptée.',
      },
      'error': {
        icon: <FiXCircle className="text-red-500" size={48} />,
        title: 'Erreur',
        message: 'Une erreur est survenue lors de la vérification de l\'invitation.',
      }
    };

    const config = statusConfig[invitationStatus as keyof typeof statusConfig];

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="mb-6">
            {config.icon}
          </div>
          <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">
            {config.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {config.message}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // Interface principale - invitation valide
  const roleInfo = getRoleDisplay(invitation?.role || 'viewer');

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <div className="max-w-2xl mx-auto pt-16 pb-8 px-4">
        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMail className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-text-light dark:text-text-dark mb-2">
            Invitation à rejoindre une organisation
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Vous avez été invité à rejoindre <strong>{organizationName}</strong>
          </p>
        </div>

        {/* Informations de l'invitation */}
        <div className="bg-card-light dark:bg-card-dark rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">
            Détails de l'invitation
          </h2>

          <div className="space-y-3">
            <div className="flex items-center">
              <FiMail className="text-gray-500 mr-3" />
              <span className="text-gray-600 dark:text-gray-400">Email:</span>
              <span className="ml-2 font-medium text-text-light dark:text-text-dark">{invitedEmail}</span>
            </div>

            <div className="flex items-center">
              <FiUser className="text-gray-500 mr-3" />
              <span className="text-gray-600 dark:text-gray-400">Organisation:</span>
              <span className="ml-2 font-medium text-text-light dark:text-text-dark">{organizationName}</span>
            </div>

            <div className="flex items-center">
              {roleInfo.icon}
              <span className="text-gray-600 dark:text-gray-400 ml-3">Rôle:</span>
              <span className="ml-2 font-medium text-text-light dark:text-text-dark">
                {roleInfo.name} - {roleInfo.desc}
              </span>
            </div>
          </div>
        </div>

        {/* Actions selon le statut d'authentification */}
        {authStatus === 'checking' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-text-light dark:text-text-dark">Vérification de votre statut...</p>
          </div>
        )}

        {authStatus === 'guest' && (
          <div className="bg-card-light dark:bg-card-dark rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
              Connexion requise
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Pour accepter cette invitation, vous devez vous connecter ou créer un compte avec l'email <strong>{invitedEmail}</strong>.
            </p>

            {!showAuthForm ? (
              <div className="space-y-4">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md flex items-center justify-center disabled:opacity-50"
                >
                  <FiMail className="mr-2" />
                  {loading ? 'Connexion...' : 'Se connecter avec Google'}
                </button>

                <button
                  onClick={() => setShowAuthForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md"
                >
                  Se connecter avec un email et mot de passe
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="flex space-x-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`px-4 py-2 rounded-md ${authMode === 'login'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`px-4 py-2 rounded-md ${authMode === 'register'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    Inscription
                  </button>
                </div>

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-md bg-white dark:bg-gray-800 text-text-light dark:text-text-dark"
                  required
                />

                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded-md bg-white dark:bg-gray-800 text-text-light dark:text-text-dark"
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Traitement...' : (authMode === 'login' ? 'Se connecter' : 'Créer un compte')}
                </button>
              </form>
            )}
          </div>
        )}

        {authStatus === 'wrong-email' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Email incorrect
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Vous êtes connecté avec <strong>{user?.email}</strong>, mais cette invitation est pour <strong>{invitedEmail}</strong>.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md"
            >
              Se connecter avec le bon compte
            </button>
          </div>
        )}

        {authStatus === 'correct-email' && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Acceptation en cours...
                </h3>
                <p className="text-green-700 dark:text-green-300">
                  Nous vous ajoutons à l'organisation...
                </p>
              </div>
            ) : (
              <div className="text-center">
                <FiCheckCircle className="text-green-600 dark:text-green-400 mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                  Invitation acceptée !
                </h3>
                <p className="text-green-700 dark:text-green-300 mb-4">
                  Vous avez été ajouté à l'organisation avec succès. Redirection vers le dashboard...
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Composant principal exporté avec Suspense
export default function InvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-text-light dark:text-text-dark">Chargement de l'invitation...</p>
          </div>
        </div>
      }
    >
      <InvitationContent />
    </Suspense>
  );
} 