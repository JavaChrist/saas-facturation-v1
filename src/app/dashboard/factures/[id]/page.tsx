"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { FiArrowLeft, FiFileText, FiEdit, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import { useFacture } from "@/lib/factureProvider";
import { generateInvoicePDF } from "@/services/pdfGenerator";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Facture } from "@/types/facture";

export default function FactureDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const { loadFacture, factureData, loading: factureLoading, error: factureError } = useFacture();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [localLoading, setLocalLoading] = useState<boolean>(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  
  // Récupérer l'id de la facture depuis les paramètres de l'URL
  const factureId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  
  // Charger la facture dès que possible
  useEffect(() => {
    // Fonction pour charger les données
    const fetchData = async () => {
      try {
        setLocalLoading(true);
        
        // Si l'authentification est en cours, attendre
        if (authLoading) {
          return;
        }
        
        // Si aucun utilisateur n'est connecté, rediriger
        if (!user) {
          // Stocker l'URL actuelle pour redirection après login
          const currentPath = `/dashboard/factures/${factureId}`;
          if (typeof window !== 'undefined') {
            localStorage.setItem("authRedirectUrl", currentPath);
            sessionStorage.setItem("authRedirectUrl", currentPath);
          }
          
          // Rediriger avec un délai pour éviter les flashs
          setTimeout(() => {
            router.push('/login');
          }, 100);
          return;
        }
        
        // Essayer de charger la facture depuis le cache du contexte
        // ou depuis Firestore si pas en cache
        const result = await loadFacture(factureId);
        if (result) {
          setFacture(result);
          setLocalError(null);
        } else {
          setLocalError(factureError || "Impossible de charger la facture");
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la facture:", error);
        setLocalError("Une erreur est survenue. Veuillez réessayer.");
      } finally {
        setLocalLoading(false);
      }
    };
    
    fetchData();
  }, [factureId, user, authLoading, loadFacture, factureError, router]);
  
  // Mettre à jour la facture lorsque le cache est actualisé
  useEffect(() => {
    if (factureId && factureData[factureId]) {
      setFacture(factureData[factureId]);
      setLocalError(null);
    }
  }, [factureId, factureData]);
  
  // Format de date français
  const formatDate = (date: any): string => {
    try {
      if (!date) return "-";
      
      // Gérer le cas des Timestamps Firestore
      if (date && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      }
      
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
      setLocalError("Erreur lors de la génération du PDF. Veuillez réessayer.");
    }
  };
  
  // Gérer la suppression d'une facture
  const handleDelete = async () => {
    if (!facture || !user) {
      setLocalError("Impossible de supprimer cette facture");
      return;
    }
    
    // Confirmer la suppression
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
      return;
    }
    
    try {
      setDeleting(true);
      setLocalError(null);
      
      // Vérifier que l'utilisateur est propriétaire
      if (facture.userId !== user.uid) {
        setLocalError("Vous n'êtes pas autorisé à supprimer cette facture");
        setDeleting(false);
        return;
      }
      
      // Supprimer la facture
      await deleteDoc(doc(db, "factures", facture.id));
      
      // Rediriger vers la liste
      router.push("/dashboard/factures");
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      setLocalError(`Erreur lors de la suppression: ${error.message || "Veuillez réessayer"}`);
      setDeleting(false);
    }
  };
  
  // Gérer l'édition d'une facture
  const handleEdit = () => {
    router.push(`/dashboard/factures?id=${factureId}`);
  };
  
  // Gérer les tentatives de rechargement
  const handleRetry = async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      const result = await loadFacture(factureId);
      if (result) {
        setFacture(result);
      } else {
        setLocalError("Impossible de charger la facture");
      }
    } catch (error) {
      setLocalError("Erreur lors du rechargement de la facture");
    } finally {
      setLocalLoading(false);
    }
  };
  
  // Afficher le chargement
  if (localLoading || authLoading || factureLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200">Chargement de la facture...</p>
        </div>
      </div>
    );
  }
  
  // Afficher les erreurs
  if (localError || !facture) {
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
          <p>{localError || "Facture introuvable"}</p>
        </div>
      </div>
    );
  }
  
  // Afficher les détails de la facture
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
