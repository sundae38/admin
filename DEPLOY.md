# Vercel 배포 가이드 (프론트 + FastAPI 서버리스 + Neon Postgres)

이 저장소는 Vercel 한 곳에 **프론트엔드(정적)** 와 **FastAPI 백엔드(서버리스 함수)** 를
함께 배포하도록 구성되어 있습니다. 데이터베이스는 Vercel에서 유지되지 않으므로
**Neon PostgreSQL(무료)** 를 사용합니다.

```
브라우저 ──▶ Vercel
             ├─ /            → 정적 프론트엔드(frontend/dist)
             └─ /api/*       → 서버리스 함수(api/index.py → FastAPI)
                                    │
                                    ▼
                              Neon PostgreSQL
```

구성 파일: `vercel.json`, `api/index.py`, 루트 `requirements.txt`, `.vercelignore`.

---

## 1단계 · Neon PostgreSQL 만들기 (무료)

1. https://neon.tech 가입 → **New Project** 생성.
2. 대시보드에서 **Connection string** 복사 (Pooled connection 권장).
   형태: `postgresql://<user>:<password>@<host>/<db>?sslmode=require`
3. 이 값을 잠시 보관합니다. (아래 `DATABASE_URL` 로 사용)

> SQLAlchemy는 `postgresql://` 를 psycopg2 드라이버로 자동 처리합니다. 그대로 사용하면 됩니다.

---

## 2단계 · 배포에 사용할 환경변수

Vercel 프로젝트 설정(Settings → Environment Variables)에 아래를 등록합니다.

| 변수 | 값 | 필수 |
|---|---|---|
| `DATABASE_URL` | Neon 연결 문자열 (1단계) | ✅ |
| `SECRET_KEY` | 임의의 긴 문자열 (예: `openssl rand -hex 32`) | ✅ |
| `FIRST_ADMIN_USERNAME` | 관리자 아이디 (기본 `admin`) | 권장 |
| `FIRST_ADMIN_PASSWORD` | **강력한 관리자 비밀번호** | ✅ |
| `FIRST_ADMIN_NAME` | 관리자 표시 이름 (기본 `관리자`) | 선택 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 토큰 만료(분), 기본 720 | 선택 |

> ⚠ **중요**: 최초 관리자 계정은 첫 접속(콜드스타트) 때 `FIRST_ADMIN_PASSWORD` 로 생성됩니다.
> 반드시 **첫 배포 전에** 강력한 비밀번호를 설정하세요. (기본값 `admin1234` 로 공개 배포 금지)
> 이미 생성된 뒤에는 이 변수를 바꿔도 비밀번호가 바뀌지 않습니다.

---

## 3단계 · 배포 (둘 중 하나 선택)

### 방법 A · Vercel CLI (가장 빠름)

```bash
npm i -g vercel          # Vercel CLI 설치
vercel login             # 브라우저로 로그인 (본인 계정)
cd C:\claude_projects\team_management
vercel                   # 최초 배포(미리보기). 프로젝트 설정 질문에 기본값 Enter
# → 대시보드 Settings에서 2단계 환경변수 등록
vercel --prod            # 운영 배포
```

> Claude Code 세션에서 직접 실행하려면 프롬프트에 `! vercel login` 처럼 `!` 를 붙여 실행하세요.

### 방법 B · GitHub 연동 (자동 배포)

```bash
cd C:\claude_projects\team_management
git init
git add .
git commit -m "프로젝트 관리 대시보드 - Vercel 배포"
# GitHub에 저장소 생성 후:
git remote add origin https://github.com/<your-id>/<repo>.git
git push -u origin main
```

1. Vercel 대시보드 → **Add New → Project** → 방금 만든 GitHub 저장소 Import.
2. Framework Preset은 **Other** (빌드 설정은 `vercel.json` 이 자동 적용).
3. **Environment Variables** 에 2단계 값 등록 → **Deploy**.

---

## 4단계 · 배포 확인

1. 발급된 도메인 접속 → 로그인 화면 표시.
2. API 헬스체크: `https://<도메인>/api/health` → `{"status":"ok"}` 확인.
3. `FIRST_ADMIN_USERNAME` / `FIRST_ADMIN_PASSWORD` 로 로그인.
4. [데이터 관리]에서 실제 데이터 입력 시작. (배포 직후 DB에는 관리자 계정만 있음)

### (선택) 데모 데이터 넣기
로컬에서 Neon DB를 대상으로 시드 스크립트를 1회 실행할 수 있습니다.
**기존 데이터를 모두 지우므로** 초기에만 사용하세요.
```bash
cd backend
# .env 의 DATABASE_URL 을 Neon 연결 문자열로 변경 후
.\.venv\Scripts\python.exe -m app.seed
```

---

## 참고 · 서버리스 제약과 대안

- **콜드스타트**: 오랜만의 첫 요청은 함수 초기화(pandas 로딩 포함)로 수 초 지연될 수 있습니다.
- **함수 크기 한도(약 250MB)**: pandas 등으로 빌드가 실패하면, 백엔드만 **Render/Railway**
  상시 서버로 옮기고 프론트만 Vercel에 두는 구성으로 전환할 수 있습니다(요청 시 설정 제공).
- **DB 연결**: Neon의 **Pooled connection** 문자열을 사용하면 서버리스 다중 연결에 유리합니다.
- **파일 업로드**: 엑셀 업로드는 요청 처리 중 메모리에서 파싱되므로 매우 큰 파일은 피하세요.
- **비밀정보**: `SECRET_KEY` 와 관리자 비밀번호는 반드시 환경변수로만 관리하세요(코드/저장소에 커밋 금지).
