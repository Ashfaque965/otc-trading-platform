# Architecture Overview

## Trade Settlement Flow (Sequence)

1. **Seller** creates an `Offer` via `POST /api/offers` (off-chain listing only — no funds move yet).
2. **Seller** calls `Escrow.createTrade(token, amount, duration)` on-chain, approving and depositing tokens.
3. **Buyer** browses `/marketplace`, opens the offer, and calls `Escrow.joinTrade(tradeId)`.
4. Frontend calls `POST /api/trades` to persist the DB-side trade record linked to the on-chain trade ID.
5. **Buyer** sends fiat/stablecoin payment off-chain (bank transfer, Stripe, etc.), then calls `Escrow.markPaid(tradeId)`.
6. **Seller** confirms receipt and calls `Escrow.release(tradeId)`, which pays the buyer minus the platform fee.
7. Frontend calls `PATCH /api/trades/:id/status` after each on-chain transaction to keep the database status in sync.
8. If either party disputes at any point before release, `Escrow.dispute(tradeId)` moves the trade to `DISPUTED`,
   and an address holding `ARBITRATOR_ROLE` calls `Escrow.resolve(tradeId, refundToSeller)`.

## Why a hybrid on-chain/off-chain design?

- **On-chain**: only what needs trustless enforcement — token custody, release conditions, dispute arbitration.
- **Off-chain**: everything that benefits from mutability, indexing, and UX — offer listings, KYC status,
  chat history, notifications. This keeps gas costs low and lets the platform iterate on UX without
  redeploying contracts.

## Event Indexing

`backend/src/services/blockchain.service.ts` listens for Escrow events (`TradeCreated`, `FundsReleased`, etc.)
via `ethers.Contract.on(...)`. This is sufficient for a demo/portfolio build. For production, replace this
with a durable indexer (e.g. a queue-backed listener with confirmation depth checks, or a service like
The Graph) so that a dropped websocket connection can't cause missed events.

## Security Model Summary

- `Escrow` uses OpenZeppelin's `ReentrancyGuard` and `AccessControl`. All external token transfers happen
  after state is updated (checks-effects-interactions).
- `MultiSigTreasury` requires N-of-M confirmations before any withdrawal executes.
- `FeeManager` caps platform fees at 10% (1000 bps) at the contract level.
- Wallet login uses a SIWE-style nonce-then-signature flow: a one-time nonce is issued and stored in Redis
  with a 5-minute TTL, then consumed exactly once on successful signature verification.
- Backend API applies `helmet`, CORS restricted to `FRONTEND_URL`, and a sliding-window rate limiter on all
  `/api` routes.

## What's a Stub vs. Production-Ready

| Module | Status |
|---|---|
| Escrow / MultiSig / FeeManager contracts | Functional, tested — needs professional audit before mainnet |
| Wallet auth (SIWE-style) | Functional |
| Offers / Trades / Chat | Functional |
| KYC | Stub — wire up a real provider (Sumsub/Persona/Onfido) in `kyc.routes.ts` |
| Payments (Stripe/bank) | Not implemented — add a `payments` module calling the Stripe API and reconciling against `Trade.status` |
| On-chain event indexing | Basic listener — swap for a durable indexer in production |
