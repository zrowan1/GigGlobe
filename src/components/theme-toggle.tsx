"use client";

// A small button that flips between light and dark. Because the theme is only
// known in the browser (it lives in localStorage), we wait for the component to
// mount before showing the icon — otherwise the server-rendered HTML and the
// browser would briefly disagree (a "hydration mismatch").

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={className}
      aria-label={isDark ? "Schakel naar lichte modus" : "Schakel naar donkere modus"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Until mounted we render the moon as a neutral placeholder. */}
      {mounted && !isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
