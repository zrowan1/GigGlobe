"use client";

// Thin wrapper around next-themes. It toggles the `.dark` class on <html> and
// remembers the choice in localStorage. We default to "dark" because the globe
// is a synthwave night scene — light mode is an opt-in for the rest of the app.

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
