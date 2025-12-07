import { socketService } from "@/services/socketService";
import { useCallback, useEffect, useState } from "react";

export interface UseSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
  onlineCount: number | null;
  emit: (event: string, data?: any) => void;
  lastPong: Date | null;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastPong, setLastPong] = useState<Date | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    // Set up event listeners first to avoid missing fast 'connect' on web
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

    socketService.on("clients_count", (count: number) => {
      setOnlineCount(Number(count));
    });

    // Then connect. This ordering plus buffered listeners in the service
    // prevents missing the initial 'connect' event on fast web connections.
    socketService.connect();

    // Cleanup on unmount
    return () => {
      socketService.off("connect");
      socketService.off("disconnect");
      socketService.off("connect_error");
      socketService.off("connection_confirmed");
      socketService.off("pong");
      socketService.off("clients_count");
      socketService.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketService.emit(event, data);
  }, []);

  return {
    isConnected,
    connectionError,
    onlineCount,
    emit,
    lastPong,
  };
};
