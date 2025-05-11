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
  const [retryCount, setRetryCount] = useState(0);
  const [userChecked, setUserChecked] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  const factureId = params?.id as string;

  // Vérifier l'état d'authentification à chaque rendu
  useEffect(() => {
    console.log("FactureDetailsPage - Vérification d'authentification:", {
      userExists: !!user,
      authLoading,
      userChecked,
      redirectAttempted
    });

    // Attendre que l'authentification soit complètement chargée avant de prendre une décision
    if (!authLoading) {
      setUserChecked(true);
      
      // Vérifier si l'utilisateur est connecté - seulement si l'authentification est terminée
      // ET qu'on est certain que l'utilisateur n'est pas connecté
      if (!user && !redirectAttempted && userChecked) {
        console.log(
          "FactureDetailsPage - Authentification terminée, utilisateur non connecté, redirection"
        );
        setRedirectAttempted(true);
        
        // Stocker l'URL actuelle pour rediriger l'utilisateur après connexion
        const currentPath = `/dashboard/factures/${params.id}`;
        
        // Sauvegarder dans le localStorage pour que la redirection persiste même après refresh
        if (typeof window !== 'undefined') {
          localStorage.setItem("authRedirectUrl", currentPath);
          sessionStorage.setItem("authRedirectUrl", currentPath);
        }
        
        // Rediriger vers la page de login avec le paramètre de redirection
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
    }
  }, [user, authLoading, router, params.id, userChecked, redirectAttempted]);

  // Charger les données de la facture seulement si l'utilisateur est authentifié
  useEffect(() => {
    // Ne pas essayer de charger la facture si l'authentification est en cours
    if (authLoading || !user) {
      console.log("FactureDetailsPage - Attente de l'authentification avant chargement");
      return;
    }
    
    const loadFacture = async () => {
      try {
        setLoading(true);
        setError(null);

        // S'assurer que l'utilisateur est authentifié avec un délai plus long
        let retries = 0;
        let currentUser = null;
        
        while (retries < 3 && !currentUser) {
          currentUser = await waitForAuth() as User | null;
          
          if (!currentUser) {
            console.log(`Tentative ${retries + 1} : Attente de l'authentification...`);
            // Attendre un court instant avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
          }
        }
        
        if (!currentUser) {
          console.warn("Utilisateur non connecté après plusieurs tentatives");
          // Ne pas rediriger immédiatement, laisser le useEffect d'authentification s'en charger
          setLoading(false);
          setError("Authentification requise. Veuillez vous connecter.");
          return;
        }

        if (!factureId) {
          setError("ID de facture manquant");
          setLoading(false);
          return;
        }

        console.log("Chargement de la facture avec ID:", factureId);

        try {
          // Récupérer la facture par son ID
          const factureRef = doc(db, "factures", factureId);
          const factureDoc = await getDoc(factureRef);
          
          console.log("Facture existe:", factureDoc.exists());
          
          if (!factureDoc.exists()) {
            setError("Facture introuvable");
            setLoading(false);
            return;
          }
          
          const factureData = factureDoc.data();
          console.log("Données de la facture récupérées:", {
            id: factureId,
            userId: factureData.userId,
            statut: factureData.statut
          });
          
          // Vérifier que la facture appartient à l'utilisateur
          if (factureData.userId !== currentUser.uid) {
            console.error("Accès non autorisé à la facture. ID utilisateur:", 
              currentUser.uid, "ID propriétaire:", factureData.userId);
            setError("Vous n'êtes pas autorisé à consulter cette facture");
            setLoading(false);
            return;
          }
          
          // Vérification et conversion sécurisée des dates
          let dateCreation = new Date();
          try {
            if (factureData.dateCreation) {
              if (typeof factureData.dateCreation.toDate === 'function') {
                // C'est un Timestamp Firestore
                dateCreation = factureData.dateCreation.toDate();
              } else if (factureData.dateCreation instanceof Date) {
                // C'est déjà une Date
                dateCreation = factureData.dateCreation;
              } else if (typeof factureData.dateCreation === 'string') {
                // C'est une chaîne de caractères
                dateCreation = new Date(factureData.dateCreation);
              }
            }
          } catch (dateError) {
            console.error("Erreur lors de la conversion de la date:", dateError);
            // Fallback à la date actuelle
            dateCreation = new Date();
          }
          
          // Vérifier que le client existe et a les bonnes propriétés
          if (!factureData.client) {
            console.error("La facture n'a pas de client défini");
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
            // S'assurer que toutes les propriétés du client existent
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
            
            // Fusionner avec les valeurs par défaut pour les propriétés manquantes
            factureData.client = {
              ...defaultClient,
              ...factureData.client,
              // S'assurer que emails existe et est un tableau
              emails: Array.isArray(factureData.client.emails) ? factureData.client.emails : []
            };
          }
          
          // Vérifier que les articles existent et sont correctement formatés
          if (!factureData.articles || !Array.isArray(factureData.articles)) {
            console.error("La facture n'a pas d'articles ou le format est incorrect");
            factureData.articles = [];
          } else {
            // Vérifier chaque article et corriger les propriétés manquantes
            factureData.articles = factureData.articles.map((article, index) => {
              // Si l'article est un commentaire
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
              
              // Si l'article est normal
              const prixUnitaireHT = typeof article.prixUnitaireHT === 'number' ? article.prixUnitaireHT : 0;
              const quantite = typeof article.quantite === 'number' ? article.quantite : 0;
              const tva = typeof article.tva === 'number' ? article.tva : 20;
              
              // Recalculer le totalTTC pour s'assurer qu'il est correct
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
          
          // Recalculer les totaux pour s'assurer qu'ils sont corrects
          const totalHT = factureData.articles
            .filter((a: Article) => !a.isComment)
            .reduce((sum: number, article: Article) => sum + (article.prixUnitaireHT * article.quantite), 0);
          
          const totalTTC = factureData.articles
            .filter((a: Article) => !a.isComment)
            .reduce((sum: number, article: Article) => sum + article.totalTTC, 0);
          
          // Convertir les données en objet Facture complet avec vérifications
          const factureObj: Facture = {
            id: factureDoc.id,
            userId: factureData.userId || currentUser.uid,
            numero: factureData.numero || "Facture sans numéro",
            statut: factureData.statut || "En attente",
            client: factureData.client,
            articles: factureData.articles,
            totalHT: factureData.totalHT || totalHT,
            totalTTC: factureData.totalTTC || totalTTC,
            dateCreation: dateCreation
          };
          
          console.log("Facture convertie avec succès");
          setFacture(factureObj);
          setLoading(false);
        } catch (fetchError) {
          console.error("Erreur spécifique lors de la récupération de la facture:", fetchError);
          if (fetchError instanceof Error) {
            setError(`Erreur lors du chargement: ${fetchError.message}`);
          } else {
            setError("Impossible de charger les détails de la facture");
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Erreur globale lors du chargement de la facture:", error);
        setError("Une erreur est survenue. Veuillez réessayer ou contacter le support.");
        setLoading(false);
      }
    };

    loadFacture();
  }, [factureId, router, retryCount]);

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
    if (!facture) {
      setError("Impossible de supprimer une facture non chargée");
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
      
      // Vérifier l'authentification avant la suppression
      const currentUser = await waitForAuth() as User | null;
      
      if (!currentUser) {
        setError("Vous devez être connecté pour supprimer cette facture");
        setDeleting(false);
        return;
      }
      
      // Vérifier que l'utilisateur est bien le propriétaire
      if (facture.userId !== currentUser.uid) {
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

  // Bouton pour recharger les données en cas d'erreur
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Afficher le chargement tant que l'authentification n'est pas terminée
  // ou que les données sont en cours de chargement
  if (loading || authLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        <p className="ml-3 text-gray-800 dark:text-gray-200">Chargement en cours...</p>
      </div>
    );
  }

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
