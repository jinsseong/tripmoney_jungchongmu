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
   - 프로젝트 루트의 `supabase-schema-safe.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 Cmd/Ctrl + Enter)
   - 신규 DB도, 기존 DB도 이 파일 하나를 기준으로 실행합니다.

4. **확인**
   - 왼쪽 메뉴에서 "Table Editor" 클릭
   - 다음 테이블들이 생성되었는지 확인:
     - ✅ trips
     - ✅ participants
     - ✅ trip_participants
     - ✅ categories
     - ✅ expenses
     - ✅ expense_participants
     - ✅ expense_daily_participants
     - ✅ shared_expenses
     - ✅ daily_participations
     - ✅ shared_dashboards
     - ✅ dashboard_snapshots
     - ✅ expense_reports
     - ✅ Storage bucket: participant-avatars
     - ✅ Storage bucket: expense-receipts

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

4. **다일자 지출**
   - 지출 추가에서 `교통` 또는 `숙박` 카테고리 선택
   - 시작일/종료일과 날짜별 참여자를 선택
   - 대시보드 정산에 날짜별 참여자가 반영되는지 확인

5. **공유 대시보드**
   - 대시보드에서 "공유하기" 버튼 클릭
   - 공유 링크 생성 및 확인

6. **초대 링크 참여**
   - 특정 여행의 "참가자 관리" 화면에서 초대 링크 복사
   - `/join/[초대키]` 페이지에서 닉네임과 프로필 사진 입력
   - 참가 완료 후 대시보드/지출 입력 참여자 목록에 반영되는지 확인

7. **개인별 정산**
   - 대시보드에서 `개인별 정산` 탭 선택
   - 참가자별 낸 돈, 부담액, 받을 돈/낼 돈, 관련 송금 내역 확인

8. **지출 제보**
   - 참가자 초대 링크 참여 완료 후 `영수증 지출 제보하기` 클릭
   - 영수증 촬영/업로드 후 품목, 금액, 정산 참여자 확인
   - 대시보드의 `지출 제보함` 탭에서 승인
   - 승인 후 실제 지출 목록과 정산에 반영되는지 확인

## 🔧 문제 해결

### 데이터베이스 연결 오류
- `.env` 파일의 URL과 키가 올바른지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 테이블이 보이지 않음
- SQL 스크립트가 성공적으로 실행되었는지 확인
- Table Editor에서 새로고침

### 기본 카테고리가 없음
- `supabase-schema-safe.sql`의 마지막 부분(INSERT 문)이 실행되었는지 확인
- 수동으로 카테고리를 추가하거나 SQL Editor에서 INSERT 문만 다시 실행

### 교통/숙박 날짜별 참여자가 저장되지 않음
- `expense_daily_participants` 테이블이 있는지 확인
- 기존 DB라면 `supabase-schema-safe.sql`을 다시 실행해 누락 테이블/컬럼을 보정

### 초대 링크가 보이지 않음
- `trips.invite_key` 컬럼이 있는지 확인
- 기존 DB라면 `supabase-schema-safe.sql`을 다시 실행해 기존 여행에도 초대키를 생성

### 프로필 사진 업로드가 실패함
- Supabase Storage에 `participant-avatars` 버킷이 있는지 확인
- `supabase-rls-policy.sql`의 Storage 정책까지 실행했는지 확인

### 영수증 지출 제보가 실패함
- `expense_reports` 테이블이 있는지 확인
- Supabase Storage에 `expense-receipts` 버킷이 있는지 확인
- `supabase-rls-policy.sql`의 Storage 정책까지 실행했는지 확인

### 영수증 텍스트 인식이 되지 않음
- 브라우저의 텍스트 감지 API 지원 여부에 따라 자동 인식이 제한될 수 있음
- 인식되지 않는 경우에도 품목/금액을 직접 입력해 제보 가능

## 📝 참고사항

- 공유 대시보드 비밀번호는 PBKDF2-SHA256 해시로 저장됩니다
- `supabase-rls-policy.sql`은 개발용 전체 허용 정책입니다
- 초대 링크, 프로필 사진 업로드, 영수증 지출 제보도 현재는 개발/MVP용 공개 정책을 사용합니다
- 프로덕션 배포 시에는 Supabase Auth 또는 별도 권한 모델에 맞춘 RLS 정책으로 교체해야 합니다
- 모든 테이블에 인덱스가 생성되어 성능이 최적화되어 있습니다

## 🎉 완료!

모든 설정이 완료되면 앱을 사용할 수 있습니다!
