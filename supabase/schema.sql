-- ====================================================================
-- MONOPOLY İSTANBUL — SUPABASE VERİTABANI ŞEMASI VE GÜVENLİK POLİTİKALARI
-- ====================================================================

-- 1. TABLOLAR
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('waiting', 'active', 'finished')),
  owner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_token TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 1500 CHECK (balance >= -5000),
  is_banker BOOLEAN NOT NULL DEFAULT false,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_player_token UNIQUE (room_id, session_token)
);

-- Odadaki sahibi foreign key olarak bağla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_rooms_owner'
  ) THEN
    ALTER TABLE rooms ADD CONSTRAINT fk_rooms_owner FOREIGN KEY (owner_id) REFERENCES players(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_key TEXT NOT NULL,
  name TEXT NOT NULL,
  group_key TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('street', 'station', 'utility')),
  price NUMERIC NOT NULL,
  mortgage_value NUMERIC NOT NULL,
  unmortgage_price NUMERIC NOT NULL,
  owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  house_count INT NOT NULL DEFAULT 0 CHECK (house_count BETWEEN 0 AND 4),
  hotel_count INT NOT NULL DEFAULT 0 CHECK (hotel_count BETWEEN 0 AND 1),
  is_mortgaged BOOLEAN NOT NULL DEFAULT false,
  rent_base NUMERIC NOT NULL,
  rent_house_1 NUMERIC NOT NULL,
  rent_house_2 NUMERIC NOT NULL,
  rent_house_3 NUMERIC NOT NULL,
  rent_house_4 NUMERIC NOT NULL,
  rent_hotel NUMERIC NOT NULL,
  house_cost NUMERIC NOT NULL,
  position INT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_room_property_key UNIQUE (room_id, property_key)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  to_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  creditor_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  debtor_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  original_amount NUMERIC NOT NULL CHECK (original_amount > 0),
  current_amount NUMERIC NOT NULL CHECK (current_amount >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  forgiven_amount NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('partial', 'settled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. İNDEKSLER (Performans ve Eşzamanlılık İçin)
CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_properties_room ON properties(room_id);
CREATE INDEX IF NOT EXISTS idx_transactions_room ON transactions(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debts_room ON debts(room_id, status);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);

-- 3. ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- Anonim katılım ve gerçek zamanlı senkronizasyon için RLS devre dışı bırakılır (Finansal güvenlik atomik RPC fonksiyonları ile sağlanır):
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE debts DISABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments DISABLE ROW LEVEL SECURITY;

-- 4. ATOMİK FONKSİYONLAR (RPC)

-- 4.0 Oda Oluşturma (Tek İşlemde Oda + Kurucu + 28 Mülk + Başlangıç Parası)
CREATE OR REPLACE FUNCTION rpc_create_room(
  p_room_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_owner_id UUID,
  p_owner_name TEXT,
  p_session_token TEXT,
  p_properties JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rooms (id, code, name, status, owner_id)
  VALUES (p_room_id, upper(trim(p_code)), p_name, 'active', p_owner_id);

  INSERT INTO players (id, room_id, name, session_token, balance, is_banker, is_owner)
  VALUES (p_owner_id, p_room_id, trim(p_owner_name), p_session_token, 1500, true, true);

  INSERT INTO properties (
    id, room_id, property_key, name, group_key, group_name, group_color, type,
    price, mortgage_value, unmortgage_price, owner_id, house_count, hotel_count,
    is_mortgaged, rent_base, rent_house_1, rent_house_2, rent_house_3, rent_house_4,
    rent_hotel, house_cost, position
  )
  SELECT 
    (elem->>'id')::UUID,
    p_room_id,
    elem->>'property_key',
    elem->>'name',
    elem->>'group_key',
    elem->>'group_name',
    elem->>'group_color',
    elem->>'type',
    (elem->>'price')::NUMERIC,
    (elem->>'mortgage_value')::NUMERIC,
    (elem->>'unmortgage_price')::NUMERIC,
    NULL,
    0,
    0,
    false,
    (elem->>'rent_base')::NUMERIC,
    (elem->>'rent_house_1')::NUMERIC,
    (elem->>'rent_house_2')::NUMERIC,
    (elem->>'rent_house_3')::NUMERIC,
    (elem->>'rent_house_4')::NUMERIC,
    (elem->>'rent_hotel')::NUMERIC,
    (elem->>'house_cost')::NUMERIC,
    (elem->>'position')::INT
  FROM jsonb_array_elements(p_properties) AS elem;

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, created_by_player_id)
  VALUES (p_room_id, 'bank_deposit', NULL, p_owner_id, 1500, 'Başlangıç Bakiyesi', p_owner_id);

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.0.1 Odaya Katılma (Esnek Kod Arama: IST-482 veya IST482)
CREATE OR REPLACE FUNCTION rpc_join_room(
  p_code TEXT,
  p_player_name TEXT,
  p_player_id UUID,
  p_session_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_player players%ROWTYPE;
  v_clean_search TEXT;
BEGIN
  v_clean_search := upper(regexp_replace(p_code, '[^a-zA-Z0-9]', '', 'g'));

  SELECT * INTO v_room FROM rooms 
  WHERE upper(regexp_replace(code, '[^a-zA-Z0-9]', '', 'g')) = v_clean_search
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Belirtilen kodla bir oyun odası bulunamadı');
  END IF;

  -- Aynı isimde oyuncu varsa yeniden bağlan
  SELECT * INTO v_player FROM players 
  WHERE room_id = v_room.id AND lower(trim(name)) = lower(trim(p_player_name))
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_reconnect', true,
      'room_id', v_room.id,
      'room_code', v_room.code,
      'player_id', v_player.id,
      'player_name', v_player.name,
      'session_token', v_player.session_token
    );
  END IF;

  -- Yeni oyuncu ekle (1.500 ₺ başlangıç bakiyesi)
  INSERT INTO players (id, room_id, name, session_token, balance, is_banker, is_owner)
  VALUES (p_player_id, v_room.id, trim(p_player_name), p_session_token, 1500, false, false);

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, created_by_player_id)
  VALUES (v_room.id, 'bank_deposit', NULL, p_player_id, 1500, 'Yeni Oyuncu Başlangıç Bakiyesi', p_player_id);

  RETURN jsonb_build_object(
    'success', true,
    'is_reconnect', false,
    'room_id', v_room.id,
    'room_code', v_room.code,
    'player_id', p_player_id,
    'player_name', trim(p_player_name),
    'session_token', p_session_token
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.1 Para Transferi
CREATE OR REPLACE FUNCTION atomic_transfer(
  p_room_id UUID,
  p_session_token TEXT,
  p_from_player_id UUID,
  p_to_player_id UUID,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender players%ROWTYPE;
  v_receiver players%ROWTYPE;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tutar 0''dan büyük olmalıdır');
  END IF;

  IF p_from_player_id = p_to_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinize para gönderemezsiniz');
  END IF;

  -- Göndereni doğrula ve kilitle
  SELECT * INTO v_sender FROM players 
  WHERE id = p_from_player_id AND room_id = p_room_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oturum geçersiz veya gönderen bulunamadı');
  END IF;

  IF v_sender.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yetersiz bakiye!');
  END IF;

  -- Alıcıyı kilitle
  SELECT * INTO v_receiver FROM players 
  WHERE id = p_to_player_id AND room_id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Alıcı oyuncu bulunamadı');
  END IF;

  -- Atomik Bakiye Güncellemesi
  UPDATE players SET balance = balance - p_amount WHERE id = v_sender.id;
  UPDATE players SET balance = balance + p_amount WHERE id = v_receiver.id;

  -- İşlem Kaydı
  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, created_by_player_id)
  VALUES (p_room_id, 'transfer', v_sender.id, v_receiver.id, p_amount, coalesce(p_description, 'Para Transferi'), v_sender.id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4.2 Kira Ödemesi
CREATE OR REPLACE FUNCTION atomic_pay_rent(
  p_room_id UUID,
  p_session_token TEXT,
  p_payer_id UUID,
  p_property_id UUID,
  p_amount NUMERIC,
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payer players%ROWTYPE;
  v_owner players%ROWTYPE;
  v_prop properties%ROWTYPE;
BEGIN
  IF p_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kira tutarı negatif olamaz');
  END IF;

  SELECT * INTO v_prop FROM properties WHERE id = p_property_id AND room_id = p_room_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mülk bulunamadı');
  END IF;

  IF v_prop.owner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mülkün sahibi yok');
  END IF;

  IF v_prop.owner_id = p_payer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendi mülkünüze kira ödeyemezsiniz');
  END IF;

  IF v_prop.is_mortgaged THEN
    RETURN jsonb_build_object('success', false, 'error', 'İpotekli mülkten kira alınamaz');
  END IF;

  SELECT * INTO v_payer FROM players 
  WHERE id = p_payer_id AND room_id = p_room_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Geçersiz kiracı oturumu');
  END IF;

  IF v_payer.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yetersiz bakiye!');
  END IF;

  SELECT * INTO v_owner FROM players WHERE id = v_prop.owner_id FOR UPDATE;

  UPDATE players SET balance = balance - p_amount WHERE id = v_payer.id;
  UPDATE players SET balance = balance + p_amount WHERE id = v_owner.id;

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, metadata, created_by_player_id)
  VALUES (
    p_room_id, 
    'rent', 
    v_payer.id, 
    v_owner.id, 
    p_amount, 
    coalesce(p_description, v_prop.name || ' kira ödemesi'), 
    jsonb_build_object('property_id', v_prop.id, 'property_name', v_prop.name),
    v_payer.id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4.3 Banka İşlemleri (Maaş, Vergi, Ceza vb.)
CREATE OR REPLACE FUNCTION atomic_bank_transaction(
  p_room_id UUID,
  p_session_token TEXT,
  p_player_id UUID,
  p_amount NUMERIC,
  p_direction TEXT, -- 'bank_to_player' | 'player_to_bank'
  p_description TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player players%ROWTYPE;
  v_type TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tutar 0''dan büyük olmalıdır');
  END IF;

  SELECT * INTO v_player FROM players 
  WHERE id = p_player_id AND room_id = p_room_id AND (session_token = p_session_token OR is_banker = true)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oyuncu veya yetki bulunamadı');
  END IF;

  IF p_direction = 'bank_to_player' THEN
    -- Para ekleme işlemi yalnızca Masa Bankacısı tarafından yapılabilir
    IF NOT EXISTS (
      SELECT 1 FROM players 
      WHERE room_id = p_room_id AND session_token = p_session_token AND is_banker = true
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Para ekleme işlemi yalnızca Masa Bankacısı tarafından yapılabilir');
    END IF;

    UPDATE players SET balance = balance + p_amount WHERE id = v_player.id;
    v_type := 'bank_deposit';
    
    INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, created_by_player_id)
    VALUES (p_room_id, v_type, NULL, v_player.id, p_amount, p_description, v_player.id);

  ELSIF p_direction = 'player_to_bank' THEN
    IF v_player.balance < p_amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Yetersiz bakiye!');
    END IF;
    UPDATE players SET balance = balance - p_amount WHERE id = v_player.id;
    v_type := 'bank_withdraw';

    INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, created_by_player_id)
    VALUES (p_room_id, v_type, v_player.id, NULL, p_amount, p_description, v_player.id);

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Geçersiz banka işlem yönü');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4.4 Oyuncular Arası Borç Verme
CREATE OR REPLACE FUNCTION atomic_create_debt(
  p_room_id UUID,
  p_session_token TEXT,
  p_creditor_id UUID,
  p_debtor_id UUID,
  p_amount NUMERIC,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creditor players%ROWTYPE;
  v_debtor players%ROWTYPE;
  v_debt_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Borç tutarı 0''dan büyük olmalıdır');
  END IF;

  IF p_creditor_id = p_debtor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kendinize borç veremezsiniz');
  END IF;

  SELECT * INTO v_creditor FROM players 
  WHERE id = p_creditor_id AND room_id = p_room_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Borç veren oturumu geçersiz');
  END IF;

  IF v_creditor.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yetersiz nakit bakiye!');
  END IF;

  SELECT * INTO v_debtor FROM players WHERE id = p_debtor_id AND room_id = p_room_id FOR UPDATE;

  -- Nakit hareketi: Borç verenin parası azalır, alanın parası artar
  UPDATE players SET balance = balance - p_amount WHERE id = v_creditor.id;
  UPDATE players SET balance = balance + p_amount WHERE id = v_debtor.id;

  -- Borç kaydı oluştur
  INSERT INTO debts (room_id, creditor_id, debtor_id, original_amount, current_amount, status, reason)
  VALUES (p_room_id, v_creditor.id, v_debtor.id, p_amount, p_amount, 'open', p_reason)
  RETURNING id INTO v_debt_id;

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, metadata, created_by_player_id)
  VALUES (
    p_room_id, 
    'debt_create', 
    v_creditor.id, 
    v_debtor.id, 
    p_amount, 
    'Borç verildi: ' || coalesce(p_reason, 'Borç'), 
    jsonb_build_object('debt_id', v_debt_id),
    v_creditor.id
  );

  RETURN jsonb_build_object('success', true, 'debt_id', v_debt_id);
END;
$$;

-- 4.5 Borç Ödeme / Anlaşmalı Borç Kapatma
CREATE OR REPLACE FUNCTION atomic_pay_debt(
  p_room_id UUID,
  p_session_token TEXT,
  p_debt_id UUID,
  p_payer_id UUID,
  p_payment_amount NUMERIC,
  p_forgive_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_debt debts%ROWTYPE;
  v_debtor players%ROWTYPE;
  v_creditor players%ROWTYPE;
  v_total_reduction NUMERIC;
BEGIN
  IF p_payment_amount < 0 OR p_forgive_amount < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tutarlar negatif olamaz');
  END IF;

  v_total_reduction := p_payment_amount + p_forgive_amount;
  IF v_total_reduction <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ödeme veya silinen tutar girilmelidir');
  END IF;

  SELECT * INTO v_debt FROM debts WHERE id = p_debt_id AND room_id = p_room_id FOR UPDATE;
  IF NOT FOUND OR v_debt.status != 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Açık borç bulunamadı');
  END IF;

  IF v_total_reduction > v_debt.current_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Toplam ödeme ve silinen tutar mevcut borçtan fazla olamaz');
  END IF;

  SELECT * INTO v_debtor FROM players 
  WHERE id = v_debt.debtor_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Borçlu oturumu doğrulanamadı');
  END IF;

  IF p_payment_amount > 0 AND v_debtor.balance < p_payment_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Borçlunun nakit bakiyesi yetersiz');
  END IF;

  SELECT * INTO v_creditor FROM players WHERE id = v_debt.creditor_id FOR UPDATE;

  -- Para transferi yap (eğer fiilen ödenen tutar varsa)
  IF p_payment_amount > 0 THEN
    UPDATE players SET balance = balance - p_payment_amount WHERE id = v_debtor.id;
    UPDATE players SET balance = balance + p_payment_amount WHERE id = v_creditor.id;
  END IF;

  -- Borcu güncelle
  UPDATE debts 
  SET current_amount = current_amount - v_total_reduction,
      status = CASE WHEN (current_amount - v_total_reduction) <= 0 THEN 'settled' ELSE 'open' END,
      settled_at = CASE WHEN (current_amount - v_total_reduction) <= 0 THEN now() ELSE NULL END
  WHERE id = v_debt.id;

  INSERT INTO debt_payments (debt_id, room_id, amount, forgiven_amount, payment_type)
  VALUES (
    v_debt.id, 
    p_room_id, 
    p_payment_amount, 
    p_forgive_amount, 
    CASE WHEN (v_debt.current_amount - v_total_reduction) <= 0 THEN 'settled' ELSE 'partial' END
  );

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, metadata, created_by_player_id)
  VALUES (
    p_room_id,
    CASE WHEN p_forgive_amount > 0 THEN 'debt_settle' ELSE 'debt_payment' END,
    v_debtor.id,
    v_creditor.id,
    p_payment_amount,
    CASE 
      WHEN p_forgive_amount > 0 THEN 'Anlaşmalı borç kapatma: ' || p_payment_amount || ' ₺ ödendi, ' || p_forgive_amount || ' ₺ feragat edildi'
      ELSE 'Borç ödemesi: ' || p_payment_amount || ' ₺ ödendi'
    END,
    jsonb_build_object('debt_id', v_debt.id, 'forgiven', p_forgive_amount, 'remaining', (v_debt.current_amount - v_total_reduction)),
    v_debtor.id
  );

  RETURN jsonb_build_object('success', true, 'remaining_debt', (v_debt.current_amount - v_total_reduction));
END;
$$;

-- 4.6 Bankacı Yetkili Bakiye Düzeltmesi (Açıklamalı)
CREATE OR REPLACE FUNCTION atomic_banker_adjust_balance(
  p_room_id UUID,
  p_banker_session TEXT,
  p_player_id UUID,
  p_amount_diff NUMERIC,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_banker players%ROWTYPE;
  v_target players%ROWTYPE;
  v_old_bal NUMERIC;
BEGIN
  IF coalesce(trim(p_reason), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Yetkili düzeltme için açıklama zorunludur');
  END IF;

  SELECT * INTO v_banker FROM players 
  WHERE room_id = p_room_id AND session_token = p_banker_session AND (is_banker = true OR is_owner = true);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bu işlem için bankacı yetkisi gereklidir');
  END IF;

  SELECT * INTO v_target FROM players WHERE id = p_player_id AND room_id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Hedef oyuncu bulunamadı');
  END IF;

  v_old_bal := v_target.balance;
  UPDATE players SET balance = balance + p_amount_diff WHERE id = v_target.id;

  INSERT INTO transactions (room_id, type, from_player_id, to_player_id, amount, description, metadata, created_by_player_id)
  VALUES (
    p_room_id,
    'banker_adjustment',
    CASE WHEN p_amount_diff < 0 THEN v_target.id ELSE NULL END,
    CASE WHEN p_amount_diff >= 0 THEN v_target.id ELSE NULL END,
    abs(p_amount_diff),
    'Bankacı Düzeltmesi: ' || p_reason || ' (Önceki: ' || v_old_bal || ' ₺, Yeni: ' || (v_old_bal + p_amount_diff) || ' ₺)',
    jsonb_build_object('previous_balance', v_old_bal, 'new_balance', (v_old_bal + p_amount_diff), 'banker_id', v_banker.id),
    v_banker.id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Realtime Tablo Bildirimleri (Canlı Yayın)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['rooms', 'players', 'properties', 'transactions', 'debts', 'debt_payments'])
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION 
      WHEN duplicate_object THEN NULL;
      WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

