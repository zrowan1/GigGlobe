import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Combines Tailwind classes without conflicts (used by shadcn/ui components).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
