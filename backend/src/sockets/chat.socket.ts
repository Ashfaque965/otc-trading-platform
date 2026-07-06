import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

interface AuthedSocket extends Socket {
  userId?: string;
}

export function registerChatSocket(io: Server) {
  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing auth token"));
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    logger.info(`[socket] user connected: ${socket.userId}`);

    socket.on("trade:join", async (tradeId: string) => {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade || (trade.buyerId !== socket.userId && trade.sellerId !== socket.userId)) {
        socket.emit("error", "Not authorized to join this trade room");
        return;
      }
      socket.join(`trade:${tradeId}`);
    });

    socket.on("trade:message", async ({ tradeId, content }: { tradeId: string; content: string }) => {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade || (trade.buyerId !== socket.userId && trade.sellerId !== socket.userId)) {
        socket.emit("error", "Not authorized to message in this trade");
        return;
      }
      if (!content || content.length > 2000) {
        socket.emit("error", "Invalid message content");
        return;
      }

      const message = await prisma.message.create({
        data: { tradeId, senderId: socket.userId!, content },
        include: { sender: { select: { id: true, walletAddress: true, displayName: true } } },
      });

      io.to(`trade:${tradeId}`).emit("trade:message", message);
    });

    socket.on("trade:typing", ({ tradeId }: { tradeId: string }) => {
      socket.to(`trade:${tradeId}`).emit("trade:typing", { userId: socket.userId });
    });

    socket.on("disconnect", () => {
      logger.info(`[socket] user disconnected: ${socket.userId}`);
    });
  });
}
