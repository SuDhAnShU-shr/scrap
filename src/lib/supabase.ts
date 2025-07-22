import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use placeholder values if environment variables are not set
const defaultUrl = 'https://placeholder.supabase.co'
const defaultKey = 'placeholder-anon-key'

export const supabase = createClient(
  supabaseUrl || defaultUrl, 
  supabaseAnonKey || defaultKey
)

// Database types
export interface User {
  id: string
  email: string
  name: string
  phone: string
  role: 'CUSTOMER' | 'ADMIN' | 'DRIVER' | 'SUPPORT'
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  type: 'HOME' | 'OFFICE' | 'OTHER'
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  pincode: string
  landmark?: string
  is_default: boolean
  created_at: string
}

export interface MaterialPrice {
  id: string
  name: string
  category: string
  price_per_kg: number
  minimum_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  user_id: string
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  pickup_address: Address
  scheduled_date: string
  scheduled_time_slot: string
  actual_weight?: number
  estimated_amount: number
  final_amount?: number
  payment_status: 'PENDING' | 'PAID' | 'FAILED'
  payment_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  material_id: string
  estimated_quantity: number
  actual_quantity?: number
  price_per_kg: number
  created_at: string
}