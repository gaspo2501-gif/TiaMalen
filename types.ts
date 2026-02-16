// Types for the application components

// Add View enum used by Sidebar
export enum View {
  POS = 'POS',
  INVENTORY = 'INVENTORY',
  SALES_HISTORY = 'SALES_HISTORY',
  DASHBOARD = 'DASHBOARD',
}

// Add Product interface used by POS, Inventory, and Dashboard
export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
}

// Add CartItem interface used by POS
export interface CartItem extends Product {
  quantity: number;
}

// Add Sale interface used by POS, SalesHistory, and Dashboard
export interface Sale {
  id: string;
  timestamp: number;
  items: CartItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta';
}
