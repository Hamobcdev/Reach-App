import React, { createContext, useContext, useEffect, useState } from "react";
import { getAidManagerContract } from "../hooks/useAidManager";

const AidManagerContext = createContext(null);

export const AidManagerProvider = ({ children }) => {
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const load = async () => {
      const instance = getAidManagerContract();
      setContract(instance);
    };
    load();
  }, []);

  return (
    <AidManagerContext.Provider value={contract}>
      {children}
    </AidManagerContext.Provider>
  );
};

export const useAidManager = () => useContext(AidManagerContext);
