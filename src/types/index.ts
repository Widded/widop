export type RoomStatus = 'waiting' | 'active' | 'finished';

export interface Room {
  id: string;
  code: string;
  name: string;
  status: RoomStatus;
  created_at: string;
  owner_id: string;
  settings?: {
    starting_balance?: number;
    salary_amount?: number;
  };
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  session_token: string;
  balance: number;
  is_banker: boolean;
  is_owner: boolean;
  is_active: boolean;
  created_at: string;
}

export type PropertyGroup = 
  | 'brown' 
  | 'light_blue' 
  | 'pink' 
  | 'orange' 
  | 'red' 
  | 'yellow' 
  | 'green' 
  | 'dark_blue' 
  | 'station' 
  | 'utility';

export type PropertyType = 'street' | 'station' | 'utility';

export interface Property {
  id: string;
  room_id: string;
  property_key: string;
  name: string;
  group_key: PropertyGroup;
  group_name: string;
  group_color: string;
  type: PropertyType;
  price: number;
  mortgage_value: number;
  unmortgage_price: number;
  owner_id: string | null;
  house_count: number; // 0..4
  hotel_count: number; // 0..1
  is_mortgaged: boolean;
  rent_base: number;
  rent_house_1: number;
  rent_house_2: number;
  rent_house_3: number;
  rent_house_4: number;
  rent_hotel: number;
  house_cost: number;
  position: number;
}

export type TransactionType = 
  | 'transfer' 
  | 'rent' 
  | 'bank_deposit' 
  | 'bank_withdraw' 
  | 'debt_create' 
  | 'debt_payment' 
  | 'debt_settle' 
  | 'property_buy' 
  | 'property_trade' 
  | 'property_build' 
  | 'property_sell_build' 
  | 'mortgage' 
  | 'unmortgage' 
  | 'banker_adjustment' 
  | 'banker_property_override';

export interface Transaction {
  id: string;
  room_id: string;
  type: TransactionType;
  from_player_id: string | null;
  to_player_id: string | null;
  amount: number;
  description: string;
  metadata?: Record<string, any>;
  created_by_player_id: string | null;
  created_at: string;
}

export type DebtStatus = 'open' | 'settled' | 'cancelled';

export interface Debt {
  id: string;
  room_id: string;
  creditor_id: string; // Borcu veren (alacaklı)
  debtor_id: string;   // Borcu alan (borçlu)
  original_amount: number;
  current_amount: number;
  status: DebtStatus;
  reason: string;
  created_at: string;
  settled_at: string | null;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  room_id: string;
  amount: number;
  forgiven_amount: number;
  payment_type: 'partial' | 'settled';
  created_at: string;
}

export interface UserSession {
  roomId: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  sessionToken: string;
}
