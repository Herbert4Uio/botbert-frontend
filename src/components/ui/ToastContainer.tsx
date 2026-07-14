import { useToastStore } from '../../store/toastStore';
import type { ToastType } from '../../store/toastStore';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const toastConfig: Record<ToastType, { icon: any; bgColor: string; borderColor: string; textColor: string }> = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border shadow-lg w-80 animate-in slide-in-from-right-8 fade-in duration-300",
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn("w-5 h-5 mt-0.5", config.textColor)} />
            <div className="flex-1">
              <p className={cn("text-sm font-medium", config.textColor)}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={cn("p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity", config.textColor)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
