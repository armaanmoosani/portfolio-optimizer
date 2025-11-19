"use client";

import { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = "info", duration = 4000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const toast = {
        success: (message, duration) => addToast(message, "success", duration),
        error: (message, duration) => addToast(message, "error", duration),
        info: (message, duration) => addToast(message, "info", duration),
        warning: (message, duration) => addToast(message, "warning", duration),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

function Toast({ id, message, type, onClose }) {
    const config = {
        success: {
            icon: CheckCircle,
            className: "bg-emerald-500/10 border-emerald-500/50 text-emerald-400",
            iconColor: "text-emerald-400",
        },
        error: {
            icon: XCircle,
            className: "bg-red-500/10 border-red-500/50 text-red-400",
            iconColor: "text-red-400",
        },
        warning: {
            icon: AlertTriangle,
            className: "bg-yellow-500/10 border-yellow-500/50 text-yellow-400",
            iconColor: "text-yellow-400",
        },
        info: {
            icon: Info,
            className: "bg-blue-500/10 border-blue-500/50 text-blue-400",
            iconColor: "text-blue-400",
        },
    };

    const { icon: Icon, className, iconColor } = config[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, x: 100 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg ${className} min-w-[300px] max-w-md`}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
            <p className="flex-1 text-sm font-medium text-white">{message}</p>
            <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
}
