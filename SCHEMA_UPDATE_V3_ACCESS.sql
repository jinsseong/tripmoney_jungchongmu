-- ============================================
-- 스키마 업데이트 V3: 초대/관리자 접근 분리
-- ============================================
-- 참가자 초대 링크와 관리자 링크를 분리하기 위한 최소 컬럼입니다.
-- Supabase Auth 기반 RLS를 붙이기 전까지 앱에서는 localStorage 접근 세션으로
-- 관리자/참가자 화면을 분리합니다.

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS admin_key UUID DEFAULT gen_random_uuid();

UPDATE trips
SET admin_key = gen_random_uuid()
WHERE admin_key IS NULL;

ALTER TABLE trips
ALTER COLUMN admin_key SET DEFAULT gen_random_uuid();

ALTER TABLE trips
ALTER COLUMN admin_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_admin_key ON trips(admin_key);

ALTER TABLE trip_participants
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'participant';

ALTER TABLE trip_participants
DROP CONSTRAINT IF EXISTS trip_participants_role_check;

ALTER TABLE trip_participants
ADD CONSTRAINT trip_participants_role_check
CHECK (role IN ('admin', 'participant'));

-- ============================================
-- 나중에 필요한 방향
-- ============================================
-- 초대 링크를 가진 사람만 해당 여행 참가 가능
-- 해당 여행 참가자만 지출/정산 데이터 읽기 가능
-- 총무 권한 또는 관리자 권한 분리
--
-- 위 보안은 Supabase Auth 사용자와 trip_participants.role을 연결한 뒤
-- RLS 정책으로 서버에서 강제하는 단계가 필요합니다.
