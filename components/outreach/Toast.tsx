"use client";

import React, { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

let showToastGlobal: ((props: ToastProps) => void) | null = null;

export function useToast() {
  return {
    showToast: (props: ToastProps) => {
      if (showToastGlobal) {
        showToastGlobal(props);
      }
    },
  };
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastProps | null>(null);

  useEffect(() => {
    showToastGlobal = (props: ToastProps) => {
      setToast(props);
      setTimeout(() => {
        setToast(null);
      }, props.duration || 3000);
    };

    return () => {
      showToastGlobal = null;
    };
  }, []);

  if (!toast) return null;

  const typeClasses = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
      <div
        className={`px-6 py-4 rounded-lg shadow-lg ${
          typeClasses[toast.type || "info"]
        }`}
      >
        <p className="font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
