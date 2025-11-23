# 🔧 문제 해결 가이드

## ❌ "Error fetching participants: {}" 오류

이 오류는 Supabase 연결 문제 또는 RLS(Row Level Security) 정책 문제입니다.

### 해결 방법 1: RLS 정책 설정 (권장)

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 왼쪽 메뉴 → "SQL Editor"
   - "New query" 클릭

3. **RLS 정책 실행**
   - 프로젝트의 `supabase-rls-policy.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

4. **확인**
   - 왼쪽 메뉴 → "Authentication" → "Policies"
   - 각 테이블에 정책이 생성되었는지 확인

### 해결 방법 2: RLS 비활성화 (개발용)

개발 단계에서만 사용하세요:

```sql
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_participations DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_dashboards DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_snapshots DISABLE ROW LEVEL SECURITY;
```

### 해결 방법 3: 환경 변수 확인

`.env.local` 파일 확인:

```bash
cd travel-expense-pwa
cat .env.local
```

다음과 같이 설정되어 있어야 합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**중요**: 값이 비어있거나 잘못된 경우 오류가 발생합니다.

### 해결 방법 4: Supabase 연결 테스트

브라우저 콘솔에서 테스트:

```javascript
// F12 → Console 탭에서 실행
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

supabase.from('participants').select('*').then(console.log);
```

## 🔍 일반적인 오류

### 1. "relation does not exist"
- **원인**: 테이블이 생성되지 않음
- **해결**: `supabase-schema.sql` 실행

### 2. "permission denied"
- **원인**: RLS 정책 문제
- **해결**: `supabase-rls-policy.sql` 실행

### 3. "Invalid API key"
- **원인**: 잘못된 Supabase 키
- **해결**: `.env.local` 파일의 키 확인

### 4. "Network error"
- **원인**: Supabase URL이 잘못됨
- **해결**: `.env.local` 파일의 URL 확인

## ✅ 체크리스트

문제 해결 전 확인사항:

- [ ] `.env.local` 파일에 Supabase URL과 키가 올바르게 설정됨
- [ ] `supabase-schema.sql` 실행 완료
- [ ] `supabase-rls-policy.sql` 실행 완료
- [ ] Supabase 프로젝트가 활성화되어 있음
- [ ] 브라우저 콘솔에서 더 자세한 오류 메시지 확인

## 📞 추가 도움

문제가 계속되면:
1. 브라우저 콘솔(F12)의 전체 오류 메시지 확인
2. Network 탭에서 실패한 요청 확인
3. Supabase 대시보드의 Logs 확인

