export interface TransactionItem {
  productId: string;
  productType: "DefaultProduct" | "CustomProduct";
  quantity: number;
  unitPrice: number;
  totalCents: number;
}

export interface OrderItem {
  productId: string;
  productType: "DefaultProduct" | "CustomProduct";
  quantity: number;
  conditioning: string;
  unitPrice: number;
  totalCents: number;
}

export interface VoiceParseResult {
  action: "sale" | "stock";
  products: Array<{ name: string; quantity: number; matched?: boolean; productId?: string }>;
  clientName?: string;
  confidence: number;
}

export interface DashboardStats {
  salesToday: number;
  totalDebt: number;
  lowStockCount: number;
  totalClients: number;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  totalCommissions: number;
  pendingCommissions: number;
  totalUsers: number;
  totalVendors: number;
  totalWholesalers: number;
  totalTransactions: number;
  activeSponsored: number;
  dataSubscriptions: number;
}
