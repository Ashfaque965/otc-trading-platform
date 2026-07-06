import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createOffer, listOffers, getOffer, cancelOffer } from "../controllers/offers.controller";

const router = Router();

router.get("/", listOffers);
router.get("/:id", getOffer);
router.post("/", requireAuth, createOffer);
router.post("/:id/cancel", requireAuth, cancelOffer);

export default router;
