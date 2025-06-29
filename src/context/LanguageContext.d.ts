// src/context/LanguageContext.d.ts
import React from "react";

export type Language = "en" | "sm" | "sw" | "tl";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const LanguageContext: React.Context<LanguageContextType>;
