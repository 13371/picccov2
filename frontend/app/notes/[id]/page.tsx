"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setOkMsg(null);

        // 关键：必须命中 GET /items/:id
        const res = await apiGet(`/items/${id}`);

        // 兼容两种常见返回：{success,data} 或直接返回对象
        const note: Note =
          (res && (res.data ?? res.item ?? res)) as Note;

        const t = (note?.title ?? "").toString();
        const c = (note?.content ?? "").toString();

        if (!cancelled) {
          setTitle(t);
          setContent(c);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSave() {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      setOkMsg(null);

      // 关键：必须命中 PATCH /items/:id
      await apiPatch(`/items/${id}`, {
        title,
        content,
      });

      setOkMsg("保存成功");
      setTimeout(() => setOkMsg(null), 1200);
    } catch (e: any) {
      setError(e?.message || "保存失败");
    } finally {
      setSaving(false);
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

  if (loading) {
    return <div style={{ padding: 16 }}>加载中...</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => router.back()}>返回</button>
        <div style={{ fontWeight: 700 }}>笔记详情</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题"
          style={{ width: "100%", padding: 8, marginTop: 6 }}
          maxLength={50}
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

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </button>
        {okMsg ? <span style={{ color: "green" }}>{okMsg}</span> : null}
        {error ? <span style={{ color: "red" }}>{error}</span> : null}
      </div>
    </div>
  );
}
