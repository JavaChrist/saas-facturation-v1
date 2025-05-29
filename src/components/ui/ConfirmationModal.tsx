import React from 'react';
import Modal, { ModalType } from './Modal';
import { FiTrash2, FiAlertTriangle, FiCheck, FiX } from 'react-icons/fi';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  isDangerous?: boolean;
  isLoading?: boolean;
  icon?: 'delete' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  type = 'confirmation',
  isDangerous = false,
  isLoading = false,
  icon = 'warning'
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'delete':
        return <FiTrash2 className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="w-8 h-8 text-amber-500" />;
      default:
        return <FiAlertTriangle className="w-8 h-8 text-blue-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    if (isDangerous) {
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white';
    }
    return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      type={type}
      showCloseButton={false}
      maxWidth="md"
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center w-16 h-16 mb-4">
          {getIcon()}
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-6">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiX className="w-4 h-4 inline mr-2" />
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${getConfirmButtonClass()}`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Traitement...
              </div>
            ) : (
              <>
                <FiCheck className="w-4 h-4 inline mr-2" />
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal; 