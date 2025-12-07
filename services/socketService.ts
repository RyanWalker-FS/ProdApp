import { Platform } from "react-native";
import { io, Socket } from "socket.io-client";

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
  // Buffer of event listeners registered before socket is created
  private listeners: Record<string, Set<(...args: any[]) => void>> = {};

  constructor() {
    // Configure server URL based on platform
    this.serverUrl = this.getServerUrl();
  }

  private getServerUrl(): string {
    // First, check for explicit environment variable
    if (process.env.EXPO_PUBLIC_SOCKET_URL) {
      return process.env.EXPO_PUBLIC_SOCKET_URL;
    }

    if (__DEV__) {
      // Development URLs
      if (Platform.OS === "web") {
        // For web, try localhost first
        return "http://localhost:3001";
      } else {
        // Mobile development - prefer localhost on iOS simulator for convenience,
        // otherwise use the configured env var or a default LAN IP.
        if (Platform.OS === "ios") {
          const iosDefault =
            process.env.EXPO_PUBLIC_SOCKET_URL || "http://localhost:3001";
          console.warn(
            `⚠️  Using iOS default socket URL: ${iosDefault}\n` +
              `   If connection fails on a physical device, set EXPO_PUBLIC_SOCKET_URL in .env to your computer's IP address`
          );
          return iosDefault;
        }

        // Android / other mobile
        const mobileUrl =
          process.env.EXPO_PUBLIC_SOCKET_URL || "http://192.168.1.100:3001";
        console.warn(
          `⚠️  Using default mobile socket URL: ${mobileUrl}\n` +
            `   If connection fails, set EXPO_PUBLIC_SOCKET_URL in .env to your computer's IP address`
        );
        return mobileUrl;
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

    // Re-read server URL in case environment variable changed
    this.serverUrl = this.getServerUrl();
    console.log(`Connecting to socket server: ${this.serverUrl}`);
    console.log(`Platform: ${Platform.OS}`);
    console.log(
      `Environment variable: ${process.env.EXPO_PUBLIC_SOCKET_URL || "not set"}`
    );

    this.socket = io(this.serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Add connection timeout handling
      forceNew: false,
      // Allow connection to work even if server is temporarily unavailable
      autoConnect: true,
    });
    // Attach any buffered listeners so they don't miss early events (web can connect very fast)
    for (const [event, callbacks] of Object.entries(this.listeners)) {
      callbacks.forEach((cb) => this.socket?.on(event, cb));
    }
    this.setupEventListeners();
    // In dev, also log all incoming events for debugging (helps trace simulator issues)
    if (__DEV__) {
      this.socket.onAny((event: string, ...args: any[]) => {
        try {
          console.debug(`[socket recv] ${event}`, args);
        } catch (err) {
          // ignore
        }
      });
    }
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
      console.error(`Failed to connect to: ${this.serverUrl}`);
      console.error(`Platform: ${Platform.OS}`);
      console.error(`Error type: ${error.type}`);
      if (error.message === "timeout" || error.type === "TransportError") {
        console.error(
          "Connection timeout. Please ensure:\n" +
            "  1. The realtime-server is running (cd realtime-server && npm start)\n" +
            "  2. The server URL is correct in your .env file\n" +
            "  3. For mobile: EXPO_PUBLIC_SOCKET_URL should be your computer's IP (e.g., http://192.168.1.XXX:3001)\n" +
            "  4. Your mobile device is on the same WiFi network as your computer\n" +
            "  5. Restart the Expo app after changing .env file"
        );
      }
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
    // Store listener so it can be attached even if socket isn't created yet
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(callback as any);
    if (this.socket) this.socket.on(event, callback as any);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.socket?.off(event, callback as any);
      this.listeners[event]?.delete(callback as any);
    } else {
      // Remove all listeners for event
      this.socket?.off(event);
      delete this.listeners[event];
    }
  }
}

export const socketService = new SocketServiceImpl();
