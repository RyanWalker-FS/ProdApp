import { useCallback, useEffect, useState } from "react";
import { socketService } from "../services/socketService";
export interface UseSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, data?: any) => void;
  lastPong: Date | null;
}
export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastPong, setLastPong] = useState<Date | null>(null);
  useEffect(() => {
    // Connect when hook mounts
    socketService.connect();
    // Set up event listeners
    socketService.on("connect", () => {
      setIsConnected(true);
      setConnectionError(null);
    });
    socketService.on("disconnect", () => {
      setIsConnected(false);
    });
    socketService.on("connect_error", (error: any) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });
    socketService.on("connection_confirmed", (data: any) => {
      console.log("Connection confirmed:", data);
    });
    socketService.on("pong", (data: any) => {
      setLastPong(new Date(data.serverTimestamp));
    });
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);
  const emit = useCallback((event: string, data?: any) => {
    socketService.emit(event, data);
  }, []);
  return {
    isConnected,
    connectionError,
    emit,
    lastPong,
  };
};
