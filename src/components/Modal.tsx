import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-3xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
