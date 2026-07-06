import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../config/db";

const router = Router();
router.use(requireAuth);

const submitSchema = z.object({
  fullName: z.string().min(2),
  country: z.string().min(2),
  documentType: z.enum(["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"]),
  // In production: documentFrontUrl / documentBackUrl / selfieUrl would come from
  // a pre-signed upload to the KYC provider (Sumsub, Persona, Onfido, etc.)
  documentFrontUrl: z.string().url(),
  documentBackUrl: z.string().url().optional(),
  selfieUrl: z.string().url(),
});

/**
 * POST /kyc/submit
 * Stub: marks the user's KYC as PENDING and would forward the submission
 * to a real KYC/AML provider. Replace the TODO with an actual API call.
 */
router.post("/submit", async (req, res, next) => {
  try {
    submitSchema.parse(req.body);

    // TODO: integrate with KYC_PROVIDER_URL using KYC_PROVIDER_API_KEY
    // const providerResponse = await fetch(`${process.env.KYC_PROVIDER_URL}/verify`, { ... });

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { kycStatus: "PENDING" },
    });

    res.json({ kycStatus: user.kycStatus, message: "KYC submitted and pending review" });
  } catch (err) {
    next(err);
  }
});

router.get("/status", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { kycStatus: true } });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
