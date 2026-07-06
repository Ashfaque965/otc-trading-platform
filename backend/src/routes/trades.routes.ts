import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createTrade, listMyTrades, getTrade, updateTradeStatus } from "../controllers/trades.controller";

const router = Router();

router.use(requireAuth);
router.get("/", listMyTrades);
router.get("/:id", getTrade);
router.post("/", createTrade);
router.patch("/:id/status", updateTradeStatus);

export default router;
