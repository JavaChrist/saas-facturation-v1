"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiFileText, FiSend, FiDownload } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import { getFacture } from "@/services/factureService";
import { generateInvoicePDF } from "@/services/pdfGenerator";
import { Facture } from "@/types/facture";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { emailService } from "@/services/emailService";

export default function FactureDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userChecked, setUserChecked] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Vérifier l'état d'authentification à chaque rendu
  useEffect(() => {
    console.log("FactureDetailsPage - Vérification d'authentification:", {
      userExists: !!user,
      authLoading,
      userChecked,
    });

    // Si l'authentification est terminée, on peut déterminer si l'utilisateur est connecté
    if (!authLoading) {
      setUserChecked(true);
      if (!user) {
        console.log(
          "FactureDetailsPage - Authentification terminée, utilisateur non connecté, redirection"
        );
        router.push(`/login?redirect=/dashboard/factures/${params.id}`);
      }
    }
  }, [user, authLoading, router, params.id, userChecked]);

  // Récupérer les détails de la facture
  useEffect(() => {
    console.log("FactureDetailsPage - État de l'authentification:", {
      userExists: !!user,
      authLoading,
      factureId: params.id,
      userChecked,
    });

    // Ne rien faire si l'authentification est en cours ou si l'utilisateur n'est pas connecté
    if (authLoading || !user || !userChecked) {
      return;
    }

    const fetchFacture = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(
          "FactureDetailsPage - Chargement de la facture:",
          params.id
        );

        // Récupérer la facture avec l'ID fourni
        const factureData = await getFacture(params.id);

        if (!factureData) {
          console.log("FactureDetailsPage - Facture introuvable");
          setError("Facture introuvable");
          return;
        }

        console.log(
          "FactureDetailsPage - Facture chargée avec succès:",
          factureData.numero
        );
        setFacture(factureData);
      } catch (err) {
        console.error(
          "FactureDetailsPage - Erreur lors du chargement de la facture:",
          err
        );
        setError("Erreur lors du chargement de la facture");
      } finally {
        setLoading(false);
      }
    };

    fetchFacture();
  }, [params.id, user, authLoading, userChecked]);

  // Formater une date pour l'affichage
  const formatDate = (date: Date | any) => {
    if (!date) return "-";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return format(dateObj, "d MMMM yyyy", { locale: fr });
    } catch (e) {
      return "-";
    }
  };

  // Générer un PDF de la facture
  const handleGeneratePDF = async () => {
    if (!facture) return;

    try {
      await generateInvoicePDF(facture);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération du PDF");
    }
  };

  // Fonction pour envoyer une facture par email
  const handleSendInvoiceByEmail = async (
    factureId: string,
    clientEmail: string
  ) => {
    if (!factureId || !clientEmail) {
      alert("Informations manquantes pour l'envoi de la facture");
      return;
    }

    try {
      // Afficher une boîte de dialogue pour confirmer ou modifier l'email
      const email = window.prompt(
        "Veuillez confirmer ou modifier l'adresse email",
        clientEmail
      );

      if (!email) return; // L'utilisateur a annulé

      // Afficher un indicateur de chargement
      setSendingEmail(true);

      // Appeler le service d'email pour envoyer la facture
      const result = await emailService.sendInvoiceByEmail(factureId, email);

      if (result.success) {
        alert(`Facture envoyée avec succès à ${email}`);
      } else {
        alert(`Erreur lors de l'envoi : ${result.message}`);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de la facture par email:", error);
      alert("Une erreur est survenue lors de l'envoi de la facture.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Fonction pour envoyer la facture par email
  const handleSendEmail = async () => {
    if (!facture) return;

    // Vérifier que le client a un email
    if (!facture.client.email) {
      setEmailError("Le client n'a pas d'adresse email configurée.");
      return;
    }

    setSendingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);

    try {
      // Appeler la fonction handleSendInvoiceByEmail que nous avons créée précédemment
      await handleSendInvoiceByEmail(facture.id, facture.client.email);

      // Mise à jour du statut de facture comme avec l'ancienne fonction
      if (facture.statut !== "Payée") {
        // Mise à jour du statut (vous pouvez le faire via votre service factureService)
        // Notez que cette partie n'est pas incluse dans handleSendInvoiceByEmail
        // et doit être gérée séparément si nécessaire
      }

      setEmailSuccess(`Facture envoyée avec succès à ${facture.client.email}`);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la facture par email:", error);
      setEmailError(
        `Une erreur est survenue lors de l'envoi: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
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
          <button
            onClick={() => router.push("/dashboard/factures")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
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

        {/* Sidebar avec actions (sans options de paiement) */}
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
                <FiDownload className="mr-2" /> Télécharger PDF
              </button>
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                <FiSend className="mr-2" />
                {sendingEmail ? "Envoi en cours..." : "Envoyer par email"}
              </button>
              {emailSuccess && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md mt-2">
                  {emailSuccess}
                </div>
              )}
              {emailError && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mt-2">
                  {emailError}
                </div>
              )}
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
