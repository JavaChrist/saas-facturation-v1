import React, { useEffect, useRef } from 'react';
import { FiX, FiAlertTriangle, FiCheck, FiInfo, FiAlertCircle } from 'react-icons/fi';

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirmation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  type?: ModalType;
  showCloseButton?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'info',
  showCloseButton = true,
  maxWidth = 'md'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Fermer avec ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getTypeIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck className="w-6 h-6 text-green-500" />;
      case 'error':
        return <FiAlertCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'confirmation':
        return <FiAlertTriangle className="w-6 h-6 text-blue-500" />;
      default:
        return <FiInfo className="w-6 h-6 text-blue-500" />;
    }
  };

  const getTypeColors = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'confirmation':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      default:
        return 'max-w-md';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className={`relative bg-white rounded-lg shadow-xl transform transition-all w-full ${getMaxWidthClass()}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={`px-6 py-4 border-b ${getTypeColors()}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getTypeIcon()}
                  {title && (
                    <h3 className="text-lg font-medium text-gray-900">
                      {title}
                    </h3>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal; 