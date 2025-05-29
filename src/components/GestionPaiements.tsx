import React, { useState } from "react";
import { FiPlus, FiTrash2, FiX, FiDollarSign } from "react-icons/fi";
import { Facture, Paiement } from "@/types/facture";
import {
  ajouterPaiement,
  supprimerPaiement,
  formaterMontant,
  calculerMontantPaye,
  calculerResteAPayer
} from "@/services/paiementService";

interface GestionPaiementsProps {
  facture: Facture;
  onPaiementChange: () => void; // Callback pour rafraîchir les données
}

export const GestionPaiements: React.FC<GestionPaiementsProps> = ({
  facture,
  onPaiementChange
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fonction pour créer un paiement vide avec une date valide
  const creerPaiementVide = (): Omit<Paiement, "id"> => {
    const dateActuelle = new Date();
    // S'assurer que la date est valide
    if (isNaN(dateActuelle.getTime())) {
      console.error("Erreur: impossible de créer une date valide");
      // Fallback vers une date fixe si même new Date() échoue
      return {
        montant: 0,
        datePaiement: new Date(2024, 0, 1), // 1er janvier 2024 comme fallback
        methodePaiement: "Virement",
        reference: "",
        commentaire: ""
      };
    }

    return {
      montant: 0,
      datePaiement: dateActuelle,
      methodePaiement: "Virement",
      reference: "",
      commentaire: ""
    };
  };

  // Fonction pour formater une date de manière sécurisée
  const formaterDateSecurisee = (date: Date | string | any): string => {
    try {
      let dateObj: Date;

      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date && typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } else {
        return new Date().toLocaleDateString('fr-FR');
      }

      if (isNaN(dateObj.getTime())) {
        return new Date().toLocaleDateString('fr-FR');
      }

      return dateObj.toLocaleDateString('fr-FR');
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return new Date().toLocaleDateString('fr-FR');
    }
  };

  const [nouveauPaiement, setNouveauPaiement] = useState<Omit<Paiement, "id">>(creerPaiementVide());
  const [isLoading, setIsLoading] = useState(false);

  const montantPaye = calculerMontantPaye(facture.paiements || []);
  const resteAPayer = calculerResteAPayer(facture.totalTTC, montantPaye);

  const handleAjouterPaiement = async () => {
    if (nouveauPaiement.montant <= 0) {
      alert("Le montant doit être supérieur à 0");
      return;
    }

    // Arrondir les montants à 2 décimales pour éviter les problèmes de précision
    const montantSaisi = Math.round(nouveauPaiement.montant * 100) / 100;
    const resteAPayerArrondi = Math.round(resteAPayer * 100) / 100;

    if (montantSaisi > resteAPayerArrondi) {
      alert(`Le montant ne peut pas dépasser le reste à payer (${formaterMontant(resteAPayerArrondi)})`);
      return;
    }

    // Valider et normaliser la date
    let datePaiementValide: Date;
    try {
      if (nouveauPaiement.datePaiement instanceof Date && !isNaN(nouveauPaiement.datePaiement.getTime())) {
        datePaiementValide = new Date(nouveauPaiement.datePaiement);
      } else {
        console.warn("Date invalide détectée, utilisation de la date actuelle");
        datePaiementValide = new Date();
      }

      // S'assurer que la date est dans une plage raisonnable
      const maintenant = new Date();
      const il_y_a_10_ans = new Date(maintenant.getFullYear() - 10, 0, 1);
      const dans_1_an = new Date(maintenant.getFullYear() + 1, 11, 31);

      if (datePaiementValide < il_y_a_10_ans || datePaiementValide > dans_1_an) {
        console.warn("Date hors plage raisonnable, utilisation de la date actuelle");
        datePaiementValide = new Date();
      }
    } catch (error) {
      console.error("Erreur lors de la validation de la date:", error);
      datePaiementValide = new Date();
    }

    console.log("Tentative d'ajout de paiement:", {
      montantSaisi,
      resteAPayerArrondi,
      facture: facture.id,
      datePaiementValide: datePaiementValide.toISOString(),
      nouveauPaiement
    });

    setIsLoading(true);
    try {
      // Utiliser le montant arrondi et la date validée pour l'ajout
      const paiementAvecDonneesValidees = {
        ...nouveauPaiement,
        montant: montantSaisi,
        datePaiement: datePaiementValide
      };

      console.log("Paiement préparé pour ajout:", paiementAvecDonneesValidees);

      await ajouterPaiement(facture.id, paiementAvecDonneesValidees, facture);

      console.log("Paiement ajouté avec succès, fermeture du modal");
      setIsModalOpen(false);
      setNouveauPaiement(creerPaiementVide());
      onPaiementChange();
    } catch (error) {
      console.error("Erreur complète lors de l'ajout du paiement:", error);

      // Afficher une erreur plus détaillée
      let messageErreur = "Erreur lors de l'ajout du paiement";
      if (error instanceof Error) {
        messageErreur += `: ${error.message}`;
        console.error("Message d'erreur:", error.message);
        console.error("Stack trace:", error.stack);
      }

      alert(messageErreur);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupprimerPaiement = async (paiementId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
      return;
    }

    setIsLoading(true);
    try {
      await supprimerPaiement(facture.id, paiementId, facture);
      onPaiementChange();
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      alert("Erreur lors de la suppression du paiement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
          <FiDollarSign className="mr-2" />
          Paiements
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={resteAPayer <= 0 || isLoading}
          className={`flex items-center px-3 py-1 rounded-md text-sm ${resteAPayer <= 0 || isLoading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-500 text-white hover:bg-green-600"
            }`}
        >
          <FiPlus className="mr-1" size={14} />
          Ajouter
        </button>
      </div>

      {/* Résumé des montants */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total TTC</p>
          <p className="font-semibold text-gray-800 dark:text-white">
            {formaterMontant(facture.totalTTC)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Payé</p>
          <p className="font-semibold text-green-600">
            {formaterMontant(montantPaye)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Reste à payer</p>
          <p className={`font-semibold ${resteAPayer > 0 ? "text-red-600" : "text-green-600"}`}>
            {formaterMontant(resteAPayer)}
          </p>
        </div>
      </div>

      {/* Liste des paiements */}
      {facture.paiements && facture.paiements.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Historique des paiements</h4>
          {facture.paiements.map((paiement) => (
            <div key={paiement.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-green-600">
                    {formaterMontant(paiement.montant)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formaterDateSecurisee(paiement.datePaiement)}
                  </span>
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {paiement.methodePaiement}
                  </span>
                </div>
                {(paiement.reference || paiement.commentaire) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {paiement.reference && <span>Réf: {paiement.reference}</span>}
                    {paiement.reference && paiement.commentaire && <span> • </span>}
                    {paiement.commentaire && <span>{paiement.commentaire}</span>}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSupprimerPaiement(paiement.id)}
                disabled={isLoading}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
          Aucun paiement enregistré
        </p>
      )}

      {/* Modal d'ajout de paiement */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[500px] relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>

            <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
              Ajouter un paiement
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Montant (max: {formaterMontant(resteAPayer)})
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={resteAPayer}
                    value={nouveauPaiement.montant || ""}
                    onChange={(e) => setNouveauPaiement({
                      ...nouveauPaiement,
                      montant: parseFloat(e.target.value) || 0
                    })}
                    className="flex-1 p-2 border rounded-md bg-white text-black"
                    placeholder="0.00"
                  />
                  {resteAPayer > 0 && (
                    <button
                      type="button"
                      onClick={() => setNouveauPaiement({
                        ...nouveauPaiement,
                        montant: Math.round(resteAPayer * 100) / 100
                      })}
                      className="bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-sm whitespace-nowrap"
                    >
                      Solder
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={(() => {
                    try {
                      if (nouveauPaiement.datePaiement instanceof Date && !isNaN(nouveauPaiement.datePaiement.getTime())) {
                        return nouveauPaiement.datePaiement.toISOString().split('T')[0];
                      }
                      return new Date().toISOString().split('T')[0];
                    } catch (error) {
                      console.error("Erreur de formatage de date:", error);
                      return new Date().toISOString().split('T')[0];
                    }
                  })()}
                  onChange={(e) => {
                    try {
                      const dateValue = e.target.value;
                      if (dateValue) {
                        const newDate = new Date(dateValue + 'T12:00:00'); // Ajouter une heure pour éviter les problèmes de timezone
                        if (!isNaN(newDate.getTime())) {
                          setNouveauPaiement({
                            ...nouveauPaiement,
                            datePaiement: newDate
                          });
                        }
                      }
                    } catch (error) {
                      console.error("Erreur lors de la définition de la date:", error);
                      setNouveauPaiement({
                        ...nouveauPaiement,
                        datePaiement: new Date()
                      });
                    }
                  }}
                  className="w-full p-2 border rounded-md bg-white text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Méthode de paiement
                </label>
                <select
                  value={nouveauPaiement.methodePaiement}
                  onChange={(e) => setNouveauPaiement({
                    ...nouveauPaiement,
                    methodePaiement: e.target.value as Paiement["methodePaiement"]
                  })}
                  className="w-full p-2 border rounded-md bg-white text-black"
                >
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Carte bancaire">Carte bancaire</option>
                  <option value="Prélèvement">Prélèvement</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Référence (optionnel)
                </label>
                <input
                  type="text"
                  value={nouveauPaiement.reference || ""}
                  onChange={(e) => setNouveauPaiement({
                    ...nouveauPaiement,
                    reference: e.target.value
                  })}
                  className="w-full p-2 border rounded-md bg-white text-black"
                  placeholder="N° chèque, référence virement..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={nouveauPaiement.commentaire || ""}
                  onChange={(e) => setNouveauPaiement({
                    ...nouveauPaiement,
                    commentaire: e.target.value
                  })}
                  className="w-full p-2 border rounded-md bg-white text-black"
                  rows={2}
                  placeholder="Note sur ce paiement..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAjouterPaiement}
                disabled={isLoading || nouveauPaiement.montant <= 0}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionPaiements; 