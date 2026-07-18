"""QA 테스터 계정을 Neon에 직접 등록. NEON_URL 필요."""
import os

import psycopg2

from app.core.security import hash_password

conn = psycopg2.connect(os.environ["NEON_URL"])
conn.autocommit = True
cur = conn.cursor()
cur.execute("DELETE FROM users WHERE username IN ('tester', 'qa')")
cur.execute(
    "INSERT INTO users (username, hashed_password, name, role, created_at) "
    "VALUES (%s, %s, %s, %s, now())",
    ("qa", hash_password("QaTest1234!"), "QA테스터", "admin"),
)
print("created: qa / QaTest1234! (role=admin)")
cur.close()
conn.close()
