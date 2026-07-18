"""교육약자 구분 마스터를 새 목록으로 교체 (Neon). NEON_URL 필요."""
import os

import psycopg2

CATEGORIES = [
    "기초생활수급자",
    "법정차상위계층",
    "학교/기관장 추천(저소득)",
    "북한이탈주민",
    "학교밖청소년(대안학교)",
    "학교밖청소년(청소년쉼터)",
    "시설거주 청소년",
]

conn = psycopg2.connect(os.environ["NEON_URL"])
conn.autocommit = True
cur = conn.cursor()
cur.execute("DELETE FROM special_categories")
for i, name in enumerate(CATEGORIES):
    cur.execute(
        "INSERT INTO special_categories (name, sort_order, created_at) VALUES (%s, %s, now())",
        (name, i),
    )
cur.execute("SELECT name FROM special_categories ORDER BY sort_order")
print("교체 완료:", [r[0] for r in cur.fetchall()])
cur.close()
conn.close()
