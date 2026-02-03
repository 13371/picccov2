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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        setSaveError(null);
        setSaveSuccess(false);

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
        if (!cancelled) {
          setLoadError(e?.message || "加载失败，请检查网络连接或稍后重试");
        }
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
      setSaveError(null);
      setSaveSuccess(false);

      // 关键：必须命中 PATCH /items/:id
      await apiPatch(`/items/${id}`, {
        title,
        content,
      });

      setSaveSuccess(true);
      // 3秒后自动隐藏成功提示
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      // 保存失败：不清空用户输入，只显示错误提示
      setSaveError(e?.message || "保存失败，请稍后重试");
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
    return (
      <div style={{ padding: 16 }}>
        <div>加载中...</div>
      </div>
    );
  }

  // GET 失败：显示明确错误提示
  if (loadError) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => router.back()}>返回</button>
          <div style={{ fontWeight: 700 }}>笔记详情</div>
        </div>
        <div style={{ padding: 16, backgroundColor: "#fee", border: "1px solid #fcc", borderRadius: 4 }}>
          <div style={{ color: "#c00", fontWeight: 500, marginBottom: 8 }}>加载失败</div>
          <div style={{ color: "#666", fontSize: 14, marginBottom: 12 }}>{loadError}</div>
          <button
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              // 重新触发加载
              const fetchData = async () => {
                try {
                  const res = await apiGet(`/items/${id}`);
                  const note: Note = (res && (res.data ?? res.item ?? res)) as Note;
                  setTitle((note?.title ?? "").toString());
                  setContent((note?.content ?? "").toString());
                  setLoadError(null);
                } catch (e: any) {
                  setLoadError(e?.message || "加载失败，请检查网络连接或稍后重试");
                } finally {
                  setLoading(false);
                }
              };
              fetchData();
            }}
            style={{ padding: "6px 12px", backgroundColor: "#007bff", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => router.back()}>返回</button>
        <div style={{ fontWeight: 700 }}>笔记详情</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, opacity: 0.7 }}>
          <span>Title</span>
          <span style={{ fontSize: 11 }}>{title.length} / 10</span>
        </div>
        <input
          value={title}
          onChange={(e) => {
            const newValue = e.target.value;
            // 最多 10 字符
            if (newValue.length <= 10) {
              setTitle(newValue);
            }
          }}
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

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
          <button onClick={onSave} disabled={saving} style={{ padding: "8px 16px" }}>
            {saving ? "保存中..." : "保存"}
          </button>
          {saveSuccess && (
            <span style={{ color: "green", fontSize: 14, fontWeight: 500 }}>✓ 保存成功</span>
          )}
          {saveError && (
            <span style={{ color: "red", fontSize: 14 }}>✗ {saveError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
