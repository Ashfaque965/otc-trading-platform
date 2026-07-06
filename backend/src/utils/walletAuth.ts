import { ethers } from "ethers";
import { redis } from "../config/redis";

const NONCE_TTL_SECONDS = 5 * 60; // nonce valid for 5 minutes
const NONCE_PREFIX = "wallet:nonce:";

/** Generates a one-time nonce for a wallet address and stores it in Redis. */
export async function generateNonce(walletAddress: string): Promise<string> {
  const nonce = `Sign in to OTC Platform.\nWallet: ${walletAddress}\nNonce: ${ethers.hexlify(ethers.randomBytes(16))}\nIssued: ${new Date().toISOString()}`;
  await redis.set(`${NONCE_PREFIX}${walletAddress.toLowerCase()}`, nonce, "EX", NONCE_TTL_SECONDS);
  return nonce;
}

/** Verifies a signed message against the stored nonce and recovers the signer address. */
export async function verifyWalletSignature(walletAddress: string, signature: string): Promise<boolean> {
  const key = `${NONCE_PREFIX}${walletAddress.toLowerCase()}`;
  const storedMessage = await redis.get(key);
  if (!storedMessage) return false;

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(storedMessage, signature);
  } catch {
    return false;
  }

  const isValid = recovered.toLowerCase() === walletAddress.toLowerCase();
  if (isValid) {
    await redis.del(key); // one-time use
  }
  return isValid;
}
