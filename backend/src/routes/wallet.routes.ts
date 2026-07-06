import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../config/db";

const router = Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, walletAddress: true, displayName: true, email: true, kycStatus: true, role: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { displayName, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { displayName, email },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
