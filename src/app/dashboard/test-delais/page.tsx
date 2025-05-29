"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCalendar, FiClock, FiCheck } from 'react-icons/fi';

const TestDelaisPage = () => {
  const router = useRouter();
  const [dateFacture, setDateFacture] = useState<Date>(new Date());
  const [delaiSelectionne, setDelaiSelectionne] = useState<string>('30 jours');

  // Liste complète des délais de paiement disponibles
  const delaisDisponibles: string[] = [
    '30 jours',
    '60 jours',
    '90 jours',
    '15 jours',
    '45 jours',
    '30 jours fin de mois',
    '60 jours fin de mois',
    '30 jours fin de mois le 10',
    '60 jours fin de mois le 10',
    '30 jours fin de mois le 15',
    '60 jours fin de mois le 15',
    'Fin de mois',
    'Fin de mois le 10',
    'Fin de mois le 15',
    'Comptant',
    'À réception'
  ];

  // Fonction simplifiée de calcul de date d'échéance
  const calculerDateEcheance = (dateFacture: Date, delai: string): Date => {
    const date = new Date(dateFacture);

    switch (delai) {
      case 'Comptant':
      case 'À réception':
        return date;

      case '15 jours':
        date.setDate(date.getDate() + 15);
        return date;

      case '30 jours':
        date.setDate(date.getDate() + 30);
        return date;

      case '45 jours':
        date.setDate(date.getDate() + 45);
        return date;

      case '60 jours':
        date.setDate(date.getDate() + 60);
        return date;

      case '90 jours':
        date.setDate(date.getDate() + 90);
        return date;

      case 'Fin de mois':
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);

      case 'Fin de mois le 10':
        const finMois10 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois10.setDate(finMois10.getDate() + 10);
        return finMois10;

      case 'Fin de mois le 15':
        const finMois15 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois15.setDate(finMois15.getDate() + 15);
        return finMois15;

      case '30 jours fin de mois':
        const finMois30j = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois30j.setDate(finMois30j.getDate() + 30);
        return finMois30j;

      case '60 jours fin de mois':
        const finMois60j = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois60j.setDate(finMois60j.getDate() + 60);
        return finMois60j;

      case '30 jours fin de mois le 10':
        const finMois30j10 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois30j10.setDate(finMois30j10.getDate() + 40); // +30 jours +10
        return finMois30j10;

      case '60 jours fin de mois le 10':
        const finMois60j10 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois60j10.setDate(finMois60j10.getDate() + 70); // +60 jours +10
        return finMois60j10;

      case '30 jours fin de mois le 15':
        const finMois30j15 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois30j15.setDate(finMois30j15.getDate() + 45); // +30 jours +15
        return finMois30j15;

      case '60 jours fin de mois le 15':
        const finMois60j15 = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        finMois60j15.setDate(finMois60j15.getDate() + 75); // +60 jours +15
        return finMois60j15;

      default:
        date.setDate(date.getDate() + 30);
        return date;
    }
  };

  // Calculer la date d'échéance
  const dateEcheance = calculerDateEcheance(dateFacture, delaiSelectionne);

  // Calculer le nombre de jours
  const nombreJours = Math.ceil((dateEcheance.getTime() - dateFacture.getTime()) / (1000 * 60 * 60 * 24));

  // Exemples de dates pour test
  const exemplesDate = [
    { label: "Aujourd'hui", date: new Date() },
    { label: "1er du mois", date: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    { label: "15 du mois", date: new Date(new Date().getFullYear(), new Date().getMonth(), 15) },
    { label: "Fin du mois", date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) },
    { label: "Début mois prochain", date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1) },
  ];

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold text-text-light dark:text-text-dark">
            🗓️ Test des Délais de Paiement
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
        </div>

        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark flex items-center">
            <FiCalendar className="mr-2" />
            Configuration du Test
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sélection de la date de facture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de la facture
              </label>
              <input
                type="date"
                value={dateFacture.toISOString().split('T')[0]}
                onChange={(e) => setDateFacture(new Date(e.target.value))}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(dateFacture)}
              </p>
            </div>

            {/* Sélection du délai */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Délai de paiement
              </label>
              <select
                value={delaiSelectionne}
                onChange={(e) => setDelaiSelectionne(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {delaisDisponibles.map((delai) => (
                  <option key={delai} value={delai}>
                    {delai}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exemples de dates rapides */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exemples rapides
            </label>
            <div className="flex flex-wrap gap-2">
              {exemplesDate.map((exemple) => (
                <button
                  key={exemple.label}
                  onClick={() => setDateFacture(exemple.date)}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {exemple.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultat du calcul */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark flex items-center">
            <FiClock className="mr-2" />
            Résultat du Calcul
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Date de facture</h3>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatDateShort(dateFacture)}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                {formatDate(dateFacture).split(',')[0]}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Date d'échéance</h3>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatDateShort(dateEcheance)}
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                {formatDate(dateEcheance).split(',')[0]}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Nombre de jours</h3>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {nombreJours} jour{nombreJours > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                {delaiSelectionne}
              </p>
            </div>
          </div>
        </div>

        {/* Tableau de test pour tous les délais */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 text-text-light dark:text-text-dark flex items-center">
            <FiCheck className="mr-2" />
            Test Complet - Tous les Délais
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">
                    Délai de paiement
                  </th>
                  <th className="text-left p-3 font-semibold text-gray-700 dark:text-gray-300">
                    Date d'échéance
                  </th>
                  <th className="text-right p-3 font-semibold text-gray-700 dark:text-gray-300">
                    Jours
                  </th>
                </tr>
              </thead>
              <tbody>
                {delaisDisponibles.map((delai) => {
                  const echeance = calculerDateEcheance(dateFacture, delai);
                  const jours = Math.ceil((echeance.getTime() - dateFacture.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr
                      key={delai}
                      className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${delai === delaiSelectionne ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                    >
                      <td className="p-3 text-gray-900 dark:text-gray-100">
                        <span className={`${delai === delaiSelectionne ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}>
                          {delai}
                        </span>
                      </td>
                      <td className="p-3 text-gray-900 dark:text-gray-100">
                        {formatDateShort(echeance)}
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          ({formatDate(echeance).split(',')[0]})
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-900 dark:text-gray-100">
                        <span className={`px-2 py-1 rounded-full text-sm ${jours === 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                          : jours <= 30
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            : jours <= 60
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
                          }`}>
                          {jours} jour{jours > 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            💡 Cette page vous permet de tester le système de calcul des délais de paiement.
            <br />
            Modifiez la date de facture et le délai pour voir comment les dates d'échéance sont calculées.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestDelaisPage; 