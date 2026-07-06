# OTC Trading Platform — King Dev · Web3 Mastery Series

A production-grade Over-the-Counter (OTC) digital asset trading platform.
Buyers and sellers trade ERC-20 tokens, wrapped assets, and NFTs directly through
an escrow smart contract, with a full-stack Web2 layer for accounts, KYC,
real-time negotiation chat, and admin oversight.

## Monorepo Layout

```
otc-platform/
├── contracts/     Solidity smart contracts (Hardhat + OpenZeppelin)
├── backend/       Node.js + Express + TypeScript API, Prisma/PostgreSQL, Socket.io
├── frontend/      Next.js 14 + TypeScript + Tailwind + Ethers.js
├── docker/        Dockerfiles per service
├── infra/         docker-compose, nginx, terraform stubs
└── docs/          Architecture notes
```

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (or use the bundled docker-compose service)
- A wallet (MetaMask) and a testnet RPC URL (Sepolia recommended)

### 2. Clone & configure
```bash
cp .env.example .env
# fill in DATABASE_URL, JWT_SECRET, RPC_URL, PRIVATE_KEY, etc.
```

### 3. Run everything with Docker Compose
```bash
docker compose -f infra/docker-compose.yml up --build
```
This starts: PostgreSQL, Redis, the backend API (port 4000), and the frontend (port 3000).

### 4. Run services individually (dev mode)

**Smart contracts**
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.ts --network sepolia
```

**Backend**
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Trade Lifecycle

```
Create Offer → Buyer Accepts → Escrow Locks Tokens → Buyer Pays Fiat/Stablecoin
→ Seller Confirms → Escrow Releases Tokens → Trade Closed
```

If either party disputes, the trade enters `DISPUTED` state and is resolved by
an admin (or, in the DAO-governed variant, by arbitrator vote) calling
`resolve()` on the Escrow contract.

## Security Notes

This is a portfolio/reference implementation. Before any mainnet or
production deployment:
- Get the Escrow, FeeManager, and MultiSigTreasury contracts professionally audited.
- Replace the demo JWT secret and all `.env.example` placeholder values.
- Add rate limiting at the reverse-proxy layer (Nginx config included in `infra/`).
- Review reentrancy guards, checks-effects-interactions ordering, and access control on every state-changing function.
- Add real KYC/AML provider integration (Sumsub, Persona, etc.) — the included KYC module is a stub interface.

## License
MIT — for portfolio and educational use.
