-- ============================================
-- 스키마 업데이트 스크립트
-- ============================================
-- 이 파일은 기존 데이터베이스를 최신 스키마로 업데이트합니다.
-- 기존 데이터는 유지되며, 새로운 컬럼만 추가됩니다.

-- 1. trip_participants 테이블 생성 (여행별 참가자 관리)
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, participant_id)
);

-- 2. shared_expenses에 payer_id 추가
ALTER TABLE shared_expenses 
ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES participants(id);

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_participant_id ON trip_participants(participant_id);

-- 4. RLS 정책 추가 (trip_participants)
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on trip_participants" ON trip_participants;
CREATE POLICY "Allow all operations on trip_participants" ON trip_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 완료!
-- ============================================
-- 이제 브라우저를 새로고침하고 앱을 사용하세요.

