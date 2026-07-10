export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface SalesRecord {
  id: string;
  date: Date;         // Normalized JS Date
  portal: string;     // amazon, flipkart, etc.
  product: string;    // product name
  amount: number;     // revenue amount
  units: number;      // quantity sold
  quality?: string;   // Premium, Standard, Economy, etc.
  size?: string;      // S, M, L, XL, XXL, etc.
  colour?: string;    // Black, White, Red, Blue, etc.
  imageLink?: string; // Image Link URL
}

export interface RollingAverageRow {
  name: string;       // Portal or Product name
  type: 'PORTAL' | 'PRODUCT';
  avg3Month: number;
  avg6Month: number;
  avg12Month: number;
  totalSales: number;
  totalUnits: number;
}

export interface AlertThreshold {
  id: string;
  targetType: 'PORTAL' | 'PRODUCT' | 'TOTAL';
  targetName: string; // Amazon, Product X, or "All"
  metric: 'REVENUE' | 'UNITS';
  condition: 'LESS_THAN' | 'GREATER_THAN';
  value: number;
  isActive: boolean;
  createdAt: string;
}

export interface SystemAlert {
  id: string;
  thresholdId: string;
  title: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL' | 'INFO';
  timestamp: Date;
  isRead: boolean;
  metricValue: number;
  thresholdValue: number;
  period: string; // e.g. "Current Month" or "Last 30 Days"
}

export interface GoogleSheetConfig {
  url: string;
  isEnabled: boolean;
  refreshInterval: number; // in seconds (e.g. 10, 30, 60)
  lastFetched: string | null;
  status: 'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR';
  errorMessage: string | null;
}
