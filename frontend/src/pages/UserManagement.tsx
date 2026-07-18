import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "../auth";
import { datetime } from "../format";

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);
  const [notice, setNotice] = useState("");

  function load() {
    setLoading(true);
    api.get<User[]>("/api/users").then((r) => setUsers(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(u: User) {
    if (u.id === user?.id) { alert("본인 계정은 삭제할 수 없습니다."); return; }
    if (!confirm(`'${u.name}(${u.username})' 계정을 삭제할까요?`)) return;
    await api.delete(`/api/users/${u.id}`);
    load();
  }

  async function changeRole(u: User, role: string) {
    await api.put(`/api/users/${u.id}`, { role });
    load();
  }

  if (loading) return <div className="loading">불러오는 중…</div>;

  return (
    <div>
      <div className="toolbar">
        <div>
          <h1 className="page-title">사용자 관리</h1>
          <p className="page-sub" style={{ margin: 0 }}>팀원 계정을 추가하거나 역할 변경·비밀번호 초기화·삭제를 합니다.</p>
        </div>
        <button className="btn primary" onClick={() => setAdding(true)}>+ 팀원 추가</button>
      </div>

      {notice && <div className="callout-notice" style={{ marginBottom: 14, padding: "10px 14px", background: "var(--surface-2)", borderRadius: 8, fontSize: 13.5 }}>{notice}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>아이디</th><th>이름</th><th>역할</th><th>생성일시</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.username}{u.id === user?.id && <span className="muted"> (나)</span>}</td>
                <td>{u.name}</td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 110 }} disabled={u.id === user?.id}>
                    <option value="admin">관리자</option>
                    <option value="staff">담당자</option>
                  </select>
                </td>
                <td className="muted">{datetime(u.created_at)}</td>
                <td className="num">
                  <button className="btn small" onClick={() => setResetting(u)}>비밀번호 초기화</button>{" "}
                  <button className="btn small danger" onClick={() => remove(u)} disabled={u.id === user?.id}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddUserModal onClose={() => setAdding(false)} onDone={(m) => { setNotice(m); setAdding(false); load(); }} />}
      {resetting && <ResetPasswordModal target={resetting} onClose={() => setResetting(null)} onDone={(m) => { setNotice(m); setResetting(null); }} />}
    </div>
  );
}

function AddUserModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("staff");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    setBusy(true);
    try {
      await api.post("/api/users", { username, name, role, password });
      onDone(`'${name}(${username})' 계정을 추가했습니다. 초기 비밀번호를 본인에게 전달하세요.`);
    } catch (e: any) {
      setErr(e.response?.data?.detail || "추가에 실패했습니다.");
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>팀원 계정 추가</h3>
        <div className="form-grid">
          <div><label className="field">아이디 *</label><input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus /></div>
          <div><label className="field">이름 *</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><label className="field">역할</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}><option value="staff">담당자</option><option value="admin">관리자</option></select>
          </div>
          <div><label className="field">초기 비밀번호 (8자 이상) *</label><input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        </div>
        {err && <div style={{ marginTop: 10, color: "var(--danger)", fontSize: 13 }}>⚠ {err}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" disabled={busy}>{busy ? "추가 중…" : "추가"}</button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ target, onClose, onDone }: { target: User; onClose: () => void; onDone: (msg: string) => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    setBusy(true);
    try {
      await api.post(`/api/users/${target.id}/reset-password`, { new_password: password });
      onDone(`'${target.name}'님의 비밀번호를 초기화했습니다. 새 비밀번호를 본인에게 전달하세요.`);
    } catch (e: any) {
      setErr(e.response?.data?.detail || "초기화에 실패했습니다.");
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>비밀번호 초기화 — {target.name}({target.username})</h3>
        <div>
          <label className="field">새 비밀번호 (8자 이상)</label>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>초기화 후 새 비밀번호를 해당 팀원에게 직접 전달하세요.</div>
        </div>
        {err && <div style={{ marginTop: 10, color: "var(--danger)", fontSize: 13 }}>⚠ {err}</div>}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn" onClick={onClose}>취소</button>
          <button className="btn primary" disabled={busy}>{busy ? "처리 중…" : "초기화"}</button>
        </div>
      </form>
    </div>
  );
}
