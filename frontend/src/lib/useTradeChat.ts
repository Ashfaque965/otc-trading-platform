"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface ChatMessage {
  id: string;
  tradeId: string;
  content: string;
  createdAt: string;
  sender: { id: string; walletAddress: string; displayName?: string };
}

export function useTradeChat(tradeId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("otc_token") : null;
    if (!token) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:4000", {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("trade:join", tradeId);
    });

    socket.on("trade:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [tradeId]);

  function sendMessage(content: string) {
    socketRef.current?.emit("trade:message", { tradeId, content });
  }

  return { messages, setMessages, sendMessage, connected };
}
