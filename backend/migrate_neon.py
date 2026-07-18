"""1회성 Neon 마이그레이션 — 기존 테이블에 신규 컬럼 추가.
create_all은 기존 테이블 컬럼을 추가하지 않으므로 직접 ALTER 한다.
사용: NEON_URL 환경변수 설정 후 실행.
"""
import os

import psycopg2

url = os.environ["NEON_URL"]
conn = psycopg2.connect(url)
conn.autocommit = True
cur = conn.cursor()

statements = [
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS grant_type VARCHAR(50)",
    "ALTER TABLE programs ADD COLUMN IF NOT EXISTS session_no INTEGER",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS gender VARCHAR(10)",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS school_level VARCHAR(30)",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS special_categories JSON",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS gender_counts JSON",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS school_counts JSON",
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS care_counts JSON",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_personnel DOUBLE PRECISION DEFAULT 0",
]
for s in statements:
    cur.execute(s)
    print("OK:", s)


def has_col(table, col):
    cur.execute(
        "SELECT 1 FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
        (table, col),
    )
    return cur.fetchone() is not None


print("projects.grant_type:", has_col("projects", "grant_type"))
print("programs.session_no:", has_col("programs", "session_no"))
cur.close()
conn.close()
