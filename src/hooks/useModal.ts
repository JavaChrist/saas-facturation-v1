import { useState, useCallback, useRef } from 'react';
import { ModalType } from '@/components/ui/Modal';

interface UseModalOptions {
  onConfirm?: () => void | Promise<void>;
  onClose?: () => void;
}

interface ShowConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  icon?: 'delete' | 'warning' | 'info';
}

interface ShowNotificationOptions {
  title?: string;
  message: string;
  type?: ModalType;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const useModal = (options: UseModalOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalType, setModalType] = useState<'confirmation' | 'notification'>('notification');
  const [modalData, setModalData] = useState<any>({});

  // Stocker la fonction de confirmation dynamiquement
  const confirmFunctionRef = useRef<(() => void | Promise<void>) | null>(null);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    confirmFunctionRef.current = null; // Réinitialiser la fonction de confirmation
    options.onClose?.();
  }, [options]);

  const handleConfirm = useCallback(async () => {
    // Utiliser la fonction de confirmation dynamique en priorité, sinon celle des options
    const confirmFunction = confirmFunctionRef.current || options.onConfirm;

    if (confirmFunction) {
      setIsLoading(true);
      try {
        await confirmFunction();
        closeModal();
      } catch (error) {
        console.error('Erreur lors de la confirmation:', error);
        setIsLoading(false);
      }
    } else {
      closeModal();
    }
  }, [options, closeModal]);

  const showConfirmation = useCallback((confirmOptions: ShowConfirmationOptions, onConfirm?: () => void | Promise<void>) => {
    setModalType('confirmation');
    setModalData({
      ...confirmOptions,
      type: 'confirmation'
    });

    // Stocker la fonction de confirmation si fournie
    if (onConfirm) {
      confirmFunctionRef.current = onConfirm;
    }

    openModal();
  }, [openModal]);

  const showNotification = useCallback((notificationOptions: ShowNotificationOptions) => {
    setModalType('notification');
    setModalData(notificationOptions);
    openModal();
  }, [openModal]);

  // Méthodes de convenance pour différents types de notifications
  const showSuccess = useCallback((message: string, title?: string, autoClose = true) => {
    showNotification({
      title,
      message,
      type: 'success',
      autoClose,
      autoCloseDelay: 3000
    });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string, autoClose = false) => {
    showNotification({
      title,
      message,
      type: 'error',
      autoClose
    });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string, autoClose = false) => {
    showNotification({
      title,
      message,
      type: 'warning',
      autoClose
    });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string, autoClose = false) => {
    showNotification({
      title,
      message,
      type: 'info',
      autoClose
    });
  }, [showNotification]);

  // Méthode de convenance pour les confirmations de suppression
  const showDeleteConfirmation = useCallback((itemName: string, onDelete: () => void | Promise<void>) => {
    showConfirmation({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${itemName}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDangerous: true,
      icon: 'delete'
    }, onDelete); // Passer la fonction onDelete directement
  }, [showConfirmation]);

  return {
    isOpen,
    isLoading,
    modalType,
    modalData,
    openModal,
    closeModal,
    handleConfirm,
    showConfirmation,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showDeleteConfirmation
  };
}; 