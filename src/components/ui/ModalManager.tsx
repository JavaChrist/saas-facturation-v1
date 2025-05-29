import React from 'react';
import ConfirmationModal from './ConfirmationModal';
import NotificationModal from './NotificationModal';

interface ModalManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  modalType: 'confirmation' | 'notification';
  modalData: any;
  isLoading?: boolean;
}

const ModalManager: React.FC<ModalManagerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  modalType,
  modalData,
  isLoading = false
}) => {
  if (modalType === 'confirmation') {
    return (
      <ConfirmationModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onConfirm || (() => { })}
        title={modalData.title}
        message={modalData.message}
        confirmText={modalData.confirmText}
        cancelText={modalData.cancelText}
        type={modalData.type}
        isDangerous={modalData.isDangerous}
        isLoading={isLoading}
        icon={modalData.icon}
      />
    );
  }

  if (modalType === 'notification') {
    return (
      <NotificationModal
        isOpen={isOpen}
        onClose={onClose}
        title={modalData.title}
        message={modalData.message}
        type={modalData.type}
        autoClose={modalData.autoClose}
        autoCloseDelay={modalData.autoCloseDelay}
        showOkButton={modalData.showOkButton}
        okText={modalData.okText}
      />
    );
  }

  return null;
};

export default ModalManager; 