"use client";

import { createContext, useState, ReactNode } from "react";

interface AppContextType {
  isRegistered: boolean;
  username: string;
  setIsRegistered: (value: boolean) => void;
  setUsername: (value: string) => void;
}

export const AppContext = createContext<AppContextType>({
  isRegistered: false,
  username: "",
  setIsRegistered: () => {},
  setUsername: () => {},
});

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // 🔥 Inicialización directa desde localStorage (SIN useEffect)
  const [isRegistered, setIsRegisteredState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("isRegistered") === "true";
  });

  const [username, setUsernameState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("username") || "";
  });

  // 🔥 setters con persistencia automática
  const setIsRegistered = (value: boolean) => {
    setIsRegisteredState(value);
    localStorage.setItem("isRegistered", value ? "true" : "false");
  };

  const setUsername = (value: string) => {
    setUsernameState(value);
    localStorage.setItem("username", value);
  };

  return (
    <AppContext.Provider
      value={{
        isRegistered,
        username,
        setIsRegistered,
        setUsername,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};