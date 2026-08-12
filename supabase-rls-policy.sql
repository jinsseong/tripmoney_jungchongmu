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

-- 6. expense_daily_participants 테이블
ALTER TABLE expense_daily_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on expense_daily_participants" ON expense_daily_participants;
CREATE POLICY "Allow all operations on expense_daily_participants" ON expense_daily_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. shared_expenses 테이블
ALTER TABLE shared_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shared_expenses" ON shared_expenses;
CREATE POLICY "Allow all operations on shared_expenses" ON shared_expenses
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. daily_participations 테이블
ALTER TABLE daily_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on daily_participations" ON daily_participations;
CREATE POLICY "Allow all operations on daily_participations" ON daily_participations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. shared_dashboards 테이블
ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shared_dashboards" ON shared_dashboards;
CREATE POLICY "Allow all operations on shared_dashboards" ON shared_dashboards
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 10. dashboard_snapshots 테이블
ALTER TABLE dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on dashboard_snapshots" ON dashboard_snapshots;
CREATE POLICY "Allow all operations on dashboard_snapshots" ON dashboard_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 이전 버전에서 생성된 제보 테이블은 데이터 보존을 위해 삭제하지 않고 공개 정책만 정리합니다.
DO $$
BEGIN
  IF to_regclass('public.expense_reports') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all operations on expense_reports" ON expense_reports';
  END IF;
END
$$;

-- 11. participant-avatars Storage 버킷
-- 개발/MVP 단계에서 초대받은 참가자가 직접 프로필 사진을 업로드할 수 있게 허용합니다.
DROP POLICY IF EXISTS "Allow public read on participant avatars" ON storage.objects;
CREATE POLICY "Allow public read on participant avatars" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public upload on participant avatars" ON storage.objects;
CREATE POLICY "Allow public upload on participant avatars" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public update on participant avatars" ON storage.objects;
CREATE POLICY "Allow public update on participant avatars" ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'participant-avatars')
  WITH CHECK (bucket_id = 'participant-avatars');

DROP POLICY IF EXISTS "Allow public delete on participant avatars" ON storage.objects;
CREATE POLICY "Allow public delete on participant avatars" ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'participant-avatars');

-- 이전 버전의 영수증 제보 Storage 공개 정책 정리
DROP POLICY IF EXISTS "Allow public read on expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload on expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update on expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on expense receipts" ON storage.objects;

-- ============================================
-- 참고: RLS를 완전히 비활성화하려면 (개발용)
-- ============================================
-- ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE expense_daily_participants DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_participations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_dashboards DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE dashboard_snapshots DISABLE ROW LEVEL SECURITY;
