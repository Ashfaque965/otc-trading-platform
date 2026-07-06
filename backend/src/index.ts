import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { registerChatSocket } from "./sockets/chat.socket";
import { logger } from "./utils/logger";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

registerChatSocket(io);

server.listen(PORT, () => {
  logger.info(`OTC backend listening on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => process.exit(0));
});
