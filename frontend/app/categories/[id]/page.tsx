"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "../../../lib/api";

interface Note {
  id: string;
  title?: string;
}

export default function CategoryDetailPage() {
  const params = useParams();
  const folderId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [creating, setCreating] = useState(false);

  // 加载 notes 列表
  const loadNotes = async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet(
        `/items/list?type=NOTE&folderId=${encodeURIComponent(folderId)}`
      );
      const notesList = Array.isArray(resp) ? resp : resp.data ?? resp.items ?? [];
      setNotes(notesList);
    } catch (err) {
      console.error("加载失败:", err);
      setError("加载失败");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [folderId]);

  // 创建新 NOTE
  const createNote = async () => {
    if (!folderId || creating) return;

    try {
      setCreating(true);
      await apiPost("/items", {
        type: "NOTE",
        title: "新笔记",
        content: "新建笔记",
        folderId,
      });
      // 创建成功后刷新列表
      await loadNotes();
    } catch (err) {
      console.error("创建失败:", err);
      alert("创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">分类详情</h2>
      
      {/* 新建 NOTE 按钮 */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={createNote}
          disabled={creating || loading}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: creating ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: creating || loading ? "not-allowed" : "pointer",
          }}
        >
          {creating ? "创建中…" : "新建 NOTE"}
        </button>
      </div>

      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && notes.length === 0 && (
        <p className="page-placeholder">暂无内容</p>
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="placeholder-content">
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <div style={{ fontSize: "16px", color: "#333" }}>
                {note.title || note.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

