import { BrowserProvider, Contract, JsonRpcSigner, parseUnits } from "ethers";

export const ESCROW_ABI = [
  "function createTrade(address token, uint256 amount, uint256 durationSeconds) returns (uint256)",
  "function joinTrade(uint256 tradeId)",
  "function markPaid(uint256 tradeId)",
  "function release(uint256 tradeId)",
  "function cancel(uint256 tradeId)",
  "function dispute(uint256 tradeId)",
  "function getTrade(uint256 tradeId) view returns (tuple(address seller,address buyer,address token,uint256 amount,uint256 feeBps,uint8 status,uint256 createdAt,uint256 expiresAt))",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function getProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Please install MetaMask.");
  }
  return new BrowserProvider(window.ethereum);
}

export async function connectWallet(): Promise<{ address: string; signer: JsonRpcSigner }> {
  const provider = await getProvider();
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { address, signer };
}

export async function signMessage(signer: JsonRpcSigner, message: string): Promise<string> {
  return signer.signMessage(message);
}

export function getEscrowContract(signer: JsonRpcSigner) {
  const address = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
  if (!address) throw new Error("NEXT_PUBLIC_ESCROW_ADDRESS is not configured");
  return new Contract(address, ESCROW_ABI, signer);
}

export function getErc20Contract(tokenAddress: string, signer: JsonRpcSigner) {
  return new Contract(tokenAddress, ERC20_ABI, signer);
}

/** Approves the Escrow contract to pull `amount` (human units) of `tokenAddress`, then creates the trade. */
export async function approveAndCreateTrade(
  signer: JsonRpcSigner,
  tokenAddress: string,
  amount: string,
  decimals: number,
  durationSeconds: number
) {
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
  const token = getErc20Contract(tokenAddress, signer);
  const amountWei = parseUnits(amount, decimals);

  const approveTx = await token.approve(escrowAddress, amountWei);
  await approveTx.wait();

  const escrow = getEscrowContract(signer);
  const createTx = await escrow.createTrade(tokenAddress, amountWei, durationSeconds);
  const receipt = await createTx.wait();
  return receipt;
}
