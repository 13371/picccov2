"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "../lib/auth";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface Note {
  id: string;
  title?: string;
  content?: string;
  updatedAt: string;
  isStarred?: boolean;
}

// 格式化时间：1小时前、2天前等
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "刚刚";
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 30) {
    return `${diffDays}天前`;
  } else {
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}个月前`;
    } else {
      const diffYears = Math.floor(diffDays / 365);
      return `${diffYears}年前`;
    }
  }
}

export default function HomePage() {
  const router = useRouter();

  // 大白框相关状态
  const [draftContent, setDraftContent] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isComposingRef = useRef(false);

  // 列表相关状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);

  // 检查登录状态
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  // 页面加载时回填草稿内容（从localStorage读取draftId）
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const savedDraftId = localStorage.getItem("piccco_home_draft_id");
        if (!savedDraftId) {
          return;
        }

        // 尝试获取草稿内容
        try {
          const resp = await apiGet(`/items/${savedDraftId}`);
          const item = resp?.data || resp;
          
          // 只允许回填 isDraft=true 的草稿
          if (item && item.isDraft === true && item.content) {
            setDraftId(savedDraftId);
            setDraftContent(item.content || "");
          } else {
            // 如果item不存在、不是草稿或没有content，清空localStorage
            // 说明id被用户转正了（或错误），应清掉避免污染
            localStorage.removeItem("piccco_home_draft_id");
            setDraftId(null);
            setDraftContent("");
          }
        } catch (err: any) {
          // 404/403/401：草稿不存在或无权访问，清除localStorage
          console.warn("草稿加载失败，清除localStorage:", err);
          localStorage.removeItem("piccco_home_draft_id");
          setDraftId(null);
          setDraftContent("");
        }
      } catch (err) {
        console.error("加载草稿失败:", err);
      }
    };

    loadDraft();
  }, []);

  // 加载列表：获取全部非隐私NOTE（包括未分类）
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // 使用 includeUnfiled=true 获取未分类 + 所有非隐私NOTE
      const resp = await apiGet("/items/list?type=NOTE&includeUnfiled=true");
      const notesList = Array.isArray(resp) ? resp : resp.data ?? [];
      
      // 排序：星标优先置顶，其余按 updatedAt 倒序
      const sortedNotes = [...notesList].sort((a, b) => {
        const aStarred = a.isStarred ? 1 : 0;
        const bStarred = b.isStarred ? 1 : 0;
        if (aStarred !== bStarred) {
          return bStarred - aStarred; // 星标优先
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      setNotes(sortedNotes);
    } catch (err: any) {
      console.error("加载失败:", err);
      setError(err?.message || "加载失败");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载列表
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // 自动保存函数（防抖500ms）
  const autoSave = useCallback(async (content: string, currentDraftId: string | null) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 如果内容为空，不保存（但不清空draftId，避免误删）
    if (!content.trim()) {
      return;
    }

    // 设置新的防抖定时器（500ms）
    debounceTimerRef.current = setTimeout(async () => {
      // 再次检查 IME 状态
      if (isComposingRef.current) {
        return;
      }

      try {
        setSaving(true);
        setSaveStatus("saving");

        // 如果state中没有draftId，尝试从localStorage读取（防止state和localStorage不同步）
        let effectiveDraftId = currentDraftId;
        if (!effectiveDraftId) {
          const savedDraftId = localStorage.getItem("piccco_home_draft_id");
          if (savedDraftId) {
            effectiveDraftId = savedDraftId;
            setDraftId(savedDraftId);
          }
        }

        if (!effectiveDraftId) {
          // 首次保存：POST /items（保存为草稿）
          const resp = await apiPost("/items", {
            type: "NOTE",
            title: "",
            content: content.trim(),
            folderId: null,
            isDraft: true,
          });

          const newId = resp?.data?.id || resp?.id;
          if (newId) {
            setDraftId(newId);
            // 持久化draftId到localStorage
            localStorage.setItem("piccco_home_draft_id", newId);
            // 保存成功后刷新列表
            await loadNotes();
          }
        } else {
          // 后续保存：PATCH /items/:id
          await apiPatch(`/items/${effectiveDraftId}`, {
            content: content.trim(),
          });
          // 保存成功后刷新列表
          await loadNotes();
        }

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err: any) {
        console.error("保存失败:", err);
        setSaveStatus("error");
        alert(err?.message || "保存失败");
      } finally {
        setSaving(false);
      }
    }, 500);
  }, [loadNotes]);

  // 监听 draftContent 变化，触发自动保存
  useEffect(() => {
    // 如果正在输入中文（IME composition），不触发保存
    if (isComposingRef.current) {
      return;
    }

    autoSave(draftContent, draftId);

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [draftContent, draftId, autoSave]);

  // IME 输入开始
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  // IME 输入结束
  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    // IME 结束后，触发一次保存
    if (draftContent.trim()) {
      autoSave(draftContent, draftId);
    }
  };

  // 删除 NOTE
  const handleDelete = async (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 二次确认
    const confirmed = window.confirm("确认删除该记事？此操作不可恢复。");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(noteId);
      await apiDelete(`/items/${noteId}`);

      // 如果删除的是当前草稿，清空草稿状态和localStorage
      if (noteId === draftId) {
        setDraftId(null);
        setDraftContent("");
        localStorage.removeItem("piccco_home_draft_id");
      }

      // 删除成功后刷新列表
      await loadNotes();
      alert("删除成功");
    } catch (err: any) {
      console.error("删除失败:", err);
      alert(err?.message || "删除失败");
    } finally {
      setDeletingId(null);
      setShowMenuId(null);
    }
  };

  // 切换星标
  const handleToggleStar = async (noteId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiPatch(`/items/${noteId}`, {
        isStarred: !currentStarred,
      });
      // 刷新列表
      await loadNotes();
      setShowMenuId(null);
    } catch (err: any) {
      console.error("操作失败:", err);
      alert(err?.message || "操作失败");
    }
  };

  // 获取保存状态文本
  const getSaveStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "保存中…";
      case "saved":
        return "已保存";
      case "error":
        return "保存失败";
      default:
        return "";
    }
  };

  // 获取标题预览（无标题时显示content前N字）
  const getTitlePreview = (note: Note): string => {
    if (note.title && note.title.trim()) {
      return note.title;
    }
    if (note.content) {
      return note.content.length > 20 ? note.content.slice(0, 20) + "..." : note.content;
    }
    return "（无标题）";
  };

  return (
    <div className="page-container">
      {/* 大白框 */}
      <div style={{ marginBottom: "24px", position: "relative" }}>
        <textarea
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="临时记录..."
          style={{
            width: "100%",
            height: "120px",
            paddingTop: "28px",
            paddingRight: "56px",
            paddingBottom: "16px",
            paddingLeft: "16px",
            fontSize: "16px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: "1.6",
            overflowY: "auto",
          }}
        />
        {/* 保存状态提示 - 位于textarea内部右上角 */}
        {saveStatus !== "idle" && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              fontSize: "12px",
              color:
                saveStatus === "saving"
                  ? "#6b7280"
                  : saveStatus === "saved"
                  ? "#16a34a"
                  : "#dc3545",
              pointerEvents: "none",
            }}
          >
            {getSaveStatusText()}
          </div>
        )}
      </div>

      {/* 全部记事列表 */}
      <h2 className="page-title" style={{ marginBottom: "16px" }}>
        全部记事
      </h2>

      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder" style={{ color: "red" }}>{error}</p>}
      {!loading && !error && notes.length === 0 && (
        <p className="page-placeholder">暂无记事</p>
      )}

      {!loading && !error && notes.length > 0 && (
        <div className="placeholder-content" style={{ padding: 0 }}>
          {notes.map((note) => (
            <div
              key={note.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px",
                  borderBottom: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  minHeight: "80px", // 固定最小高度
                  position: "relative",
                }}
            >
              {/* 左侧内容 */}
              <div
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => router.push(`/notes/${note.id}`)}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#333",
                      lineHeight: "1.5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {getTitlePreview(note)}
                  </div>
                  {note.isStarred && (
                    <span style={{ color: "#ffc107", fontSize: "16px" }}>★</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#999",
                  }}
                >
                  {formatTimeAgo(note.updatedAt)}
                </div>
              </div>

              {/* 右侧操作按钮 */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => router.push(`/notes/${note.id}`)}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  编辑
                </button>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenuId(showMenuId === note.id ? null : note.id);
                    }}
                    style={{
                      padding: "6px 8px",
                      fontSize: "16px",
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#666",
                    }}
                  >
                    ⋮
                  </button>
                  {/* 菜单 */}
                  {showMenuId === note.id && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: "4px",
                        backgroundColor: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: "4px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        zIndex: 10,
                        minWidth: "120px",
                      }}
                    >
                      <button
                        onClick={(e) => handleToggleStar(note.id, note.isStarred || false, e)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 16px",
                          textAlign: "left",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#333",
                        }}
                      >
                        {note.isStarred ? "取消星标" : "添加星标"}
                      </button>
                      <button
                        onClick={() => {
                          router.push(`/notes/${note.id}`);
                          setShowMenuId(null);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 16px",
                          textAlign: "left",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#333",
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={(e) => handleDelete(note.id, e)}
                        disabled={deletingId === note.id}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "8px 16px",
                          textAlign: "left",
                          fontSize: "14px",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: deletingId === note.id ? "not-allowed" : "pointer",
                          color: deletingId === note.id ? "#999" : "#dc3545",
                        }}
                      >
                        {deletingId === note.id ? "删除中…" : "删除"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 点击外部关闭菜单 */}
      {showMenuId && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 5,
          }}
          onClick={() => setShowMenuId(null)}
        />
      )}
    </div>
  );
}
