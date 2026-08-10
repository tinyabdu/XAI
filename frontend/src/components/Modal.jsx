import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${maxWidth} mx-auto overflow-hidden`}>
        <div className="flex items-start justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 text-sm text-gray-700">{children}</div>
        {footer && <div className="px-5 py-3 bg-gray-50 border-t flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export { Modal };