import { FormEvent, useState } from "react";
import api from "../api/client";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ type: "err", text: "새 비밀번호는 8자 이상이어야 합니다." });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "err", text: "새 비밀번호가 서로 일치하지 않습니다." });
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      setMsg({ type: "ok", text: "비밀번호가 변경되었습니다." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: any) {
      setMsg({ type: "err", text: err.response?.data?.detail || "변경에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>비밀번호 변경</h3>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="field">현재 비밀번호</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="field">새 비밀번호 (8자 이상)</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="field">새 비밀번호 확인</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
        </div>
        {msg && (
          <div style={{ marginTop: 12, fontSize: 13.5, color: msg.type === "ok" ? "var(--good)" : "var(--danger)" }}>
            {msg.type === "ok" ? "✅ " : "⚠ "}{msg.text}
          </div>
        )}
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
          <button type="button" className="btn" onClick={onClose}>닫기</button>
          <button className="btn primary" disabled={busy}>{busy ? "변경 중…" : "변경"}</button>
        </div>
      </form>
    </div>
  );
}
