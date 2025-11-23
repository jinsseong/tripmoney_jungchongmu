export interface Participant {
  id: string;
  name: string;
  avatar_color: string;
  phone?: string;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  cover_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  amount: number;
  item_name: string;
  description?: string;
  location?: string;
  memo?: string;
  category_id?: string;
  category?: string;
  payer_id: string;
  payment_type: "cash" | "card";
  currency: string;
  settlement_type: "equal" | "custom";
  date: string;
  end_date?: string; // 교통/숙박 등 여러 날짜에 걸친 지출용
  expense_date?: string;
  receipt_image_url?: string;
  created_at: string;
  updated_at: string;
  expense_participants?: ExpenseParticipant[];
  daily_participants?: ExpenseDailyParticipant[]; // 날짜별 참여자
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  participant_id: string;
  custom_amount?: number;
}

export interface ExpenseDailyParticipant {
  id: string;
  expense_id: string;
  participant_id: string;
  date: string;
  created_at: string;
}

export interface SharedExpense {
  id: string;
  trip_id: string;
  item_name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  payer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyParticipation {
  id: string;
  shared_expense_id: string;
  date: string;
  participant_id: string;
  daily_share_amount: number;
}

export interface SharedDashboard {
  id: string;
  trip_id: string;
  share_key: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  cover_image_url?: string;
  is_active: boolean;
  password_hash?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardSnapshot {
  id: string;
  dashboard_id: string;
  participant_id?: string;
  participant_name: string;
  regular_amount: number;
  shared_amount: number;
  total_amount: number;
  expense_details: Record<string, unknown>;
  created_at: string;
}

export interface SettlementBalance {
  participant_id: string;
  participant_name: string;
  total_paid: number;
  total_owed: number;
  net_balance: number;
}

export interface SettlementTransfer {
  from: {
    id: string;
    name: string;
  };
  to: {
    id: string;
    name: string;
  };
  amount: number;
}

export interface UserTotal {
  id: string;
  name: string;
  regularAmount: number;
  sharedAmount: number;
  totalAmount: number;
  totalPaid?: number;
  totalOwed?: number;
  netBalance?: number;
}

