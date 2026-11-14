"use client";

import { createContext, useContext, type ReactNode } from "react";

/** The App name, as words, for the components that run in the browser. The root layout provides it. */
const AppNameContext = createContext("Yah Lah");

export function AppNameProvider({ name, children }: { name: string; children: ReactNode }) {
  return <AppNameContext.Provider value={name}>{children}</AppNameContext.Provider>;
}

export const useAppName = () => useContext(AppNameContext);
