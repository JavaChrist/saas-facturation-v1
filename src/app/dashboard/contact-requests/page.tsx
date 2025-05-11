"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, Timestamp, limit, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  message: string;
  date: Timestamp | null;
  status: string;
  source: string;
  commercialEmailSent?: boolean;
  clientEmailSent?: boolean;
  error?: string;
  localOnly?: boolean;
}

// Créer un composant de spinner simple ici pour éviter les problèmes d'import
function LoadingSpinner({ size = 'large' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClass = size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-8 h-8' : 'w-12 h-12';
  
  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClass} border-4 border-indigo-500 border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label="Chargement en cours"
      >
        <span className="sr-only">Chargement...</span>
      </div>
    </div>
  );
}

export default function ContactRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login?redirect=/dashboard/contact-requests");
      return;
    }

    async function fetchContactRequests() {
      try {
        setIsLoading(true);
        console.log("Tentative de récupération des demandes de contact pour l'utilisateur:", user?.uid);
        
        // Limiter à 50 demandes pour éviter de surcharger l'interface
        // et filtrer pour ne montrer que les demandes de l'utilisateur actuel
        const q = query(
          collection(db, "contactRequests"),
          // Filtrer par userId pour ne récupérer que les demandes de l'utilisateur actuel
          // Utiliser where avec in permet de récupérer les demandes où userId est égal à l'ID de l'utilisateur
          // ou où userId est null (demandes non assignées)
          where("userId", "in", [user?.uid, null]),
          orderBy("date", "desc"),
          limit(50)
        );
        
        console.log("Requête préparée, exécution...");
        const querySnapshot = await getDocs(q);
        console.log("Résultat obtenu, nombre de documents:", querySnapshot.size);
        
        const requests: ContactRequest[] = [];
        
        querySnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            requests.push({
              id: doc.id,
              name: data.name || "Nom inconnu",
              email: data.email || "Email inconnu",
              message: data.message || "Pas de message",
              date: data.date || null,
              status: data.status || "pending",
              source: data.source || "unknown",
              commercialEmailSent: data.commercialEmailSent,
              clientEmailSent: data.clientEmailSent,
              error: data.error,
              localOnly: data.localOnly
            });
          } catch (dataError) {
            console.error("Erreur lors du traitement d'un document:", dataError);
          }
        });
        
        console.log("Demandes traitées:", requests.length);
        setContactRequests(requests);
      } catch (err: any) {
        console.error("Erreur lors de la récupération des demandes:", err);
        setError("Impossible de charger les demandes: " + (err.message || "Erreur inconnue"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchContactRequests();
  }, [user, loading, router]);

  function formatDate(timestamp: Timestamp | null) {
    if (!timestamp || !timestamp.toDate) {
      return "Date inconnue";
    }
    
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return "Date invalide";
    }
  }

  function getStatusBadge(request: ContactRequest) {
    if (request.status === "completed") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Complété
        </span>
      );
    } else if (request.status === "partial") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          Partiel
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          En attente
        </span>
      );
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Demandes de contact
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Consultez toutes les demandes de contact reçues, y compris celles qui n'ont pas pu être envoyées par email.
        </p>
      </div>

      {contactRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Aucune demande de contact trouvée.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contactRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(request.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {request.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {request.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusBadge(request)}
                        {request.localOnly && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Local
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <details className="relative">
                        <summary className="list-none cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                          Voir détails
                        </summary>
                        <div className="absolute left-0 mt-2 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-10 w-96 text-xs whitespace-normal">
                          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Message:</h4>
                          <p className="mb-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {request.message}
                          </p>
                          
                          <h4 className="font-bold mb-2 text-gray-900 dark:text-white">Statut des emails:</h4>
                          <ul className="space-y-1 mb-2">
                            <li>
                              Email commercial: {request.commercialEmailSent === true 
                                ? "✅ Envoyé" 
                                : request.commercialEmailSent === false 
                                  ? "❌ Échec" 
                                  : "⚠️ Inconnu"}
                            </li>
                            <li>
                              Email client: {request.clientEmailSent === true 
                                ? "✅ Envoyé" 
                                : request.clientEmailSent === false 
                                  ? "❌ Échec" 
                                  : "⚠️ Inconnu"}
                            </li>
                          </ul>
                          
                          {request.error && (
                            <>
                              <h4 className="font-bold mb-2 text-red-600 dark:text-red-400">Erreur:</h4>
                              <p className="text-red-600 dark:text-red-400">
                                {request.error}
                              </p>
                            </>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 