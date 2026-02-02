"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPatch } from "../../../lib/api";

interface Note {
  id: string;
  title?: string;
  content?: string;
}

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // 加载 note 详情
  const loadNote = async () => {
    if (!noteId) return;

    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet(`/items/${noteId}`);
      const noteData = resp.data || resp;
      setNote(noteData);
      setTitle(noteData.title || "");
      setContent(noteData.content || "");
    } catch (err) {
      console.error("加载失败:", err);
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNote();
  }, [noteId]);

  // 保存 note
  const saveNote = async () => {
    if (!noteId || saving) return;

    try {
      setSaving(true);
      setError(null);
      const resp = await apiPatch(`/items/${noteId}`, {
        title: title || null,
        content: content || null,
      });
      const updatedNote = resp.data || resp;
      setNote(updatedNote);
      alert("保存成功");
    } catch (err) {
      console.error("保存失败:", err);
      setError("保存失败");
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p className="page-placeholder">加载中…</p>
      </div>
    );
  }

  if (error && !note) {
    return (
      <div className="page-container">
        <p className="page-placeholder">{error}</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="page-title">笔记详情</h2>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold" }}>
          标题
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入标题（最多10字）"
          maxLength={10}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold" }}>
          内容
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="请输入内容"
          rows={10}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            boxSizing: "border-box",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={saveNote}
          disabled={saving}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: saving ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: saving ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>

      {error && note && (
        <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "8px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

