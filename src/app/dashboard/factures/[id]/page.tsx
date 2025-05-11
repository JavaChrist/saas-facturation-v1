"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiArrowLeft, FiFileText, FiEdit, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import { getFacture } from "@/services/factureService";
import { generateInvoicePDF } from "@/services/pdfGenerator";
import { Facture, Article } from "@/types/facture";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { db, waitForAuth } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { User } from "firebase/auth";

export default function FactureDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const factureId = params?.id as string;

  // Fonction unique pour gérer tout le chargement
  useEffect(() => {
    let isMounted = true;
    let redirectTimer: NodeJS.Timeout | null = null;
    
    const loadData = async () => {
      try {
        // Si l'authentification est toujours en cours, attendons
        if (authLoading) {
          return; // Sortir et attendre le prochain rendu
        }
        
        // Une fois l'authentification terminée, vérifier si l'utilisateur est connecté
        if (!user) {
          console.log("Utilisateur non connecté, planification de la redirection...");
          
          // Stocker l'URL actuelle pour la redirection après login
          if (typeof window !== 'undefined') {
            const currentPath = `/dashboard/factures/${factureId}`;
            localStorage.setItem("authRedirectUrl", currentPath);
            sessionStorage.setItem("authRedirectUrl", currentPath);
          }
          
          // Utiliser un timer pour éviter les redirections instantanées
          // qui peuvent provoquer des clignotements
          redirectTimer = setTimeout(() => {
            console.log("Redirection vers /login");
            router.push(`/login`);
          }, 500);
          
          return;
        }
        
        // L'utilisateur est connecté, annuler toute redirection programmée
        if (redirectTimer) {
          clearTimeout(redirectTimer);
          redirectTimer = null;
        }
        
        // Vérifier que nous avons un ID de facture
        if (!factureId) {
          if (isMounted) {
            setError("ID de facture manquant");
            setLoading(false);
          }
          return;
        }
        
        console.log("Chargement de la facture avec ID:", factureId);
        
        try {
          // Récupérer la facture directement sans appeler waitForAuth
          const factureRef = doc(db, "factures", factureId);
          const factureDoc = await getDoc(factureRef);
          
          if (!factureDoc.exists()) {
            if (isMounted) {
              setError("Facture introuvable");
              setLoading(false);
            }
            return;
          }
          
          const factureData = factureDoc.data();
          
          // Vérifier l'appartenance de la facture à l'utilisateur
          if (factureData.userId !== user.uid) {
            console.error("Accès non autorisé à la facture");
            if (isMounted) {
              setError("Vous n'êtes pas autorisé à consulter cette facture");
              setLoading(false);
            }
            return;
          }
          
          // Vérification et conversion des dates
          let dateCreation = new Date();
          try {
            if (factureData.dateCreation) {
              if (typeof factureData.dateCreation.toDate === 'function') {
                dateCreation = factureData.dateCreation.toDate();
              } else if (factureData.dateCreation instanceof Date) {
                dateCreation = factureData.dateCreation;
              } else if (typeof factureData.dateCreation === 'string') {
                dateCreation = new Date(factureData.dateCreation);
              }
            }
          } catch (dateError) {
            console.error("Erreur lors de la conversion de la date:", dateError);
            dateCreation = new Date();
          }
          
          // Normalisation du client
          if (!factureData.client) {
            factureData.client = {
              id: "",
              nom: "Client non défini",
              refClient: "",
              rue: "",
              codePostal: "",
              ville: "",
              email: "",
              emails: [],
              delaisPaiement: "30 jours"
            };
          } else {
            // Valeurs par défaut
            const defaultClient = {
              id: "",
              nom: "Client sans nom",
              refClient: "",
              rue: "",
              codePostal: "",
              ville: "",
              email: "",
              emails: [],
              delaisPaiement: "30 jours"
            };
            
            factureData.client = {
              ...defaultClient,
              ...factureData.client,
              emails: Array.isArray(factureData.client.emails) ? factureData.client.emails : []
            };
          }
          
          // Normalisation des articles
          if (!factureData.articles || !Array.isArray(factureData.articles)) {
            factureData.articles = [];
          } else {
            factureData.articles = factureData.articles.map((article: any, index: number) => {
              if (article.isComment) {
                return {
                  id: article.id || Date.now() + index,
                  description: article.description || "Commentaire",
                  quantite: 0,
                  prixUnitaireHT: 0,
                  tva: 0,
                  totalTTC: 0,
                  isComment: true
                };
              }
              
              const prixUnitaireHT = typeof article.prixUnitaireHT === 'number' ? article.prixUnitaireHT : 0;
              const quantite = typeof article.quantite === 'number' ? article.quantite : 0;
              const tva = typeof article.tva === 'number' ? article.tva : 20;
              
              const totalHT = prixUnitaireHT * quantite;
              const totalTVA = (totalHT * tva) / 100;
              const totalTTC = totalHT + totalTVA;
              
              return {
                id: article.id || Date.now() + index,
                description: article.description || `Article ${index + 1}`,
                quantite: quantite,
                prixUnitaireHT: prixUnitaireHT,
                tva: tva,
                totalTTC: totalTTC,
                isComment: false
              };
            });
          }
          
          // Calcul des totaux
          const totalHT = factureData.articles
            .filter((a: Article) => !a.isComment)
            .reduce((sum: number, article: Article) => sum + (article.prixUnitaireHT * article.quantite), 0);
          
          const totalTTC = factureData.articles
            .filter((a: Article) => !a.isComment)
            .reduce((sum: number, article: Article) => sum + article.totalTTC, 0);
          
          // Construction de l'objet final
          const factureObj: Facture = {
            id: factureDoc.id,
            userId: factureData.userId || user.uid,
            numero: factureData.numero || "Facture sans numéro",
            statut: factureData.statut || "En attente",
            client: factureData.client,
            articles: factureData.articles,
            totalHT: factureData.totalHT || totalHT,
            totalTTC: factureData.totalTTC || totalTTC,
            dateCreation: dateCreation
          };
          
          if (isMounted) {
            setFacture(factureObj);
            setLoading(false);
          }
        } catch (fetchError) {
          console.error("Erreur lors de la récupération de la facture:", fetchError);
          if (isMounted) {
            if (fetchError instanceof Error) {
              setError(`Erreur lors du chargement: ${fetchError.message}`);
            } else {
              setError("Impossible de charger les détails de la facture");
            }
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Erreur globale:", error);
        if (isMounted) {
          setError("Une erreur est survenue. Veuillez réessayer ou contacter le support.");
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [factureId, user, authLoading, router]);

  // Format de date français
  const formatDate = (date: any): string => {
    try {
      if (!date) return "-";
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      console.error("Erreur de formatage de date:", e);
      return "-";
    }
  };

  // Gérer la génération du PDF
  const handleGeneratePDF = async () => {
    if (!facture) return;
    
    try {
      await generateInvoicePDF(facture);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      setError("Erreur lors de la génération du PDF. Veuillez réessayer.");
    }
  };

  // Gérer la suppression d'une facture
  const handleDelete = async () => {
    if (!facture || !user) {
      setError("Impossible de supprimer cette facture");
      return;
    }

    // Confirmer la suppression
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
      return;
    }
    
    try {
      setDeleting(true);
      setError(null);

      console.log("Suppression de la facture:", facture.id);
      
      // Vérifier que l'utilisateur est bien le propriétaire
      if (facture.userId !== user.uid) {
        setError("Vous n'êtes pas autorisé à supprimer cette facture");
        setDeleting(false);
        return;
      }

      // Supprimer directement avec Firestore
      await deleteDoc(doc(db, "factures", facture.id));
      console.log("Facture supprimée avec succès");
      
      // Rediriger vers la liste de factures
      router.push("/dashboard/factures");
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture:", error);
      let errorMessage = "Erreur lors de la suppression de la facture";
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      setDeleting(false);
    }
  };

  // Gérer l'édition d'une facture
  const handleEdit = () => {
    router.push(`/dashboard/factures?id=${factureId}`);
  };

  // Gérer les tentatives de rechargement
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Force remount/reload
    router.refresh();
  };

  // Afficher le chargement
  if (loading || authLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  // Afficher les erreurs
  if (error || !facture) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
            Détails de la facture
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center"
            >
              <FiRefreshCw size={18} className="mr-2" /> Réessayer
            </button>
            <button
              onClick={() => router.push("/dashboard/factures")}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center"
            >
              <FiArrowLeft size={18} className="mr-2" /> Retour
            </button>
          </div>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
          <p>{error || "Facture introuvable"}</p>
        </div>
      </div>
    );
  }

  // Le reste du composant reste inchangé
  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          Facture {facture.numero}
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={handleGeneratePDF}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiFileText size={18} className="mr-2" /> Télécharger PDF
          </button>
          <button
            onClick={handleEdit}
            className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiEdit size={18} className="mr-2" /> Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiTrash2 size={18} className="mr-2" /> {deleting ? "Suppression..." : "Supprimer"}
          </button>
          <button
            onClick={() => router.push("/dashboard/factures")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Informations de la facture
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Numéro de facture
                </p>
                <p className="font-medium text-gray-800 dark:text-white">
                  {facture.numero}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Date de création
                </p>
                <p className="font-medium text-gray-800 dark:text-white">
                  {formatDate(facture.dateCreation)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Statut
                </p>
                <p>
                  <span
                    className={`py-1 px-3 rounded-full text-white text-sm inline-block ${
                      facture.statut === "Payée"
                        ? "bg-green-500"
                        : facture.statut === "En attente"
                        ? "bg-yellow-500"
                        : facture.statut === "Envoyée"
                        ? "bg-blue-500"
                        : "bg-red-500"
                    }`}
                  >
                    {facture.statut}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total TTC
                </p>
                <p className="font-medium text-gray-800 dark:text-white">
                  {facture.totalTTC.toFixed(2)} €
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Informations client
            </h2>
            <div className="space-y-2">
              <p className="font-medium text-gray-800 dark:text-white">
                {facture.client.nom}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {facture.client.rue}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {facture.client.codePostal} {facture.client.ville}
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                {facture.client.email}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Articles
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="py-2 px-3 text-left text-gray-800 dark:text-white">
                      Description
                    </th>
                    <th className="py-2 px-3 text-right text-gray-800 dark:text-white">
                      Quantité
                    </th>
                    <th className="py-2 px-3 text-right text-gray-800 dark:text-white">
                      Prix HT
                    </th>
                    <th className="py-2 px-3 text-right text-gray-800 dark:text-white">
                      TVA
                    </th>
                    <th className="py-2 px-3 text-right text-gray-800 dark:text-white">
                      Total TTC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {facture.articles.map((article, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-3 px-3 text-gray-800 dark:text-gray-200">
                        {article.description}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-800 dark:text-gray-200">
                        {article.isComment ? "" : article.quantite}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-800 dark:text-gray-200">
                        {article.isComment
                          ? ""
                          : `${article.prixUnitaireHT.toFixed(2)} €`}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-800 dark:text-gray-200">
                        {article.isComment ? "" : `${article.tva} %`}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-800 dark:text-gray-200">
                        {article.isComment
                          ? ""
                          : `${article.totalTTC.toFixed(2)} €`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 dark:border-gray-600">
                    <td colSpan={3} className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800 dark:text-white">
                      Total HT:
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800 dark:text-white">
                      {facture.totalHT.toFixed(2)} €
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-3 px-3"></td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800 dark:text-white">
                      Total TTC:
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-gray-800 dark:text-white">
                      {facture.totalTTC.toFixed(2)} €
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar avec actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={handleGeneratePDF}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <FiFileText className="mr-2" /> Télécharger PDF
              </button>
              <button
                onClick={handleEdit}
                className="w-full bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600 flex items-center justify-center"
              >
                <FiEdit className="mr-2" /> Modifier
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center justify-center"
              >
                <FiTrash2 className="mr-2" /> {deleting ? "Suppression..." : "Supprimer"}
              </button>
              <button
                onClick={() => router.push(`/dashboard/factures`)}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center"
              >
                <FiArrowLeft className="mr-2" /> Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
