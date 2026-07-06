import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { ApiError } from "../middleware/errorHandler";

const createOfferSchema = z.object({
  tokenSymbol: z.string().min(1),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  price: z.number().positive(),
  quantity: z.number().positive(),
  minAmount: z.number().positive().optional(),
  paymentMethods: z.array(z.string()).min(1),
  countryRestrictions: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOfferSchema.parse(req.body);
    const offer = await prisma.offer.create({
      data: {
        sellerId: req.user!.userId,
        tokenSymbol: data.tokenSymbol,
        tokenAddress: data.tokenAddress,
        price: data.price,
        quantity: data.quantity,
        minAmount: data.minAmount,
        paymentMethods: data.paymentMethods,
        countryRestrictions: data.countryRestrictions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
}

const listQuerySchema = z.object({
  tokenSymbol: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  paymentMethod: z.string().optional(),
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(100).default(20),
});

export async function listOffers(req: Request, res: Response, next: NextFunction) {
  try {
    const q = listQuerySchema.parse(req.query);

    const where: any = { status: "OPEN" };
    if (q.tokenSymbol) where.tokenSymbol = q.tokenSymbol;
    if (q.paymentMethod) where.paymentMethods = { has: q.paymentMethod };
    if (q.minPrice || q.maxPrice) {
      where.price = {};
      if (q.minPrice) where.price.gte = q.minPrice;
      if (q.maxPrice) where.price.lte = q.maxPrice;
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: { seller: { select: { id: true, walletAddress: true, displayName: true, kycStatus: true } } },
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      prisma.offer.count({ where }),
    ]);

    res.json({ offers, total, page: q.page, pageSize: q.pageSize });
  } catch (err) {
    next(err);
  }
}

export async function getOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { seller: { select: { id: true, walletAddress: true, displayName: true, kycStatus: true } } },
    });
    if (!offer) throw new ApiError(404, "Offer not found");
    res.json(offer);
  } catch (err) {
    next(err);
  }
}

export async function cancelOffer(req: Request, res: Response, next: NextFunction) {
  try {
    const offer = await prisma.offer.findUnique({ where: { id: req.params.id } });
    if (!offer) throw new ApiError(404, "Offer not found");
    if (offer.sellerId !== req.user!.userId) throw new ApiError(403, "Not your offer");
    if (offer.status !== "OPEN") throw new ApiError(400, "Offer cannot be cancelled in its current state");

    const updated = await prisma.offer.update({ where: { id: offer.id }, data: { status: "CANCELLED" } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
