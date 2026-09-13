# AI 할 일 관리 — Product Requirements Document (PRD)

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 상태 | Draft → Implementation Ready |
| 제품명 | AI Todo Manager |
| 대상 저장소 | `ai-todo-manager` |
| 기준 스택 | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, AI SDK (Google Gemini) |

---

## 1. 제품 개요

### 1.1 한 줄 정의

자연어로 할 일을 만들고, 검색·필터·정렬로 관리하며, AI 요약으로 일일/주간 진행을 파악하는 개인용 할 일 웹 서비스.

### 1.2 목표

- 인증된 사용자만 자신의 할 일을 CRUD할 수 있다.
- 제목·설명·마감·우선순위·카테고리·완료 여부를 일관된 스키마로 저장한다.
- 자연어 한 문장 → 구조화된 할 일 초안(AI) → 사용자 확인 후 저장.
- 버튼 한 번으로 일일/주간 요약·분석을 받는다.

### 1.3 비목표 (v1)

- 팀/공유 할 일, 실시간 협업
- 푸시·이메일 리마인더
- 모바일 네이티브 앱
- 다국어 UI (UI 문구는 **한글**만)

### 1.4 UX 원칙 (프로젝트 규칙)

- 모든 주요 화면/액션에 **로딩 / 빈 상태 / 오류** UI를 제공한다.
- 사용자 메시지는 한글, 개발 환경에서만 상세 로그.
- 주요 액션은 disabled + 로딩 또는 낙관적 UI로 즉시 피드백한다.

---

## 2. 주요 기능

### 2.1 이메일/비밀번호 로그인·회원가입

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| AUTH-01 | Supabase Auth 이메일/비밀번호 회원가입 | P0 |
| AUTH-02 | 이메일/비밀번호 로그인 | P0 |
| AUTH-03 | 로그아웃 | P0 |
| AUTH-04 | 미인증 사용자는 보호 라우트 접근 시 로그인으로 리다이렉트 | P0 |
| AUTH-05 | 인증 오류는 한글 메시지로 표시 (예: “이메일 또는 비밀번호가 올바르지 않아요.”) | P0 |

**수락 기준**

- 회원가입 성공 시 세션이 생성되고 메인(`/todos`)으로 이동한다. (이메일 확인이 켜져 있으면 확인 안내 UI)
- 잘못된 자격 증명 시 폼 하단에 한글 오류, 개발 환경에서만 `console.error`
- 로그아웃 후 보호 API·페이지 접근 불가

**구현 메모**

- `@supabase/ssr` + middleware(또는 Next.js 16 proxy 패턴)로 세션 갱신
- 클라이언트: 브라우저 Supabase 클라이언트 / 서버: 쿠키 기반 서버 클라이언트

---

### 2.2 할 일 관리 (CRUD)

#### 필드 정의

| 필드 | 타입 (앱) | DB 컬럼 | 필수 | 설명 |
|------|-----------|---------|------|------|
| id | `string` (UUID) | `id` | 자동 | PK |
| user_id | `string` (UUID) | `user_id` | 자동 | Auth 사용자 FK |
| title | `string` | `title` | ✅ | 제목, 1–200자 |
| description | `string \| null` | `description` | | 설명, 최대 2000자 |
| created_at | `string` (ISO) | `created_at` | 자동 | 생성 시각 (`timestamptz`) |
| due_date | `string \| null` (ISO) | `due_date` | | 마감 시각 (`timestamptz`) |
| priority | `"high" \| "medium" \| "low"` | `priority` | ✅ | 기본 `medium` |
| category | `"업무" \| "개인" \| "학습" \| "기타"` | `category` | ✅ | 기본 `기타` |
| completed | `boolean` | `completed` | ✅ | 기본 `false` |
| updated_at | `string` (ISO) | `updated_at` | 자동 | 수정 시각 |

> 표시용 포맷은 `YYYY-MM-DD HH:mm` (로컬 타임존). 저장·전송은 ISO 8601 / `timestamptz`를 사용한다.  
> AI 응답 예시의 `created_date` / `due_date` 문자열은 **파싱 후** DB 타입으로 변환한다.

#### 파생 진행 상태 (필터용, DB 컬럼 아님)

| 상태 | 조건 |
|------|------|
| `in_progress` (진행 중) | `completed === false` 이고 (`due_date` 없음 또는 `due_date >= now`) |
| `completed` (완료) | `completed === true` |
| `overdue` (지연) | `completed === false` 이고 `due_date < now` |

#### CRUD 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| TODO-01 | 생성: 필수 필드 검증 후 삽입, 성공 토스트 | P0 |
| TODO-02 | 조회: 현재 사용자 소유 행만 목록/단건 | P0 |
| TODO-03 | 수정: 제목·설명·마감·우선순위·카테고리·완료 토글 | P0 |
| TODO-04 | 삭제: 확인 다이얼로그 후 삭제 | P0 |
| TODO-05 | RLS로 타 사용자 데이터 접근 불가 | P0 |
| TODO-06 | 빈 목록 시 “아직 할 일이 없어요.” + 추가 CTA | P0 |

**수락 기준**

- 완료 체크박스 토글은 목록에서 즉시 반영 (낙관적 UI 권장, 실패 시 롤백 + 토스트)
- 삭제 취소 시 데이터 유지
- 네트워크/서버 오류 시 한글 토스트

---

### 2.3 검색 · 필터 · 정렬

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| LIST-01 | 검색: `title`, `description` ILIKE 부분 일치 (디바운스 300ms) | P0 |
| LIST-02 | 필터: 우선순위 다중/단건, 카테고리, 진행 상태 | P0 |
| LIST-03 | 정렬: 우선순위순, 마감일순, 생성일순 (오름/내림) | P0 |
| LIST-04 | 필터·검색 결과 0건 시 빈 상태 안내 | P0 |
| LIST-05 | 필터/정렬 상태는 URL 쿼리로 유지 (공유·새로고침 가능) | P1 |

**정렬 규칙**

| 옵션 | 구현 |
|------|------|
| 우선순위순 | `high=0, medium=1, low=2` 매핑 후 ASC/DESC |
| 마감일순 | `due_date` NULLS LAST |
| 생성일순 | `created_at` |

**쿼리 파라미터 예시**

```
/todos?q=회의&priority=high,medium&category=업무&status=in_progress&sort=due_date&order=asc
```

---

### 2.4 AI 할 일 생성

사용자가 자연어를 입력하면 Gemini가 구조화된 할 일 초안을 만들고, 사용자가 폼에서 확인·수정한 뒤 저장한다. **AI 응답만으로 자동 INSERT하지 않는다 (v1).**

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| AI-GEN-01 | 자연어 입력 → 구조화 JSON (Zod 스키마 검증) | P0 |
| AI-GEN-02 | 실패/파싱 오류 시 한글 안내 + 수동 작성 폴백 | P0 |
| AI-GEN-03 | 생성 중 로딩, 중복 제출 방지 | P0 |
| AI-GEN-04 | 서버 Route Handler에서만 API 키 사용 | P0 |

**입력 예**

```
내일 오전 10시에 팀 회의 준비
```

**출력 스키마 (앱 계약)**

```ts
type AiTodoDraft = {
  title: string;
  description: string;
  due_date: string | null; // ISO 8601
  priority: "high" | "medium" | "low";
  category: "업무" | "개인" | "학습" | "기타";
  completed: false; // 생성 초안은 항상 false
};
```

> `created_at`은 서버/DB가 부여한다. AI가 `created_date`를 주더라도 무시한다.

**변환 결과 예 (표시용)**

```json
{
  "title": "팀 회의 준비",
  "description": "내일 오전 10시에 있을 팀 회의를 위해 자료 작성하기",
  "due_date": "2026-09-14T10:00:00+09:00",
  "priority": "high",
  "category": "업무",
  "completed": false
}
```

**API**

- `POST /api/ai/parse-todo`
- Body: `{ "text": string, "timezone": "Asia/Seoul" }`
- Response: `{ "draft": AiTodoDraft }` 또는 `{ "error": string }` (사용자용 한글 메시지)

---

### 2.5 AI 요약 · 분석

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| AI-SUM-01 | 일일 요약: 오늘 완료 수, 남은 작업, 지연 항목, 짧은 권고 | P0 |
| AI-SUM-02 | 주간 요약: 이번 주 완료율, 카테고리/우선순위 경향, 권고 | P0 |
| AI-SUM-03 | 할 일이 없으면 요약 대신 빈 상태 안내 | P0 |
| AI-SUM-04 | 결과 패널/다이얼로그에 마크다운 또는 구조화 섹션으로 표시 | P0 |

**일일 요약 입력 범위**

- `completed === true` 이고 `updated_at`이 오늘(로컬)인 항목
- `completed === false` 인 전체(또는 오늘 마감/지연 우선)

**주간 요약 입력 범위**

- 로컬 타임존 기준 이번 주(월~일)에 생성·완료·마감이 걸린 항목

**API**

- `POST /api/ai/summarize`
- Body: `{ "range": "daily" | "weekly", "timezone": "Asia/Seoul" }`
- 서버가 해당 사용자 todos를 조회한 뒤 Gemini에 전달 (클라이언트가 전체 목록을 보내지 않음 — P1에서 필수, v1도 권장)

**응답 스키마 예**

```ts
type AiSummary = {
  range: "daily" | "weekly";
  headline: string;
  stats: {
    total: number;
    completed: number;
    remaining: number;
    overdue: number;
    completionRate: number; // 0–100
  };
  highlights: string[]; // 불릿
  recommendations: string[];
};
```

---

## 3. 화면 구성

### 3.1 정보 구조 (IA)

```
/                    → 랜딩 또는 /todos 리다이렉트
/login               → 로그인
/signup              → 회원가입
/todos               → 할 일 메인 (보호)
/todos?…             → 검색/필터/정렬 쿼리
/stats               → (이후 확장) 통계·분석
```

### 3.2 로그인 / 회원가입

| 화면 | 구성 | 상태 |
|------|------|------|
| `/login` | 이메일, 비밀번호, 로그인 버튼, 회원가입 링크 | 로딩, 필드 검증 오류, Auth 오류 |
| `/signup` | 이메일, 비밀번호, 비밀번호 확인, 가입 버튼 | 동일 |

- shadcn: `Input`, `Button`, `Label`, `Card`(상호작용 폼 컨테이너로만 사용)
- 로그인된 사용자가 접근하면 `/todos`로 이동

### 3.3 할 일 관리 메인 (`/todos`)

**레이아웃 (단일 작업 화면)**

1. **헤더**: 앱 이름, 사용자 메뉴(로그아웃), AI 요약 버튼군
2. **툴바**: 검색 입력, 필터(우선순위·카테고리·상태), 정렬 셀렉트, “할 일 추가”, “AI로 만들기”
3. **목록**: 할 일 행/카드 — 완료 체크, 제목, 배지(우선순위·카테고리·지연), 마감일, 수정/삭제
4. **사이드/다이얼로그**: 생성·수정 폼, AI 초안 확인, AI 요약 결과

| 영역 | 동작 |
|------|------|
| 할 일 추가 | Dialog/Sheet 폼 → Create |
| AI로 만들기 | 자연어 Textarea → parse → 폼 prefill → 사용자 저장 |
| AI 요약 | “오늘 요약” / “주간 요약” → 결과 패널 |
| 행 클릭/수정 | 수정 폼 |
| 삭제 | AlertDialog 확인 |

**상태 UI**

| 상태 | UI |
|------|-----|
| 초기 로딩 | 목록 Skeleton |
| 빈 목록 | Empty + “첫 할 일 추가” |
| 검색 0건 | “조건에 맞는 할 일이 없어요.” |
| 오류 | Alert + 재시도 |

### 3.4 이후 확장: 통계 · 분석 (`/stats`)

- 주간 활동량, 완료율, 카테고리별 분포
- shadcn `chart`(Recharts) 활용
- v1 범위 밖 — API·뷰는 Phase 3

---

## 4. 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | Next.js 16 App Router | 페이지, RSC, Route Handlers |
| 언어 | TypeScript (strict) | 전 구간 |
| 스타일 | Tailwind CSS 4 | 레이아웃·테마 |
| UI | shadcn/ui | 폼, 다이얼로그, 배지, 토스트 등 |
| Auth/DB | Supabase | Auth, Postgres, RLS |
| AI | AI SDK + `@ai-sdk/google` (Gemini) | 구조화 생성·요약 |
| 검증 | Zod | API body, AI 출력 스키마 |
| 품질 | ESLint (Next/TS) | 린트 |

### 4.1 환경 변수

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 서버 전용, 필요 시에만

# AI (서버 전용)
GOOGLE_GENERATIVE_AI_API_KEY=
```

- 시크릿은 `.env.local`만 사용, 커밋 금지
- AI·Service Role 키는 클라이언트 번들에 노출하지 않는다

### 4.2 권장 디렉터리

```
app/
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  (app)/todos/page.tsx
  (app)/stats/page.tsx          # Phase 3
  api/ai/parse-todo/route.ts
  api/ai/summarize/route.ts
  api/todos/route.ts            # 또는 Server Actions
components/
  todos/
  auth/
  ai/
lib/
  supabase/
  todos/
  ai/
  validations/
supabase/
  migrations/
```

> 함수형 컴포넌트 + 화살표 함수, 컴포넌트 파일 파스칼케이스, 한글 주석 — 프로젝트 규칙 준수.

---

## 5. 데이터 구조 (Supabase)

### 5.1 사용자 (`auth.users` + 프로필)

Supabase Auth의 `auth.users`를 소스 오브 트루스로 사용한다. 앱 프로필이 필요하면 `public.profiles`를 둔다.

```sql
-- 프로필 (선택, Auth 트리거로 동기화)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);
```

문서상의 `users`는 **`auth.users` + `public.profiles`** 로 구현한다. 별도 비밀번호 컬럼을 앱 DB에 두지 않는다.

### 5.2 할 일 (`todos`)

```sql
create type public.todo_priority as enum ('high', 'medium', 'low');
create type public.todo_category as enum ('업무', '개인', '학습', '기타');

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (description is null or char_length(description) <= 2000),
  due_date timestamptz,
  priority public.todo_priority not null default 'medium',
  category public.todo_category not null default '기타',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_user_id_idx on public.todos (user_id);
create index todos_user_due_date_idx on public.todos (user_id, due_date);
create index todos_user_completed_idx on public.todos (user_id, completed);
create index todos_title_description_fts_idx
  on public.todos using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  ); -- 선택: 초기에는 ILIKE로도 충분

alter table public.todos enable row level security;

create policy "todos_select_own"
  on public.todos for select using (auth.uid() = user_id);

create policy "todos_insert_own"
  on public.todos for insert with check (auth.uid() = user_id);

create policy "todos_update_own"
  on public.todos for update using (auth.uid() = user_id);

create policy "todos_delete_own"
  on public.todos for delete using (auth.uid() = user_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();
```

### 5.3 ER 관계

```
auth.users 1 ─── 1 public.profiles
auth.users 1 ─── N public.todos
```

### 5.4 TypeScript 미러 타입

```ts
export type TodoPriority = "high" | "medium" | "low";
export type TodoCategory = "업무" | "개인" | "학습" | "기타";
export type TodoStatusFilter = "in_progress" | "completed" | "overdue";

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TodoPriority;
  category: TodoCategory;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
```

---

## 6. API · 서버 계약 (요약)

| Method | Path / Action | 설명 | Auth |
|--------|---------------|------|------|
| — | Supabase Auth signUp/signIn/signOut | 인증 | — |
| GET | Server Action 또는 `GET /api/todos` | 목록 (q, filter, sort) | 필요 |
| POST | Create todo | 생성 | 필요 |
| PATCH | Update todo | 수정/완료 토글 | 필요 |
| DELETE | Delete todo | 삭제 | 필요 |
| POST | `/api/ai/parse-todo` | 자연어 → draft | 필요 |
| POST | `/api/ai/summarize` | 일일/주간 요약 | 필요 |

v1 권장: 할 일 CRUD는 **Server Actions** + Supabase 서버 클라이언트, AI만 Route Handler.

---

## 7. 마일스톤

| Phase | 범위 | 완료 조건 |
|-------|------|-----------|
| **0** | Supabase 프로젝트, 마이그레이션, 환경 변수, Auth 클라이언트 | 로그인/가입 E2E |
| **1** | Todos CRUD + 검색/필터/정렬 + UX 상태 | 메인 화면 수동 QA 통과 |
| **2** | AI parse-todo + AI summarize | Zod 검증·한글 오류·키 서버 전용 |
| **3** | `/stats` 시각화 | 주간 활동·완료율·카테고리 차트 |

---

## 8. 테스트 · QA 체크리스트

- [ ] 비로그인 → `/todos` 차단
- [ ] 사용자 A의 할 일이 B에게 보이지 않음 (RLS)
- [ ] CRUD + 완료 토글 + 삭제 확인
- [ ] 검색/필터/정렬 조합
- [ ] 지연 상태: 과거 `due_date` + 미완료
- [ ] AI 파싱 성공/실패/빈 입력
- [ ] 일일·주간 요약, 할 일 0건
- [ ] 로딩·빈·오류 UI 전 화면
- [ ] 모바일 뷰포트에서 툴바·다이얼로그 사용 가능

---

## 9. 열린 결정 (구현 전 확정)

| 항목 | 기본안 |
|------|--------|
| 이메일 확인(Confirm email) | 개발: OFF, 프로덕션: ON |
| 카테고리 확장 | v1은 enum 4종 고정 |
| AI 모델 | `google/gemini-2.0-flash` 또는 프로젝트에서 정한 Gemini 모델 |
| 타임존 | 기본 `Asia/Seoul`, 요청 body로 전달 |
| 통계 화면 | Phase 3 |

---

## 10. 참고 — 사용자 스토리 (요약)

1. **가입/로그인**하면 내 할 일 화면에 들어간다.
2. **직접 추가**하거나 **한 줄로 AI 초안**을 받아 저장한다.
3. **검색·필터·정렬**로 필요한 일만 본다.
4. **오늘/주간 요약**으로 진행을 파악한다.
5. (이후) **통계 화면**에서 패턴을 본다.
