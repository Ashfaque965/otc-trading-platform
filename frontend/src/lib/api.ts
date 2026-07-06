import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("otc_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Types ----
export interface Offer {
  id: string;
  tokenSymbol: string;
  tokenAddress: string;
  price: string;
  quantity: string;
  paymentMethods: string[];
  status: string;
  seller: { id: string; walletAddress: string; displayName?: string; kycStatus: string };
  createdAt: string;
}

export interface Trade {
  id: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  escrowAddress: string;
  onChainTradeId?: number;
  amount: string;
  price: string;
  status: string;
  createdAt: string;
}

// ---- Offers ----
export const fetchOffers = async (params?: Record<string, string | number>) => {
  const { data } = await api.get<{ offers: Offer[]; total: number }>("/offers", { params });
  return data;
};

export const fetchOffer = async (id: string) => {
  const { data } = await api.get<Offer>(`/offers/${id}`);
  return data;
};

export const createOffer = async (payload: Partial<Offer>) => {
  const { data } = await api.post<Offer>("/offers", payload);
  return data;
};

// ---- Trades ----
export const fetchMyTrades = async () => {
  const { data } = await api.get<Trade[]>("/trades");
  return data;
};

export const fetchTrade = async (id: string) => {
  const { data } = await api.get(`/trades/${id}`);
  return data;
};

export const createTrade = async (payload: Partial<Trade>) => {
  const { data } = await api.post<Trade>("/trades", payload);
  return data;
};

export const updateTradeStatus = async (id: string, status: string, txHash?: string) => {
  const { data } = await api.patch<Trade>(`/trades/${id}/status`, { status, txHash });
  return data;
};

// ---- Auth ----
export const requestNonce = async (walletAddress: string) => {
  const { data } = await api.post<{ message: string }>("/auth/nonce", { walletAddress });
  return data.message;
};

export const verifySignature = async (walletAddress: string, signature: string) => {
  const { data } = await api.post("/auth/verify", { walletAddress, signature });
  return data;
};
