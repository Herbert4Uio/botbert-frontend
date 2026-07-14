import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useState, useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requiredInputText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  requiredInputText,
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requiredInputText ? inputValue !== requiredInputText : false;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6">
          <div className="flex gap-4 items-start">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
              isDestructive ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
            )}>
              {isDestructive ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg text-corporate-900">{title}</h3>
              <p className="text-sm text-corporate-500 mt-2">{message}</p>
            </div>
          </div>
            
          {requiredInputText && (
            <div className="mt-4 border border-red-200 bg-red-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">
                Para continuar, por favor escribe <span className="font-mono bg-red-100 px-1 py-0.5 rounded select-none">{requiredInputText}</span> a continuación:
              </p>
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none text-red-900 font-mono text-sm"
                placeholder={requiredInputText}
              />
            </div>
          )}
        </div>
        
        <div className="bg-corporate-50 p-4 flex justify-end gap-3 border-t border-corporate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-medium text-corporate-600 hover:bg-corporate-100 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={cn(
              "px-5 py-2 font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
              isDestructive 
                ? "bg-red-500 hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2" 
                : "bg-accent hover:bg-accent-hover focus:ring-2 focus:ring-accent focus:ring-offset-2"
            )}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
