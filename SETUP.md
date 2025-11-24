# 🚀 여행 정산 관리 PWA 설정 가이드

## ✅ 완료된 단계
- [x] 프로젝트 생성 및 패키지 설치
- [x] 환경 변수 설정 (.env)

## 📋 다음 단계

### 1. Supabase 데이터베이스 스키마 생성

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard 접속
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "New query" 버튼 클릭

3. **스키마 생성**
   - 프로젝트 루트의 `supabase-schema.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 Cmd/Ctrl + Enter)

4. **확인**
   - 왼쪽 메뉴에서 "Table Editor" 클릭
   - 다음 테이블들이 생성되었는지 확인:
     - ✅ participants
     - ✅ categories
     - ✅ expenses
     - ✅ expense_participants
     - ✅ shared_expenses
     - ✅ daily_participations
     - ✅ shared_dashboards
     - ✅ dashboard_snapshots

### 2. 기본 카테고리 확인

- `categories` 테이블에 8개의 기본 카테고리가 자동으로 삽입됩니다:
  - 🍽️ 식사
  - ☕ 카페/음료
  - 🚗 교통
  - 🏨 숙박
  - 🎯 액티비티
  - 🛍️ 쇼핑
  - 🍻 숙/유흥
  - 💊 기타

### 3. 개발 서버 실행

터미널에서 다음 명령어 실행:

```bash
cd travel-expense-pwa
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. 테스트

1. **참여자 추가**
   - 홈 화면에서 "추가" 버튼 클릭
   - 참여자 이름 입력 후 추가

2. **지출 추가**
   - "지출 추가" 메뉴 클릭
   - 금액, 카테고리, 결제자, 참여자 선택
   - "추가하기" 클릭

3. **대시보드 확인**
   - "대시보드" 메뉴 클릭
   - 정산 현황, 캘린더, 차트 확인

4. **기간별 공유비용**
   - "공유비용" 메뉴 클릭
   - 기간별 공유비용 추가

5. **공유 대시보드**
   - 대시보드에서 "공유하기" 버튼 클릭
   - 공유 링크 생성 및 확인

## 🔧 문제 해결

### 데이터베이스 연결 오류
- `.env` 파일의 URL과 키가 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 테이블이 보이지 않음
- SQL 스크립트가 성공적으로 실행되었는지 확인
- Table Editor에서 새로고침

### 기본 카테고리가 없음
- `supabase-schema.sql`의 마지막 부분(INSERT 문)이 실행되었는지 확인
- 수동으로 카테고리를 추가하거나 SQL Editor에서 INSERT 문만 다시 실행

## 📝 참고사항

- 개발 단계에서는 RLS(Row Level Security)를 비활성화하는 것을 권장합니다
- 프로덕션 배포 시에는 RLS 정책을 설정해야 합니다
- 모든 테이블에 인덱스가 생성되어 성능이 최적화되어 있습니다

## 🎉 완료!

모든 설정이 완료되면 앱을 사용할 수 있습니다!

