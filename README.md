# 여행 정산 관리 PWA

친구들과 함께하는 여행 비용을 투명하게 정산하는 Progressive Web App입니다.

## 🚀 시작하기

### 1. 환경 변수 설정

`.env` 파일을 생성하고 Supabase 정보를 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 데이터베이스 설정

Supabase SQL Editor에서 프로젝트 루트의 `supabase-schema-safe.sql` 전체 내용을 실행하세요.

이 스크립트 하나에 현재 앱이 사용하는 테이블, 인덱스, 트리거가 모두 포함되어 있습니다.

- 여행/참가자: `trips`, `participants`, `trip_participants`
- 지출/정산: `expenses`, `expense_participants`, `expense_daily_participants`
- 레거시 공유비용 호환: `shared_expenses`, `daily_participations`
- 공유 대시보드: `shared_dashboards`, `dashboard_snapshots`
- Storage: `participant-avatars` 버킷

기존 Supabase DB가 있는 경우에도 같은 파일을 다시 실행할 수 있도록 `IF NOT EXISTS`와 호환 컬럼 보정 구문을 포함했습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 주요 기능

- ✅ 참여자 관리 (추가/수정/삭제)
- ✅ 여행별 참가자 관리
- ✅ 여행 초대 링크 및 참가자 셀프 프로필 등록
- ✅ 지출 입력 (일반 지출, n분의 1 정산, 직접 정산)
- ✅ 최근 입력값 기억 및 지출별 참여자 빠른 선택
- ✅ 개인별 정산 탭
- ✅ 교통/숙박 다일자 지출 및 날짜별 참여자 정산
- ✅ 차액 정산 계산
- ✅ 최적화된 송금 안내
- ✅ 비밀번호 보호 공유 대시보드 (PBKDF2-SHA256 해시 저장)
- ✅ PWA 지원 (앱 설치 및 앱 셸 캐시)
- ✅ 모바일 최적화

## 🔐 보안 참고

- 공유 대시보드 비밀번호는 평문이나 단순 인코딩이 아니라 솔트가 포함된 PBKDF2-SHA256 해시로 저장됩니다.
- `supabase-rls-policy.sql`은 개발용 전체 허용 정책입니다.
- 초대 링크와 프로필 사진을 테스트하려면 `trips.invite_key`, `trips.admin_key`, `participants.avatar_url`, `participant-avatars` Storage 정책이 필요합니다.
- 실시간 정산 정확성을 위해 Supabase API 응답은 서비스 워커에 저장하지 않습니다.
- 실제 배포 전에는 Supabase Auth 또는 별도 권한 모델을 기준으로 여행/참가자/공유 링크 단위 RLS 정책을 재설계해야 합니다.

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **PWA**: next-pwa

## 📦 빌드

```bash
npm run build
npm start
```

## 📝 라이선스

MIT
