import { ethers } from "ethers";
import { logger } from "../utils/logger";

// Minimal ABI covering the functions/events the backend needs to read/react to.
const ESCROW_ABI = [
  "function getTrade(uint256 tradeId) view returns (tuple(address seller,address buyer,address token,uint256 amount,uint256 feeBps,uint8 status,uint256 createdAt,uint256 expiresAt))",
  "event TradeCreated(uint256 indexed tradeId, address indexed seller, address token, uint256 amount, uint256 expiresAt)",
  "event TradeJoined(uint256 indexed tradeId, address indexed buyer)",
  "event PaymentMarked(uint256 indexed tradeId, address indexed buyer)",
  "event FundsReleased(uint256 indexed tradeId, address indexed to, uint256 amount, uint256 fee)",
  "event TradeCancelled(uint256 indexed tradeId)",
  "event DisputeOpened(uint256 indexed tradeId, address indexed opener)",
  "event DisputeResolved(uint256 indexed tradeId, bool refundedToSeller)",
];

const TRADE_STATUS_MAP = ["NONE", "CREATED", "PAID", "RELEASED", "CANCELLED", "DISPUTED", "REFUNDED"] as const;

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private escrow: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS;

    if (!rpcUrl || !escrowAddress) {
      logger.warn("[blockchain] RPC_URL or ESCROW_CONTRACT_ADDRESS not set — blockchain service running in stub mode");
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.escrow = new ethers.Contract(escrowAddress || ethers.ZeroAddress, ESCROW_ABI, this.provider);
  }

  /** Reads the on-chain trade struct and maps the numeric status to a readable string. */
  async getOnChainTrade(tradeId: number) {
    const trade = await this.escrow.getTrade(tradeId);
    return {
      seller: trade.seller,
      buyer: trade.buyer,
      token: trade.token,
      amount: trade.amount.toString(),
      feeBps: Number(trade.feeBps),
      status: TRADE_STATUS_MAP[Number(trade.status)] ?? "UNKNOWN",
      createdAt: Number(trade.createdAt),
      expiresAt: Number(trade.expiresAt),
    };
  }

  /**
   * Subscribes to Escrow contract events and invokes the provided handler.
   * In production this should be backed by a durable indexer (e.g. a queue +
   * confirmations-based reorg protection) rather than a raw event listener.
   */
  listenForEvents(onEvent: (eventName: string, args: any) => void) {
    const events = [
      "TradeCreated",
      "TradeJoined",
      "PaymentMarked",
      "FundsReleased",
      "TradeCancelled",
      "DisputeOpened",
      "DisputeResolved",
    ];

    for (const eventName of events) {
      this.escrow.on(eventName, (...args) => {
        logger.info(`[blockchain] event received: ${eventName}`);
        onEvent(eventName, args);
      });
    }
  }
}

export const blockchainService = new BlockchainService();
