"use client";
import React, { useState } from "react";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { calculerDateEcheance, DELAIS_PAIEMENT_OPTIONS, DelaiPaiementType } from "@/services/delaisPaiementService";
import DelaiPaiementSelector from "@/components/DelaiPaiementSelector";

export default function TestDelaisPage() {
  const router = useRouter();
  const [dateCreation, setDateCreation] = useState(new Date().toISOString().split('T')[0]);
  const [delaiSelectionne, setDelaiSelectionne] = useState<DelaiPaiementType>("30 jours fin de mois le 10");

  const dateCreationObj = new Date(dateCreation);
  const dateEcheance = calculerDateEcheance(dateCreationObj, delaiSelectionne);
  const joursEcart = Math.floor((dateEcheance.getTime() - dateCreationObj.getTime()) / (1000 * 60 * 60 * 24));

  // Exemples prédéfinis
  const exemples = [
    { date: "2024-01-15", delai: "30 jours fin de mois le 10" as DelaiPaiementType },
    { date: "2024-02-28", delai: "60 jours fin de mois le 10" as DelaiPaiementType },
    { date: "2024-03-31", delai: "30 jours fin de mois le 15" as DelaiPaiementType },
    { date: "2024-06-15", delai: "45 jours fin de mois" as DelaiPaiementType },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="flex items-center bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 mr-4 transform hover:scale-105 transition-transform duration-300"
            >
              <FiArrowLeft className="mr-2" />
              Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              🧪 Test des délais de paiement
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => router.push("/dashboard/clients")}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center transform hover:scale-105 transition-transform duration-300"
            >
              👥 Clients
            </button>
            <button
              onClick={() => router.push("/dashboard/factures")}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center transform hover:scale-105 transition-transform duration-300"
            >
              📜 Factures
            </button>
          </div>
        </div>

        {/* Note explicative */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-blue-500 text-xl">💡</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                À quoi sert cette page ?
              </h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Cette page vous permet de tester et comprendre comment fonctionnent les différents délais de paiement
                avant de les appliquer à vos clients. Vous pouvez voir exactement quand une facture sera due selon
                la date de création et le délai choisi.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculateur interactif */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
              <FiCalendar className="mr-2" />
              Calculateur de délai
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de création de la facture
                </label>
                <input
                  type="date"
                  value={dateCreation}
                  onChange={(e) => setDateCreation(e.target.value)}
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Délai de paiement
                </label>
                <DelaiPaiementSelector
                  value={delaiSelectionne}
                  onChange={setDelaiSelectionne}
                  showDescription={true}
                  showExample={false}
                />
              </div>

              {/* Résultat */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  Résultat du calcul
                </h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Date de création :</span> {dateCreationObj.toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Date d'échéance :</span> {dateEcheance.toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Nombre de jours :</span> {joursEcart} jours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exemples prédéfinis */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Exemples de calculs
            </h2>

            <div className="space-y-4">
              {exemples.map((exemple, index) => {
                const dateEx = new Date(exemple.date);
                const echeanceEx = calculerDateEcheance(dateEx, exemple.delai);
                const joursEx = Math.floor((echeanceEx.getTime() - dateEx.getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-600 p-3 rounded-md">
                    <div className="text-sm font-medium text-gray-800 dark:text-white mb-1">
                      {exemple.delai}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Création : {dateEx.toLocaleDateString('fr-FR')}</div>
                      <div>Échéance : {echeanceEx.toLocaleDateString('fr-FR')}</div>
                      <div>Durée : {joursEx} jours</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tableau récapitulatif */}
        <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Tous les délais disponibles
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-2 px-3 text-gray-800 dark:text-white">Délai</th>
                  <th className="text-left py-2 px-3 text-gray-800 dark:text-white">Description</th>
                  <th className="text-left py-2 px-3 text-gray-800 dark:text-white">Exemple (depuis aujourd'hui)</th>
                </tr>
              </thead>
              <tbody>
                {DELAIS_PAIEMENT_OPTIONS.map((option) => {
                  const exempleEcheance = calculerDateEcheance(new Date(), option.value);
                  const exempleJours = Math.floor((exempleEcheance.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={option.value} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 px-3 text-gray-800 dark:text-white font-medium">
                        {option.label}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">
                        {option.description}
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 text-sm">
                        {exempleEcheance.toLocaleDateString('fr-FR')} ({exempleJours} jours)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 