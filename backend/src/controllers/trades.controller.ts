import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { ApiError } from "../middleware/errorHandler";
import { blockchainService } from "../services/blockchain.service";

const createTradeSchema = z.object({
  offerId: z.string().uuid(),
  amount: z.number().positive(),
  escrowAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  onChainTradeId: z.number().int().positive().optional(),
  txHashCreate: z.string().optional(),
});

/**
 * POST /trades
 * Records a trade after the buyer has joined the on-chain escrow trade
 * (i.e. after the frontend has already called Escrow.joinTrade()).
 */
export async function createTrade(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTradeSchema.parse(req.body);
    const offer = await prisma.offer.findUnique({ where: { id: data.offerId } });
    if (!offer) throw new ApiError(404, "Offer not found");
    if (offer.status !== "OPEN") throw new ApiError(400, "Offer is not open");
    if (offer.sellerId === req.user!.userId) throw new ApiError(400, "Cannot trade with your own offer");

    const [trade] = await prisma.$transaction([
      prisma.trade.create({
        data: {
          offerId: offer.id,
          buyerId: req.user!.userId,
          sellerId: offer.sellerId,
          escrowAddress: data.escrowAddress,
          onChainTradeId: data.onChainTradeId,
          amount: data.amount,
          price: offer.price,
          txHashCreate: data.txHashCreate,
          status: "BUYER_JOINED",
        },
      }),
      prisma.offer.update({ where: { id: offer.id }, data: { status: "MATCHED" } }),
    ]);

    res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
}

export async function listMyTrades(req: Request, res: Response, next: NextFunction) {
  try {
    const trades = await prisma.trade.findMany({
      where: { OR: [{ buyerId: req.user!.userId }, { sellerId: req.user!.userId }] },
      include: { offer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(trades);
  } catch (err) {
    next(err);
  }
}

export async function getTrade(req: Request, res: Response, next: NextFunction) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: req.params.id },
      include: { offer: true, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!trade) throw new ApiError(404, "Trade not found");
    if (trade.buyerId !== req.user!.userId && trade.sellerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      throw new ApiError(403, "Not a party to this trade");
    }

    // Enrich with live on-chain status if we have an on-chain trade id
    let onChain = null;
    if (trade.onChainTradeId) {
      try {
        onChain = await blockchainService.getOnChainTrade(trade.onChainTradeId);
      } catch {
        onChain = null; // RPC unavailable / not configured — fall back to DB status only
      }
    }

    res.json({ ...trade, onChain });
  } catch (err) {
    next(err);
  }
}

const statusUpdateSchema = z.object({
  status: z.enum(["PAID", "RELEASED", "CANCELLED", "DISPUTED", "REFUNDED"]),
  txHash: z.string().optional(),
});

/**
 * PATCH /trades/:id/status
 * Called by the frontend after a successful on-chain transaction
 * (markPaid, release, cancel, dispute, resolve) to sync DB state.
 */
export async function updateTradeStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, txHash } = statusUpdateSchema.parse(req.body);
    const trade = await prisma.trade.findUnique({ where: { id: req.params.id } });
    if (!trade) throw new ApiError(404, "Trade not found");
    if (trade.buyerId !== req.user!.userId && trade.sellerId !== req.user!.userId) {
      throw new ApiError(403, "Not a party to this trade");
    }

    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: {
        status,
        txHashRelease: status === "RELEASED" ? txHash : undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
