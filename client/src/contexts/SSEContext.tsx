import { nanoid } from "nanoid";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

// define shape of context
interface SSEContextType {
  eventSourceRef: React.MutableRefObject<EventSource | null>;
  sessionId: string;
  rerenderTrigger: number;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

export const SSEProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  const eventSourceRef = useRef<EventSource | null>(null);
  const [rerenderTrigger, setRerenderTrigger] = useState(0);
  const [sessionId] = useState(nanoid(6)); 

  useEffect(() => {
    if (isAuthenticated) {
      const eventSource = new EventSource(
        `/api/events?sessionId=${sessionId}`,
        {
          withCredentials: true,
        },
      );
      eventSourceRef.current = eventSource;

      // console.log("SSE connection established");

      eventSourceRef.current.onmessage = function (event) {
        const initiator = event.data;

        if (initiator !== sessionId) {
          // console.log(initiator + " is different from " + sessionId + "; should force reload");

          setRerenderTrigger((prev) => prev + 1);
        }
      };

      // cleanup on unmount
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          // console.log("SSE connection closed");
        }
      };
    }
  }, [isAuthenticated]);

  return (
    <SSEContext.Provider value={{ eventSourceRef, rerenderTrigger, sessionId }}>
      {children}
    </SSEContext.Provider>
  );
};

export const useSSE = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSE must be used within an SSEProvider");
  }
  return context;
};
