-- ============================================
-- CRYPTO WALLET SIMULATOR - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  email TEXT,
  avatar_url TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  last_reward_claim TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  btc_balance NUMERIC(18,8) DEFAULT 0,
  eth_balance NUMERIC(18,8) DEFAULT 0,
  usdt_balance NUMERIC(18,8) DEFAULT 0,
  sol_balance NUMERIC(18,8) DEFAULT 0,
  xrp_balance NUMERIC(18,8) DEFAULT 0,
  doge_balance NUMERIC(18,8) DEFAULT 0,
  bnb_balance NUMERIC(18,8) DEFAULT 0,
  inr_balance NUMERIC(18,2) DEFAULT 0,
  wallet_address TEXT,
  frozen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users,
  receiver_id UUID REFERENCES auth.users,
  coin TEXT NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  amount_inr NUMERIC(18,2),
  tx_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirming','completed','failed')),
  confirmations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  coin TEXT NOT NULL,
  crypto_amount NUMERIC(18,8) NOT NULL,
  amount_inr NUMERIC(18,2) NOT NULL,
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('upi','bank')),
  upi_id TEXT,
  bank_name TEXT,
  account_holder_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing','approved','completed','rejected')),
  processing_days_remaining INTEGER DEFAULT 3,
  estimated_arrival TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error','announcement')),
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market prices table
CREATE TABLE IF NOT EXISTS market_prices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coin_name TEXT NOT NULL,
  symbol TEXT UNIQUE NOT NULL,
  current_price_inr NUMERIC(18,2),
  change_percentage NUMERIC(8,4),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id UUID REFERENCES auth.users ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Own profile select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Own profile update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin profile select" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin profile update" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Wallets
CREATE POLICY "Own wallet select" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own wallet update" ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin wallet select" ON wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin wallet update" ON wallets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Transactions
CREATE POLICY "Own tx select" ON transactions FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "User tx insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admin tx select" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin tx update" ON transactions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Withdrawals
CREATE POLICY "Own wd select" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own wd insert" ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin wd select" ON withdrawals FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin wd update" ON withdrawals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications
CREATE POLICY "Own notif select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own notif update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin notif insert" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin notif select all" ON notifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Market prices
CREATE POLICY "Public price select" ON market_prices FOR SELECT USING (true);
CREATE POLICY "Admin price upsert" ON market_prices FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin price update" ON market_prices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Watchlist
CREATE POLICY "Own wl select" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own wl insert" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own wl delete" ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Referrals
CREATE POLICY "Own ref select" ON referrals FOR SELECT USING (
  auth.uid() = referrer_id OR auth.uid() = referred_id
);
CREATE POLICY "Own ref insert" ON referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- ============================================
-- TRIGGER: Auto-create profile & wallet on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$ DECLARE
  ref_code TEXT;
BEGIN
  ref_code := UPPER(SUBSTR(encode(gen_random_bytes(4), 'hex'), 1, 8));
  INSERT INTO profiles (id, email, username, avatar_url, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    ref_code
  );
  INSERT INTO wallets (user_id, wallet_address)
  VALUES (NEW.id, '0x' || encode(gen_random_bytes(20), 'hex'));
  RETURN NEW;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED: Insert default market prices
-- ============================================

INSERT INTO market_prices (coin_name, symbol, current_price_inr, change_percentage) VALUES
('Bitcoin', 'BTC', 8250000, 2.34),
('Ethereum', 'ETH', 245000, -1.12),
('Solana', 'SOL', 18200, 5.67),
('XRP', 'XRP', 48.5, 0.89),
('Dogecoin', 'DOGE', 22.3, -3.45),
('BNB', 'BNB', 72000, 1.23),
('Tether', 'USDT', 83.5, 0.01)
ON CONFLICT (symbol) DO UPDATE SET
  current_price_inr = EXCLUDED.current_price_inr,
  change_percentage = EXCLUDED.change_percentage,
  updated_at = NOW();
