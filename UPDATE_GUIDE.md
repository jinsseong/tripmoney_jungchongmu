# 🔄 대시보드 업데이트 가이드

## ✅ 변경된 내용

대시보드가 이미지와 유사하게 변경되었습니다:

### 주요 변경사항

1. **여행 선택 기능 추가**
   - 상단에 여행 선택 드롭다운 추가
   - 선택된 여행의 이름이 제목으로 표시
   - 여행이 없으면 "여행 추가하기" 버튼 표시

2. **공동/개인 탭 추가**
   - "공동" 탭: 일반 지출 + 공유비용 통합 정산
   - "개인" 탭: 일반 지출만 표시 (향후 확장 가능)

3. **총쓴돈 카드**
   - 간단한 카드 형태로 총 사용금액 표시
   - 드롭다운 아이콘 추가 (향후 상세 정보 표시용)

4. **여행 기간 날짜 선택기**
   - 전체 월 달력 대신 여행 기간에 맞춘 날짜 선택기
   - 가로 스크롤로 날짜 탐색
   - 선택된 날짜는 초록색 원으로 표시
   - 지출이 있는 날짜는 초록색 배경과 금액 표시

5. **선택된 날짜의 지출만 표시**
   - 날짜를 선택하면 해당 날짜의 지출만 필터링
   - 날짜를 선택하지 않으면 전체 지출 표시

## 📋 데이터베이스 업데이트 필요

### trips 테이블 추가

Supabase에서 다음 SQL을 실행하세요:

```sql
-- trips 테이블 생성
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

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);

-- 트리거 추가
CREATE TRIGGER update_trips_updated_at 
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책 추가 (supabase-rls-policy.sql에 포함됨)
```

### 기존 데이터 마이그레이션

기존 지출 데이터가 있다면:

```sql
-- 기존 지출에 기본 여행 생성 (선택사항)
INSERT INTO trips (name, start_date, end_date)
VALUES ('기본 여행', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days')
RETURNING id;

-- 기존 지출에 trip_id 연결 (위에서 생성한 trip id 사용)
-- UPDATE expenses SET trip_id = 'your-trip-id' WHERE trip_id IS NULL;
```

## 🚀 사용 방법

### 1. 여행 추가
1. 홈 화면 → "여행 관리" 클릭
2. "여행 추가" 버튼 클릭
3. 여행 이름, 시작일, 종료일 입력
4. 저장

### 2. 대시보드 사용
1. 대시보드 접속
2. 상단에서 여행 선택
3. "공동" 또는 "개인" 탭 선택
4. 날짜 선택기에서 날짜 클릭
5. 해당 날짜의 지출 확인

### 3. 지출 추가
- 대시보드에서 "지출 추가" 클릭 시 자동으로 선택된 여행에 연결
- 또는 직접 `/add-expense?trip={tripId}` 접속

## 📝 참고사항

- 여행이 없으면 대시보드에서 "여행 추가하기" 안내 표시
- 여행을 선택하지 않으면 모든 지출이 표시됨
- 날짜 선택기를 사용하려면 여행이 필요함

