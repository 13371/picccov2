"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";

type Note = {
  id: string;
  title?: string;
  content?: string;
};

export default function NotesDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  // 状态定义（按需求）
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        // 关键：必须命中 GET /items/:id
        const res = await apiGet(`/items/${id}`);

        // 后端返回格式：{ success: true, data: item }
        const note: Note = (res?.data ?? res) as Note;

        const t = (note?.title ?? "").toString();
        const c = (note?.content ?? "").toString();

        if (!cancelled) {
          setTitle(t);
          setContent(c);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoadError(e?.message || "加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // 保存
  async function onSave() {
    if (!id) return;

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      // 关键：必须命中 PATCH /items/:id
      // 后端 UpdateItemDto: { title?: string, content?: string, ... }
      await apiPatch(`/items/${id}`, {
        title,
        content,
      });

      setSaveSuccess(true);
      // 成功提示（使用 alert，与项目其他页面一致）
      alert("保存成功");
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      // 失败时：设置 saveError + 失败提示，但绝不清空 title/content
      const errorMsg = e?.message || "保存失败";
      setSaveError(errorMsg);
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // title 输入处理：最多10字符，超出截断
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= 10) {
      setTitle(newValue);
    } else {
      // 超出时截断到10字符
      setTitle(newValue.slice(0, 10));
    }
  };

  // 删除
  async function onDelete() {
    if (!id) return;

    // 二次确认
    const confirmed = window.confirm("确认删除该记事？此操作不可恢复。");
    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      // 调用 DELETE /items/:id
      await apiDelete(`/items/${id}`);

      // 删除成功：显示提示并返回上一页
      alert("删除成功");
      router.back();
    } catch (e: any) {
      // 失败时：显示错误提示，不白屏、不跳转
      const errorMsg = e?.message || "删除失败";
      setDeleteError(errorMsg);
      alert(errorMsg);
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <div style={{ padding: 16 }}>
        <div>无效的笔记 ID</div>
        <button onClick={() => router.back()} style={{ marginTop: 12 }}>
          返回
        </button>
      </div>
    );
  }

  // loading 状态
  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div>加载中…</div>
      </div>
    );
  }

  // loadError 状态：显示错误但不白屏，允许用户返回
  if (loadError) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "red", marginBottom: 12 }}>加载失败：{loadError}</div>
        <button onClick={() => router.back()}>返回</button>
      </div>
    );
  }

  // 正常编辑状态
  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => router.back()}>返回</button>
        <div style={{ fontWeight: 700 }}>笔记详情</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Title</span>
          <span style={{ fontSize: 11 }}>{title.length} / 10</span>
        </div>
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="标题"
          style={{ width: "100%", padding: 8, marginTop: 6 }}
          maxLength={10}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Content</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="内容"
          style={{ width: "100%", padding: 8, marginTop: 6, minHeight: 220 }}
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onSave} disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
        <button 
          onClick={onDelete} 
          disabled={deleting}
          style={{
            backgroundColor: deleting ? "#ccc" : "#dc3545",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: deleting ? "not-allowed" : "pointer",
          }}
        >
          {deleting ? "删除中…" : "删除"}
        </button>
        {saveSuccess && <span style={{ color: "green" }}>保存成功</span>}
        {saveError && <span style={{ color: "red" }}>{saveError}</span>}
        {deleteError && <span style={{ color: "red" }}>{deleteError}</span>}
      </div>
    </div>
  );
}
