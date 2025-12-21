"use client";

import React, { useState, useEffect } from "react";
import { PopupButton } from "react-calendly";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function CalendlyButton({ className, children }: Props) {
  const url = process.env.NEXT_PUBLIC_CALENDLY_URL;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!url) {
    // Fails gracefully if env var isn't set
    return (
      <a className={className} href="#book">
        {children}
      </a>
    );
  }

  // Don't render PopupButton until mounted (client-side only)
  if (!isMounted) {
    return (
      <button className={className} disabled>
        {typeof children === "string" ? children : "Book a Call"}
      </button>
    );
  }

  return (
    <PopupButton
      url={url}
      rootElement={document.body}
      className={className}
      text={typeof children === "string" ? children : "Book a Call"}
    />
  );
}
