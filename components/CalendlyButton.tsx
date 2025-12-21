"use client";

import React from "react";
import { PopupButton } from "react-calendly";

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function CalendlyButton({ className, children }: Props) {
  const url = process.env.NEXT_PUBLIC_CALENDLY_URL;

  if (!url) {
    // Fails gracefully if env var isn't set
    return (
      <a className={className} href="#book">
        {children}
      </a>
    );
  }

  return (
    <PopupButton
      url={url}
      /*
        Important: rootElement must exist in the browser.
        document.body is safe here because this is a client component.
      */
      rootElement={document.body}
      className={className}
      text={typeof children === "string" ? children : "Book a Call"}
    />
  );
}
