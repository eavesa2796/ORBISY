"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border border-[color:var(--border)] bg-white/5 text-[color:var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent placeholder:text-[color:var(--muted)] ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
          {label}
        </label>
      )}
      <textarea
        className={`w-full px-3 py-2 border border-[color:var(--border)] bg-white/5 text-[color:var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent placeholder:text-[color:var(--muted)] ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[color:var(--text)] mb-1">
          {label}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border border-[color:var(--border)] bg-white/5 text-[color:var(--text)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-transparent ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
