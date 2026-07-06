import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { prisma } from "../config/db";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res, next) => {
  try {
    const [userCount, offerCount, tradeCount, disputedCount, pendingKyc] = await Promise.all([
      prisma.user.count(),
      prisma.offer.count({ where: { status: "OPEN" } }),
      prisma.trade.count(),
      prisma.trade.count({ where: { status: "DISPUTED" } }),
      prisma.user.count({ where: { kycStatus: "PENDING" } }),
    ]);
    res.json({ userCount, offerCount, tradeCount, disputedCount, pendingKyc });
  } catch (err) {
    next(err);
  }
});

router.get("/disputes", async (_req, res, next) => {
  try {
    const disputes = await prisma.trade.findMany({
      where: { status: "DISPUTED" },
      include: { offer: true, buyer: true, seller: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(disputes);
  } catch (err) {
    next(err);
  }
});

router.get("/kyc-queue", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { kycStatus: "PENDING" },
      select: { id: true, walletAddress: true, displayName: true, createdAt: true },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post("/kyc/:userId/decision", async (req, res, next) => {
  try {
    const { approve } = req.body as { approve: boolean };
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { kycStatus: approve ? "APPROVED" : "REJECTED" },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
