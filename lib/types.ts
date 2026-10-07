export type StopKind = 'sight' | 'food' | 'hotel' | 'flight' | 'transport' | 'shop' | 'activity' | 'other';
export type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  currency: string; // e.g. JPY
  home_currency: string; // e.g. THB
  fx_rate: number; // 1 currency = fx_rate home_currency
  budget_total: number | null;
  travellers: number;
  cover_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  title: string;
  travel_mode: TravelMode;
  sort: number;
}

export interface Stop {
  id: string;
  trip_id: string;
  day_id: string | null;
  name: string;
  kind: StopKind;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  address: string | null;
  start_time: string | null; // HH:MM
  end_time: string | null;
  note: string | null;
  cost: number | null; // trip currency
  sort: number;
  source: 'manual' | 'ai' | 'booking';
  booking_id: string | null;
}

export type BookingType = 'flight' | 'hotel' | 'train' | 'car' | 'ticket' | 'other';

export interface Booking {
  id: string;
  trip_id: string;
  type: BookingType;
  title: string;
  file_path: string | null;
  provider: string | null;
  reference: string | null;
  start_at: string | null; // ISO datetime
  end_at: string | null;
  from_name: string | null;
  to_name: string | null;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  cost: number | null;
  currency: string | null;
  parsed: Record<string, unknown> | null;
  created_at: string;
}

export type ExpenseCategory = 'lodging' | 'transport' | 'food' | 'activity' | 'shopping' | 'flight' | 'other';

export interface Expense {
  id: string;
  trip_id: string;
  day_id: string | null;
  category: ExpenseCategory;
  title: string;
  amount: number; // trip currency
  planned: boolean; // true = budget line, false = actual spend
  created_at: string;
}

export interface AiSuggestion {
  name: string;
  kind: StopKind;
  lat: number;
  lng: number;
  reason: string;
  reason_th?: string;
  est_cost?: number;
  best_time?: string;
}

export const KIND_ICON: Record<StopKind, string> = {
  sight: '🏔️',
  food: '🍜',
  hotel: '🏨',
  flight: '✈️',
  transport: '🚆',
  shop: '🛍️',
  activity: '🎿',
  other: '📍',
};

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  lodging: 'Lodging',
  transport: 'Transport',
  food: 'Food',
  activity: 'Activities',
  shopping: 'Shopping',
  flight: 'Flights',
  other: 'Other',
};
