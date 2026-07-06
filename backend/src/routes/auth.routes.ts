import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/db";
import { generateNonce, verifyWalletSignature } from "../utils/walletAuth";
import { signToken } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

const nonceSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
});

/**
 * POST /auth/nonce
 * Issues a one-time message for the wallet to sign.
 */
router.post("/nonce", async (req, res, next) => {
  try {
    const { walletAddress } = nonceSchema.parse(req.body);
    const message = await generateNonce(walletAddress);
    res.json({ message });
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string(),
});

/**
 * POST /auth/verify
 * Verifies the signed nonce, creates the user if new, and issues a JWT.
 */
router.post("/verify", async (req, res, next) => {
  try {
    const { walletAddress, signature } = verifySchema.parse(req.body);

    const isValid = await verifyWalletSignature(walletAddress, signature);
    if (!isValid) {
      throw new ApiError(401, "Signature verification failed");
    }

    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {},
      create: { walletAddress: walletAddress.toLowerCase() },
    });

    const token = signToken({ userId: user.id, walletAddress: user.walletAddress, role: user.role });

    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ token, user: { id: user.id, walletAddress: user.walletAddress, role: user.role, kycStatus: user.kycStatus } });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token").json({ success: true });
});

export default router;
