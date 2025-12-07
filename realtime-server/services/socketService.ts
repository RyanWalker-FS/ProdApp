import { io, Socket } from "socket.io-client";
import { Platform } from "react-native";
export interface SocketService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}
class SocketServiceImpl implements SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  constructor() {
    // Configure server URL based on platform
    this.serverUrl = this.getServerUrl();
  }
  private getServerUrl(): string {
    if (__DEV__) {
      // Development URLs
      if (Platform.OS === "web") {
        return "http://localhost:3001";
      } else {
        // Mobile development - adjust IP to your computer's IP
        return "http://192.168.1.100:3001";
      }
    } else {
      // Production URL
      return process.env.EXPO_PUBLIC_SOCKET_URL || "https://your-server.com";
    }
  }
  connect(): void {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }
    console.log(`Connecting to socket server: ${this.serverUrl}`);

    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this.setupEventListeners();
  }
  private setupEventListeners(): void {
    if (!this.socket) return;
    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });
    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
    this.socket.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
    });
    this.socket.on("reconnect_error", (error) => {
      console.error("Socket reconnection error:", error.message);
    });
  }
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected, cannot emit event:", event);
    }
  }
  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }
  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }
}
export const socketService = new SocketServiceImpl();
