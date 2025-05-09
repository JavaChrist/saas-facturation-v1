"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiDownload,
  FiUpload,
  FiCheckCircle,
} from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  exportUserData,
  importUserData,
  downloadJson,
  generateExportFilename,
} from "@/services/exportImportService";

export default function SauvegardesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exporter les données de l'utilisateur
  const handleExport = async () => {
    if (!user) {
      setError("Vous devez être connecté pour exporter vos données");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setIsExporting(true);

      // Exporter les données au format JSON
      const jsonData = await exportUserData(user.uid);

      // Générer un nom de fichier avec la date/heure actuelle
      const filename = generateExportFilename();

      // Télécharger le fichier
      downloadJson(jsonData, filename);

      setSuccess(
        `Exportation réussie. Vos données ont été téléchargées dans le fichier ${filename}`
      );
    } catch (error) {
      console.error("Erreur lors de l'exportation:", error);
      setError(
        `Erreur lors de l'exportation: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Déclencher le sélecteur de fichier
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Importer les données depuis un fichier JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      setError("Vous devez être connecté pour importer des données");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setSuccess(null);
      setIsImporting(true);

      // Lire le contenu du fichier
      const fileContent = await file.text();

      // Importer les données
      const result = await importUserData(fileContent, user.uid);

      setSuccess(result.summary);

      // Réinitialiser le champ de fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Erreur lors de l'importation:", error);
      setError(
        `Erreur lors de l'importation: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Configuration des sauvegardes automatiques (placeholder pour une future implémentation)
  const handleScheduledBackup = () => {
    setSuccess(
      "Les sauvegardes automatiques seront implémentées dans une future mise à jour"
    );
  };

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="flex justify-between items-center mb-6 w-full max-w-3xl">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          💾 Sauvegardes
        </h1>
        <button
          onClick={() => router.push("/dashboard/parametres")}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded relative mb-6 max-w-3xl w-full">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded relative mb-6 max-w-3xl w-full flex items-center">
          <FiCheckCircle className="mr-2" size={20} />
          <p>{success}</p>
        </div>
      )}

      <div className="space-y-6 max-w-3xl w-full">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Sauvegarde manuelle
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Exportez toutes vos données (factures, clients, modèles, etc.) dans
            un fichier JSON que vous pourrez conserver en lieu sûr.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center transform hover:scale-105 transition-transform duration-300"
            >
              <FiDownload size={18} className="mr-2" />
              {isExporting ? "Exportation en cours..." : "Exporter mes données"}
            </button>

            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
              />
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center transform hover:scale-105 transition-transform duration-300"
              >
                <FiUpload size={18} className="mr-2" />
                {isImporting
                  ? "Importation en cours..."
                  : "Importer des données"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Sauvegarde automatique
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Configurez des sauvegardes automatiques régulières de vos données
            pour plus de sécurité.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  Sauvegarde hebdomadaire
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tous les dimanches à minuit
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  onChange={handleScheduledBackup}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">
                  Sauvegarde mensuelle
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Le 1er du mois à minuit
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  onChange={handleScheduledBackup}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
            <p className="italic">
              Ces fonctionnalités seront pleinement opérationnelles dans une
              future mise à jour. Pour le moment, nous vous recommandons
              d'effectuer des sauvegardes manuelles régulières.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Conseils de sécurité
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li>Effectuez des sauvegardes régulières de vos données</li>
            <li>
              Conservez vos fichiers de sauvegarde dans plusieurs emplacements
              (cloud, disque externe, etc.)
            </li>
            <li>
              Vérifiez périodiquement que vous pouvez restaurer vos sauvegardes
            </li>
            <li>Utilisez un mot de passe fort pour protéger votre compte</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
