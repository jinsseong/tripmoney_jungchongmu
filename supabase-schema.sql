-- ============================================
-- 여행 정산 관리 앱 데이터베이스 스키마
-- ============================================

-- 1. participants (참가자)
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#3B82F6',
  avatar_url TEXT,
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
  invite_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  admin_key UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2-1. trip_participants (여행별 참가자)
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
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
  end_date DATE,
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

-- 6. expense_daily_participants (다일자 지출 날짜별 참여자)
-- 교통/숙박처럼 여러 날짜에 걸친 일반 지출을 날짜별 참여자로 나누어 정산합니다.
CREATE TABLE IF NOT EXISTS expense_daily_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, participant_id, date)
);

-- 7. shared_expenses (기간별 공유비용, 레거시 호환)
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

-- 8. daily_participations (공유비용 일별 참여자, 레거시 호환)
CREATE TABLE IF NOT EXISTS daily_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_expense_id UUID REFERENCES shared_expenses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  daily_share_amount INTEGER NOT NULL,
  UNIQUE(shared_expense_id, date, participant_id)
);

-- 9. shared_dashboards (공유 대시보드)
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

-- 10. dashboard_snapshots (대시보드 스냅샷)
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
-- 기존 DB 호환 컬럼 보정
-- ============================================
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE participants
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS invite_key UUID DEFAULT gen_random_uuid();

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS admin_key UUID DEFAULT gen_random_uuid();

UPDATE trips
SET invite_key = gen_random_uuid()
WHERE invite_key IS NULL;

UPDATE trips
SET admin_key = gen_random_uuid()
WHERE admin_key IS NULL;

ALTER TABLE trips
ALTER COLUMN invite_key SET DEFAULT gen_random_uuid();

ALTER TABLE trips
ALTER COLUMN invite_key SET NOT NULL;

ALTER TABLE trips
ALTER COLUMN admin_key SET DEFAULT gen_random_uuid();

ALTER TABLE trips
ALTER COLUMN admin_key SET NOT NULL;

ALTER TABLE trip_participants
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'participant';

ALTER TABLE trip_participants
DROP CONSTRAINT IF EXISTS trip_participants_role_check;

ALTER TABLE trip_participants
ADD CONSTRAINT trip_participants_role_check
CHECK (role IN ('admin', 'participant'));

ALTER TABLE shared_expenses
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES participants(id);

-- ============================================
-- 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_participant_id ON trip_participants(participant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_invite_key ON trips(invite_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_admin_key ON trips(admin_key);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_participants_participant_id ON expense_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_expense_id ON expense_daily_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_participant_id ON expense_daily_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_date ON expense_daily_participants(date);
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

CREATE OR REPLACE FUNCTION set_default_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.date;
  END IF;
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

DROP TRIGGER IF EXISTS trigger_set_default_end_date ON expenses;
CREATE TRIGGER trigger_set_default_end_date
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_default_end_date();

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
-- 참가자 프로필 사진 Storage 버킷
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'participant-avatars',
  'participant-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================
-- Row Level Security (RLS) 설정
-- ============================================
-- 개발 단계에서는 RLS를 비활성화하거나 모든 사용자에게 접근 허용
-- 프로덕션에서는 인증 기반 정책을 설정해야 합니다

-- RLS 활성화 (선택사항)
-- ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_daily_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_participations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

-- 모든 사용자에게 접근 허용 정책 (개발용)
-- CREATE POLICY "Allow all operations" ON trips FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON trip_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON categories FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expenses FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expense_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON expense_daily_participants FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON shared_expenses FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON daily_participations FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON shared_dashboards FOR ALL USING (true);
-- CREATE POLICY "Allow all operations" ON dashboard_snapshots FOR ALL USING (true);
