import React from 'react';
import { useModal } from '@/hooks/useModal';
import ModalManager from '@/components/ui/ModalManager';

const ModalExamples: React.FC = () => {
  const modal = useModal();

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-6">Exemples de Modales Modernes</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Messages simples */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Messages simples</h3>

          <button
            onClick={() => modal.showSuccess("Opération réussie avec succès !")}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Succès
          </button>

          <button
            onClick={() => modal.showError("Une erreur est survenue lors de l'opération.")}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Erreur
          </button>

          <button
            onClick={() => modal.showWarning("Attention, cette action nécessite une validation.")}
            className="w-full px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Avertissement
          </button>

          <button
            onClick={() => modal.showInfo("Voici une information importante à retenir.")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Information
          </button>
        </div>

        {/* Confirmations */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Confirmations</h3>

          <button
            onClick={() => modal.showDeleteConfirmation(
              "cette facture",
              () => {
                console.log("Facture supprimée !");
                modal.showSuccess("Facture supprimée avec succès");
              }
            )}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Suppression dangereuse
          </button>

          <button
            onClick={() => modal.showConfirmation({
              title: "Confirmer l'action",
              message: "Êtes-vous sûr de vouloir continuer cette opération ?",
              confirmText: "Oui, continuer",
              cancelText: "Annuler",
              isDangerous: false,
              icon: "warning"
            })}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirmation simple
          </button>
        </div>
      </div>

      {/* Message avec fermeture automatique */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Fermeture automatique</h3>
        <button
          onClick={() => modal.showNotification({
            message: "Ce message se fermera automatiquement dans 3 secondes",
            type: "info",
            autoClose: true,
            autoCloseDelay: 3000
          })}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Message auto-fermant
        </button>
      </div>

      {/* Gestionnaire de modales */}
      <ModalManager
        isOpen={modal.isOpen}
        onClose={modal.closeModal}
        onConfirm={modal.handleConfirm}
        modalType={modal.modalType}
        modalData={modal.modalData}
        isLoading={modal.isLoading}
      />
    </div>
  );
};

export default ModalExamples;

// Exemple d'utilisation dans d'autres composants :
/*

import { useModal } from '@/hooks/useModal';
import ModalManager from '@/components/ui/ModalManager';

export default function MonComposant() {
  const modal = useModal();

  const handleDelete = async (id: string) => {
    modal.showDeleteConfirmation(
      "cet élément",
      async () => {
        try {
          await deleteItem(id);
          modal.showSuccess("Élément supprimé avec succès");
        } catch (error) {
          modal.showError("Erreur lors de la suppression");
        }
      }
    );
  };

  const handleSave = async () => {
    try {
      await saveData();
      modal.showSuccess("Données sauvegardées !");
    } catch (error) {
      modal.showError("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div>
      <button onClick={() => handleDelete("123")}>
        Supprimer
      </button>
      
      <button onClick={handleSave}>
        Sauvegarder
      </button>

      <ModalManager
        isOpen={modal.isOpen}
        onClose={modal.closeModal}
        onConfirm={modal.handleConfirm}
        modalType={modal.modalType}
        modalData={modal.modalData}
        isLoading={modal.isLoading}
      />
    </div>
  );
}

*/ 