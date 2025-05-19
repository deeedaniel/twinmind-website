// app/context/PrivateModeContext.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";

const PrivateModeContext = createContext<{
  privateMode: boolean;
  setPrivateMode: (val: boolean) => void;
}>({
  privateMode: false,
  setPrivateMode: () => {},
});

export const usePrivateMode = () => useContext(PrivateModeContext);

export const PrivateModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [privateMode, setPrivateMode] = useState(false);

  useEffect(() => {
    // Fetch from server once on mount
    const fetchPrivateMode = async () => {
      const res = await fetch("/api/private-mode");
      const data = await res.json();
      setPrivateMode(data.privateMode);
    };
    fetchPrivateMode();
  }, []);

  return (
    <PrivateModeContext.Provider value={{ privateMode, setPrivateMode }}>
      {children}
    </PrivateModeContext.Provider>
  );
};
