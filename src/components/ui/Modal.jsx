import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, description, children, hideCloseButton = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div className="w-full sm:max-w-md bg-[#111] border-t border-[#222] sm:border sm:rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto rounded-t-3xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300 flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            {title && <h3 className="text-lg font-black text-white tracking-wider">{title}</h3>}
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
