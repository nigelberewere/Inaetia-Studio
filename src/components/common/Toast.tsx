import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="app-toast-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            role="alert"
            aria-live="polite"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${
              isError
                ? "bg-red-950/90 border-red-800 text-red-100"
                : isSuccess
                ? "bg-emerald-950/90 border-emerald-800 text-emerald-100"
                : "bg-neutral-900/90 border-neutral-700 text-neutral-100"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {isError ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" aria-hidden="true" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <Info className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />
              )}
              <span className="text-sm font-medium leading-snug break-words">{toast.message}</span>
            </div>
            <button
              id={`toast-dismiss-${toast.id}`}
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
