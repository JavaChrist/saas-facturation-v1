"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import { verifierFacturesEnRetard } from "@/services/notificationService";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFacture } from "@/lib/factureProvider";

export default function DebugPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityTestResult, setSecurityTestResult] = useState<{
    status: "success" | "error" | "none";
    message: string;
  }>({ status: "none", message: "" });
  const { factureData, loading: factureLoading, invalidateCache } = useFacture();
  const [storageData, setStorageData] = useState<any>({});
  const [cookieData, setCookieData] = useState<string>("");

  const fetchDebugData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notifications?userId=${user.uid}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDebugData(data);
    } catch (err) {
      console.error("Erreur lors du débogage:", err);
      setError(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  const forceCheckOverdueInvoices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      await verifierFacturesEnRetard(user.uid);

      // Rafraîchir les données de débogage
      await fetchDebugData();
    } catch (err) {
      console.error("Erreur lors de la vérification forcée:", err);
      setError(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testFirestorePermissions = async () => {
    if (!user) return;

    try {
      setSecurityTestResult({
        status: "none",
        message: "Test en cours...",
      });

      // 1. Tester la collection notifications (création)
      try {
        const notificationRef = collection(db, "notifications");
        const testDoc = await addDoc(notificationRef, {
          userId: user.uid,
          factureId: "test-" + Date.now(),
          factureNumero: "TEST-" + Date.now(),
          clientNom: "Test Client",
          message: "Ceci est un test de permission",
          type: "info",
          dateCreation: new Date(),
          lue: false,
          montant: 0,
        });

        // Si on arrive ici, la création a réussi
        console.log("Test de création réussi:", testDoc.id);

        // Essayer de supprimer le document
        try {
          await deleteDoc(doc(db, "notifications", testDoc.id));
          console.log("Test de suppression réussi");

          setSecurityTestResult({
            status: "success",
            message:
              "✅ Les permissions Firestore sont correctement configurées. Vous pouvez maintenant utiliser le système de notifications.",
          });
        } catch (deleteError) {
          console.error("Erreur de suppression:", deleteError);
          setSecurityTestResult({
            status: "error",
            message:
              "Test de création réussi mais échec de suppression. Les règles ne sont pas complètement correctes.",
          });
        }
      } catch (createError) {
        console.error("Erreur de création:", createError);

        // 2. Tester uniquement la lecture si la création échoue
        try {
          const notifQuery = query(
            collection(db, "notifications"),
            where("userId", "==", user.uid),
            limit(1)
          );

          const snapshot = await getDocs(notifQuery);

          if (!snapshot.empty) {
            setSecurityTestResult({
              status: "success",
              message:
                "Lecture possible mais création impossible. Vous devez configurer les règles pour permettre la création.",
            });
          } else {
            setSecurityTestResult({
              status: "error",
              message:
                "❌ Vous n'avez pas les autorisations nécessaires pour lire ou écrire dans la collection notifications. Veuillez configurer les règles Firestore comme indiqué dans firestore.rules.md.",
            });
          }
        } catch (readError) {
          console.error("Erreur de lecture:", readError);
          setSecurityTestResult({
            status: "error",
            message:
              "❌ Erreur d'accès à Firestore. Vérifiez les règles de sécurité comme indiqué dans firestore.rules.md.",
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors du test des permissions:", error);
      setSecurityTestResult({
        status: "error",
        message: `❌ Erreur: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      });
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchDebugData();
  }, [user, router, fetchDebugData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Récupération des données du localStorage
      const localStorageData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            if (value && (key.includes('firebase') || key.includes('plan') || key.includes('facture'))) {
              localStorageData[key] = value.substring(0, 100) + (value.length > 100 ? '...' : '');
            }
          } catch (e) {
            localStorageData[key] = 'Erreur de lecture';
          }
        }
      }
      
      setStorageData(localStorageData);
      
      // Récupération des cookies
      setCookieData(document.cookie);
    }
  }, []);

  const forceStorageRefresh = () => {
    if (typeof window !== 'undefined') {
      const localStorageData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            if (value && (key.includes('firebase') || key.includes('plan') || key.includes('facture'))) {
              localStorageData[key] = value.substring(0, 100) + (value.length > 100 ? '...' : '');
            }
          } catch (e) {
            localStorageData[key] = 'Erreur de lecture';
          }
        }
      }
      
      setStorageData(localStorageData);
      setCookieData(document.cookie);
    }
  };

  // Fonction pour effacer tout le localStorage
  const clearAllStorage = () => {
    if (typeof window !== 'undefined' && confirm('Êtes-vous sûr de vouloir effacer tout le localStorage?')) {
      localStorage.clear();
      sessionStorage.clear();
      forceStorageRefresh();
    }
  };

  // Fonction pour effacer tout le cache des factures
  const clearFactureCache = () => {
    if (typeof window !== 'undefined' && confirm('Êtes-vous sûr de vouloir effacer le cache des factures?')) {
      invalidateCache();
      forceStorageRefresh();
    }
  };

  if (!user) {
    return <p className="text-center text-gray-600 mt-10">Redirection...</p>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold">🐞 Débogage Notifications</h1>
          <div className="flex space-x-4">
            <button
              onClick={forceCheckOverdueInvoices}
              disabled={loading}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 flex items-center"
            >
              <FiRefreshCw
                size={18}
                className={`mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Forcer la vérification
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center"
            >
              <FiArrowLeft size={18} className="mr-2" /> Retour
            </button>
          </div>
        </div>

        {/* Test de permissions Firestore */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="bg-indigo-100 px-6 py-3 border-b">
            <h2 className="font-medium text-lg">
              Test des règles de sécurité Firestore
            </h2>
          </div>
          <div className="p-6">
            <p className="mb-4 text-gray-700">
              Ce test vérifie si vous avez les permissions nécessaires pour
              créer et lire des notifications. Si le test échoue, vous devez
              configurer les règles de sécurité Firestore comme indiqué dans le
              fichier <code>firestore.rules.md</code>.
            </p>

            <div className="flex items-center space-x-4">
              <button
                onClick={testFirestorePermissions}
                className="bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600"
              >
                Tester les permissions
              </button>

              {securityTestResult.status !== "none" && (
                <div
                  className={`p-3 rounded-md ${
                    securityTestResult.status === "success"
                      ? "bg-green-50 text-green-800"
                      : securityTestResult.status === "error"
                      ? "bg-red-50 text-red-800"
                      : ""
                  }`}
                >
                  {securityTestResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>{error}</p>
          </div>
        ) : debugData ? (
          <div className="space-y-6">
            {/* Factures en retard */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-red-100 px-6 py-3 border-b">
                <h2 className="font-medium text-lg">
                  Factures en retard ({debugData.facturesEnRetard.length})
                </h2>
              </div>
              {debugData.facturesEnRetard.length === 0 ? (
                <p className="p-4 text-gray-500">Aucune facture en retard</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Numéro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date création
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date échéance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jours retard
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Délai paiement
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.facturesEnRetard.map((facture: any) => (
                        <tr key={facture.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.numero}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.client}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                facture.statut === "Payée"
                                  ? "bg-green-100 text-green-800"
                                  : facture.statut === "En attente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : facture.statut === "Envoyée"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {facture.statut}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              facture.dateCreation
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              facture.dateEcheance
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">
                            {Math.abs(facture.joursRestants)} jour(s)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.delaisPaiement}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Factures avec échéance proche */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-orange-100 px-6 py-3 border-b">
                <h2 className="font-medium text-lg">
                  Factures avec échéance proche (
                  {debugData.facturesEcheanceProche.length})
                </h2>
              </div>
              {debugData.facturesEcheanceProche.length === 0 ? (
                <p className="p-4 text-gray-500">
                  Aucune facture avec échéance proche
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Numéro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date création
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date échéance
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jours restants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Délai paiement
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.facturesEcheanceProche.map((facture: any) => (
                        <tr key={facture.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.numero}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.client}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                facture.statut === "Payée"
                                  ? "bg-green-100 text-green-800"
                                  : facture.statut === "En attente"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : facture.statut === "Envoyée"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {facture.statut}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              facture.dateCreation
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(
                              facture.dateEcheance
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-orange-600 font-medium">
                            {facture.joursRestants} jour(s)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {facture.delaisPaiement}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-100 px-6 py-3 border-b">
                <h2 className="font-medium text-lg">
                  Notifications actives ({debugData.notifications.length})
                </h2>
              </div>
              {debugData.notifications.length === 0 ? (
                <p className="p-4 text-gray-500">Aucune notification active</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Facture
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {debugData.notifications.map((notification: any) => (
                        <tr key={notification.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                            {notification.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {notification.factureNumero}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {notification.clientNom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${
                                notification.type === "paiement_retard"
                                  ? "bg-red-100 text-red-800"
                                  : notification.type === "paiement_proche"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {notification.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">{notification.message}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {notification.dateCreation instanceof Date
                              ? notification.dateCreation.toLocaleString()
                              : new Date(
                                  notification.dateCreation
                                ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Toutes les factures */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gray-100 px-6 py-3 border-b">
                <h2 className="font-medium text-lg">
                  Toutes les factures ({debugData.factures.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date création
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date échéance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        En retard
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {debugData.factures.map((facture: any) => (
                      <tr key={facture.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {facture.numero}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {facture.client}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              facture.statut === "Payée"
                                ? "bg-green-100 text-green-800"
                                : facture.statut === "En attente"
                                ? "bg-yellow-100 text-yellow-800"
                                : facture.statut === "Envoyée"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {facture.statut}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {facture.montantTTC.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(facture.dateCreation).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(facture.dateEcheance).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {facture.estEnRetard ? (
                            <span className="text-red-600 font-medium">
                              Oui ({Math.abs(facture.joursRestants)} jours)
                            </span>
                          ) : (
                            <span className="text-green-600 font-medium">
                              Non
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-500 text-lg">Aucune donnée disponible</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* État d'authentification */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">État d'authentification</h2>
            <div className="mb-2">
              <span className="font-medium">Chargement :</span> {authLoading ? "En cours" : "Terminé"}
            </div>
            <div className="mb-2">
              <span className="font-medium">Utilisateur :</span> {user ? "Connecté" : "Non connecté"}
            </div>
            {user && (
              <>
                <div className="mb-2">
                  <span className="font-medium">ID utilisateur :</span> {user.uid}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Email :</span> {user.email}
                </div>
              </>
            )}
          </div>
          
          {/* État du cache des factures */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Cache des factures</h2>
            <div className="mb-2">
              <span className="font-medium">Chargement :</span> {factureLoading ? "En cours" : "Terminé"}
            </div>
            <div className="mb-2">
              <span className="font-medium">Factures en cache :</span> {Object.keys(factureData).length}
            </div>
            <button 
              onClick={clearFactureCache}
              className="bg-red-500 text-white px-4 py-2 rounded mt-2">
              Effacer le cache des factures
            </button>
          </div>
          
          {/* Données du localStorage */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Données de stockage</h2>
            <button 
              onClick={forceStorageRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded mb-4 mr-4">
              Rafraîchir
            </button>
            <button 
              onClick={clearAllStorage}
              className="bg-red-500 text-white px-4 py-2 rounded mb-4">
              Effacer tout le stockage
            </button>
            
            <div className="overflow-auto">
              <h3 className="font-medium mt-4 mb-2">localStorage:</h3>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm">
                <pre>{JSON.stringify(storageData, null, 2)}</pre>
              </div>
              
              <h3 className="font-medium mt-4 mb-2">Cookies:</h3>
              <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm break-all">
                <pre>{cookieData || "Aucun cookie trouvé"}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
