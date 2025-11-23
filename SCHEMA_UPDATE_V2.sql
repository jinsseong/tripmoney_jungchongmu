-- ============================================
-- 스키마 업데이트 V2: 공유비용 → 일반 지출 통합
-- ============================================
-- 일반 지출에서 날짜 범위 및 날짜별 참여자 관리 지원
-- 교통, 숙박 카테고리에서 여러 날짜에 걸친 지출 처리

-- 1. expenses 테이블에 end_date 추가
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- 2. expense_daily_participants 테이블 생성 (날짜별 참여자)
CREATE TABLE IF NOT EXISTS expense_daily_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(expense_id, participant_id, date)
);

-- 3. 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_expense_id 
  ON expense_daily_participants(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_participant_id 
  ON expense_daily_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_expense_daily_participants_date 
  ON expense_daily_participants(date);

-- 4. RLS 정책 추가
ALTER TABLE expense_daily_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on expense_daily_participants" 
  ON expense_daily_participants;
CREATE POLICY "Allow all operations on expense_daily_participants" 
  ON expense_daily_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. 트리거 추가 (end_date 기본값: date와 동일)
CREATE OR REPLACE FUNCTION set_default_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_end_date ON expenses;
CREATE TRIGGER trigger_set_default_end_date
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_default_end_date();

-- ============================================
-- 완료!
-- ============================================
-- 이제 브라우저를 새로고침하고 앱을 사용하세요.
-- 교통/숙박 카테고리에서 날짜 범위를 선택할 수 있습니다.

