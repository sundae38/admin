import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">📊 프로젝트 관리
          <br />통합 대시보드</div>
        <NavLink to="/" end className="nav-link">
          전체 대시보드
        </NavLink>
        <NavLink to="/data" className="nav-link">
          데이터 관리
        </NavLink>
        <div className="spacer" />
        <div className="user-box">
          <div style={{ fontWeight: 600, color: "#fff" }}>{user?.name}</div>
          <div>{user?.role === "admin" ? "관리자" : "담당자"}</div>
          <button className="logout-btn" onClick={logout}>
            로그아웃
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
