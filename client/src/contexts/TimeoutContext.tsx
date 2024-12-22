import React, { createContext, useContext, useRef } from "react";

const TimeoutContext = createContext<
  React.MutableRefObject<number | undefined> | undefined
>(undefined);

export const TimeoutProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const timeUntilTimeoutRef = useRef<number | undefined>(undefined);

  return (
    <TimeoutContext.Provider value={timeUntilTimeoutRef}>
      {children}
    </TimeoutContext.Provider>
  );
};

export const useTimeout = () => {
  const context = useContext(TimeoutContext);
  if (!context) {
    throw new Error("useTimeout must be used within a TimeoutProvider");
  }
  return context;
};
