// src/lib/utils.js (or wherever you keep utility functions)
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names intelligently.
 * Supports conditional classes (clsx) and deduplication (twMerge)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}