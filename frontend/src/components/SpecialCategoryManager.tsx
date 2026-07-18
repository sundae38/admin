import { FormEvent, useEffect, useState } from "react";
import api from "../api/client";
import type { SpecialCategory } from "../api/types";

// 관리자: 교육약자 구분 항목을 생성·삭제. 담당자는 선발자 등록 시 이 목록을 선택.
export default function SpecialCategoryManager() {
  const [items, setItems] = useState<SpecialCategory[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get<SpecialCategory[]>("/api/special-categories").then((r) => setItems(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return;
    try {
      await api.post("/api/special-categories", { name: name.trim(), sort_order: items.length });
      setName("");
      load();
    } catch (e: any) {
      setErr(e.response?.data?.detail || "추가에 실패했습니다.");
    }
  }

  async function remove(c: SpecialCategory) {
    if (!confirm(`'${c.name}' 항목을 삭제할까요? (기존 선발자에 저장된 값은 유지됩니다)`)) return;
    await api.delete(`/api/special-categories/${c.id}`);
    load();
  }

  if (loading) return <div className="loading">불러오는 중…</div>;

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="card-title">교육약자 구분 항목</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          여기서 만든 항목을 담당자가 <b>선발자 관리</b>에서 체크(선택)하여 등록합니다.
        </p>
        <form className="row" onSubmit={add} style={{ marginTop: 12 }}>
          <input placeholder="예: 기초생활수급" value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} />
          <button className="btn primary" type="submit">+ 항목 추가</button>
        </form>
        {err && <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>순서</th><th>항목명</th><th></th></tr></thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.id}>
                <td className="muted">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="num"><button className="btn small danger" onClick={() => remove(c)}>삭제</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={3} className="empty">항목이 없습니다. 위에서 추가하세요.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
