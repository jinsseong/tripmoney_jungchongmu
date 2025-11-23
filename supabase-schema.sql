-- ============================================
-- 여행 정산 관리 앱 데이터베이스 스키마
-- ============================================

-- 1. participants (참가자)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#3B82F6',
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. trips (여행)
CREATE TABLE IF NOT EXISTS trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2-1. trip_participants (여행별 참가자)
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, participant_id)
);

-- 3. categories (카테고리)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. expenses (지출 내역)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  description VARCHAR(200),
  location VARCHAR(200),
  memo TEXT,
  category_id UUID REFERENCES categories(id),
  category VARCHAR(50),
  payer_id UUID REFERENCES participants(id) NOT NULL,
  payment_type VARCHAR(20) DEFAULT 'cash',
  currency VARCHAR(10) DEFAULT 'KRW',
  settlement_type VARCHAR(20) DEFAULT 'equal',
  date DATE NOT NULL,
  expense_date DATE,
  receipt_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. expense_participants (지출 참여자)
CREATE TABLE IF NOT EXISTS expense_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  custom_amount INTEGER,
  UNIQUE(expense_id, participant_id)
);

-- 6. shared_expenses (기간별 공유비용)
CREATE TABLE IF NOT EXISTS shared_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  item_name VARCHAR(200) NOT NULL,
  total_amount INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payer_id UUID REFERENCES participants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. daily_participations (공유비용 일별 참여자)
CREATE TABLE IF NOT EXISTS daily_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_expense_id UUID REFERENCES shared_expenses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  daily_share_amount INTEGER NOT NULL,
  UNIQUE(shared_expense_id, date, participant_id)
);

-- 8. shared_dashboards (공유 대시보드)
CREATE TABLE IF NOT EXISTS shared_dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  share_key VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cover_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  password_hash VARCHAR(255),
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. dashboard_snapshots (대시보드 스냅샷)
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES shared_dashboards(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  participant_name VARCHAR(100) NOT NULL,
  regular_amount INTEGER DEFAULT 0,
  shared_amount INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  expense_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_participant_id ON expense_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_trip_id ON shared_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_daily_participations_shared_expense_id ON daily_participations(shared_expense_id);
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_share_key ON shared_dashboards(share_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_dashboard_id ON dashboard_snapshots(dashboard_id);

-- ============================================
-- updated_at 자동 업데이트 함수 및 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (기존 트리거가 있으면 삭제 후 재생성)
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at 
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_expenses_updated_at ON shared_expenses;
CREATE TRIGGER update_shared_expenses_updated_at 
  BEFORE UPDATE ON shared_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_dashboards_updated_at ON shared_dashboards;
CREATE TRIGGER update_shared_dashboards_updated_at 
  BEFORE UPDATE ON shared_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 기본 카테고리 데이터 삽입
-- ============================================
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('식사', '🍽️', '#FF6B6B', true),
  ('카페/음료', '☕', '#4ECDC4', true),
  ('교통', '🚗', '#45B7D1', true),
  ('숙박', '🏨', '#96CEB4', true),
  ('액티비티', '🎯', '#FFEAA7', true),
  ('쇼핑', '🛍️', '#DDA0DD', true),
  ('숙/유흥', '🍻', '#FF8C42', true),
  ('기타', '💊', '#98D8C8', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Row Level Security (RLS) 설정
-- ============================================
-- 개발 단계에서는 RLS를 비활성화하거나 모든 사용자에게 접근 허용
-- 프로덕션에서는 인증 기반 정책을 설정해야 합니다

-- RLS 활성화 (선택사항)
-- ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_participations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 접근 허용 정책 (개발용)
-- CREATE POLICY "Allow all operations" ON participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON categories FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expenses FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expense_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON shared_expenses FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON daily_participations FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON shared_dashboards FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON dashboard_snapshots FOR ALL USING (true);

