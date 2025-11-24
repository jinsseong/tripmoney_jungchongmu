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

Supabase에서 다음 SQL을 실행하여 테이블을 생성하세요:

```sql
-- participants 테이블
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  avatar_color VARCHAR(7) DEFAULT '#3B82F6',
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- categories 테이블
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(10) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- expenses 테이블
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID,
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
  expense_date DATE,
  receipt_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- expense_participants 테이블
CREATE TABLE expense_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  custom_amount INTEGER,
  UNIQUE(expense_id, participant_id)
);

-- 인덱스 생성
CREATE INDEX idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expense_participants_expense_id ON expense_participants(expense_id);
CREATE INDEX idx_expense_participants_participant_id ON expense_participants(participant_id);
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 주요 기능

- ✅ 참여자 관리 (추가/수정/삭제)
- ✅ 지출 입력 (일반 지출, n분의 1 정산, 직접 정산)
- ✅ 차액 정산 계산
- ✅ 최적화된 송금 안내
- ✅ PWA 지원 (오프라인 동작, 앱 설치)
- ✅ 모바일 최적화

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
