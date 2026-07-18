"""Vercel 서버리스 진입점 — 기존 FastAPI 앱을 그대로 서빙한다.

Vercel의 Python 런타임은 이 파일에서 ASGI 앱인 `app` 변수를 자동 감지한다.
서버리스에서는 lifespan 이벤트가 보장되지 않으므로, DB 초기화(테이블 생성 +
최초 관리자 계정)를 모듈 로드 시점에 한 번 호출한다(idempotent).
"""
import os
import sys

# 백엔드 패키지(`app`)를 import 경로에 추가
_BACKEND = os.path.join(os.path.dirname(__file__), "..", "backend")
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from app.main import app, init_db  # noqa: E402

try:
    init_db()
except Exception as exc:  # 콜드스타트 시 DB 연결 실패해도 앱 로딩은 유지
    print(f"[init_db] 초기화 실패: {exc}")

# Vercel이 감지하는 ASGI 앱
__all__ = ["app"]
