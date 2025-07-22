/*
  # Initial Database Schema for Scrap Pickup Service

  1. New Tables
    - `users` - User profiles and authentication data
    - `addresses` - User addresses for pickup locations
    - `material_prices` - Pricing for different scrap materials
    - `orders` - Pickup orders and bookings
    - `order_items` - Individual items within orders
    - `payments` - Payment transaction records

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure admin-only access for pricing and order management

  3. Indexes
    - Performance optimization for common queries
    - Foreign key relationships
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  role text NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'DRIVER', 'SUPPORT')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'HOME' CHECK (type IN ('HOME', 'OFFICE', 'OTHER')),
  address_line_1 text NOT NULL,
  address_line_2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  landmark text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Material prices table
CREATE TABLE IF NOT EXISTS material_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price_per_kg decimal(10,2) NOT NULL,
  minimum_quantity decimal(10,2) DEFAULT 1.0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  pickup_address_id uuid REFERENCES addresses(id),
  scheduled_date date NOT NULL,
  scheduled_time_slot text NOT NULL,
  actual_weight decimal(10,2),
  estimated_amount decimal(10,2) NOT NULL DEFAULT 0,
  final_amount decimal(10,2),
  payment_status text NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED')),
  payment_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  material_id uuid REFERENCES material_prices(id),
  estimated_quantity decimal(10,2) NOT NULL,
  actual_quantity decimal(10,2),
  price_per_kg decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  payment_gateway text NOT NULL DEFAULT 'razorpay',
  gateway_payment_id text,
  gateway_order_id text,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'INR',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- RLS Policies for addresses
CREATE POLICY "Users can manage own addresses"
  ON addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for material_prices (public read, admin write)
CREATE POLICY "Anyone can read active material prices"
  ON material_prices
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage material prices"
  ON material_prices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for orders
CREATE POLICY "Users can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pending orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "Admins can manage all orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPPORT')
    )
  );

-- RLS Policies for order_items
CREATE POLICY "Users can read own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items for own orders"
  ON order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE id = order_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (true);

-- Insert sample material prices
INSERT INTO material_prices (name, category, price_per_kg, minimum_quantity) VALUES
('Iron Scrap', 'Metal', 25.00, 5.0),
('Steel Scrap', 'Metal', 30.00, 5.0),
('Aluminum Cans', 'Metal', 45.00, 2.0),
('Copper Wire', 'Metal', 350.00, 1.0),
('Brass Items', 'Metal', 280.00, 1.0),
('Newspaper', 'Paper', 8.00, 10.0),
('Cardboard', 'Paper', 12.00, 5.0),
('Office Paper', 'Paper', 15.00, 5.0),
('Plastic Bottles', 'Plastic', 18.00, 3.0),
('Plastic Containers', 'Plastic', 22.00, 2.0),
('Electronic Waste', 'Electronics', 25.00, 1.0),
('Mobile Phones', 'Electronics', 50.00, 1.0),
('Glass Bottles', 'Glass', 8.00, 5.0),
('Refrigerator', 'Appliances', 500.00, 1.0),
('Washing Machine', 'Appliances', 300.00, 1.0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);