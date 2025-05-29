import React, { useEffect } from 'react';
import Modal, { ModalType } from './Modal';
import { FiCheck } from 'react-icons/fi';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: ModalType;
  autoClose?: boolean;
  autoCloseDelay?: number;
  showOkButton?: boolean;
  okText?: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = false,
  autoCloseDelay = 3000,
  showOkButton = true,
  okText = 'OK'
}) => {
  // Auto-close timer
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  const getDefaultTitle = () => {
    switch (type) {
      case 'success':
        return 'Succès';
      case 'error':
        return 'Erreur';
      case 'warning':
        return 'Attention';
      default:
        return 'Information';
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'error':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
      default:
        return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || getDefaultTitle()}
      type={type}
      showCloseButton={!showOkButton}
      maxWidth="sm"
    >
      <div className="text-center">
        {/* Message */}
        <p className="text-gray-700 mb-6">
          {message}
        </p>

        {/* Auto-close progress bar */}
        {autoClose && isOpen && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="h-1 rounded-full bg-blue-600 transition-all ease-linear"
                style={{
                  width: '100%',
                  animation: `progress ${autoCloseDelay}ms linear`
                }}
              />
            </div>
          </div>
        )}

        {/* OK Button */}
        {showOkButton && (
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getButtonClass()}`}
          >
            <FiCheck className="w-4 h-4 inline mr-2" />
            {okText}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </Modal>
  );
};

export default NotificationModal; 