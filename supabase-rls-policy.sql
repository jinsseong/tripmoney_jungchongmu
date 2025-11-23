-- ============================================
-- Row Level Security (RLS) 정책 설정
-- ============================================
-- 개발 단계에서는 모든 사용자에게 접근을 허용하는 정책을 설정합니다.
-- 프로덕션에서는 인증 기반 정책으로 변경해야 합니다.

-- 1. trips 테이블
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on trips" ON trips;
CREATE POLICY "Allow all operations on trips" ON trips
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. participants 테이블
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on participants" ON participants;
CREATE POLICY "Allow all operations on participants" ON participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2-1. trip_participants 테이블
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on trip_participants" ON trip_participants;
CREATE POLICY "Allow all operations on trip_participants" ON trip_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. categories 테이블
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on categories" ON categories;
CREATE POLICY "Allow all operations on categories" ON categories
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. expenses 테이블
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;
CREATE POLICY "Allow all operations on expenses" ON expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. expense_participants 테이블
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on expense_participants" ON expense_participants;
CREATE POLICY "Allow all operations on expense_participants" ON expense_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. shared_expenses 테이블
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shared_expenses" ON shared_expenses;
CREATE POLICY "Allow all operations on shared_expenses" ON shared_expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. daily_participations 테이블
ALTER TABLE daily_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on daily_participations" ON daily_participations;
CREATE POLICY "Allow all operations on daily_participations" ON daily_participations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. shared_dashboards 테이블
ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shared_dashboards" ON shared_dashboards;
CREATE POLICY "Allow all operations on shared_dashboards" ON shared_dashboards
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. dashboard_snapshots 테이블
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on dashboard_snapshots" ON dashboard_snapshots;
CREATE POLICY "Allow all operations on dashboard_snapshots" ON dashboard_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 참고: RLS를 완전히 비활성화하려면 (개발용)
-- ============================================
-- ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_participations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_dashboards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE dashboard_snapshots DISABLE ROW LEVEL SECURITY;

