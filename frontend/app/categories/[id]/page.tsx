"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiDelete, apiPatch, apiFetch } from "../../../lib/api";
import MoreMenuButton from "@/components/MoreMenuButton";
import BackButton from "../../components/BackButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import AlertDialog from "../../components/AlertDialog";

interface Note {
  id: string;
  title?: string;
  content?: string;
  isStarred?: boolean;
  updatedAt: string;
  folder?: {
    id: string;
    isPrivate: boolean;
  };
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPrivateFolder, setIsPrivateFolder] = useState(false);
  
  // 选择模式相关
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  
  // 对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title?: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    open: false,
    message: "",
    onConfirm: async () => {},
  });
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title?: string;
    message: string;
  }>({
    open: false,
    message: "",
  });

  // 加载 notes 列表
  const loadNotes = useCallback(async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet(
        `/items/list?type=NOTE&folderId=${encodeURIComponent(folderId)}`
      );
      const notesList = Array.isArray(resp) ? resp : resp.data ?? resp.items ?? [];
      
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
      
      // 检查是否是隐私文件夹
      if (notesList.length > 0 && notesList[0].folder?.isPrivate) {
        setIsPrivateFolder(true);
      } else {
        try {
          const folderResp = await apiGet(`/folders/${folderId}`);
          if (folderResp.data?.isPrivate || folderResp.isPrivate) {
            setIsPrivateFolder(true);
          }
        } catch {
          // 忽略错误
        }
      }
    } catch (err) {
      console.error("加载失败:", err);
      setError("加载失败");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  // 初始加载和 folderId 变化时加载
  useEffect(() => {
    loadNotes();
    
    // cleanup：离开隐私文件夹时锁回去
    return () => {
      if (isPrivateFolder) {
        localStorage.removeItem("piccco_private_unlocked");
        try {
          apiFetch("/private/lock", {
            method: "POST",
          }).catch(() => {});
        } catch {
          // 忽略错误
        }
      }
    };
  }, [loadNotes, isPrivateFolder]);

  // 监听页面显示：当页面显示时（包括从其他页面返回），重新加载
  useEffect(() => {
    const handlePageshow = (e: PageTransitionEvent) => {
      if (e.persisted || document.visibilityState === 'visible') {
        if (folderId) {
          loadNotes();
        }
      }
    };

    window.addEventListener('pageshow', handlePageshow);
    return () => {
      window.removeEventListener('pageshow', handlePageshow);
    };
  }, [folderId, loadNotes]);

  // 创建新 NOTE
  const createNote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!folderId || creating) return;

    try {
      setCreating(true);
      const resp = await apiPost("/items", {
        type: "NOTE",
        title: "",
        content: "",
        folderId,
      });
      
      const newNoteId = resp.data?.id || resp.id;
      
      if (!newNoteId) {
        throw new Error("创建成功但未返回笔记ID，响应数据：" + JSON.stringify(resp));
      }

      // 跳转到新笔记详情页
      router.push(`/notes/${newNoteId}`);
    } catch (err) {
      console.error("创建失败:", err);
      const errorMsg = err instanceof Error ? err.message : "创建失败";
      setAlertDialog({ open: true, message: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  // 删除 NOTE
  const deleteNote = (noteId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: "确认删除该记事？此操作不可恢复。",
      danger: true,
      onConfirm: async () => {
        try {
          setDeletingId(noteId);
          setConfirmDialog({ ...confirmDialog, open: false });
          await apiDelete(`/items/${noteId}`);
          await loadNotes();
          setAlertDialog({ open: true, message: "删除成功" });
        } catch (err) {
          console.error("删除失败:", err);
          const errorMsg = err instanceof Error ? err.message : "删除失败";
          setAlertDialog({ open: true, message: errorMsg });
        } finally {
          setDeletingId(null);
          setShowMenuId(null);
        }
      },
    });
  };

  // 切换星标
  const handleToggleStar = async (noteId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiPatch(`/items/${noteId}`, {
        isStarred: !currentStarred,
      });
      await loadNotes();
      setShowMenuId(null);
    } catch (err) {
      console.error("操作失败:", err);
      setAlertDialog({ open: true, message: err instanceof Error ? err.message : "操作失败" });
    }
  };

  // 进入选择模式
  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  // 退出选择模式
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map(n => n.id)));
    }
  };

  // 切换单个条目选中状态
  const toggleSelect = (noteId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedIds(newSelected);
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: `确定删除选中的 ${count} 条记事？此操作不可恢复`,
      danger: true,
      onConfirm: async () => {
        const idsToDelete = Array.from(selectedIds);
        const deletePromises = idsToDelete.map(id => apiDelete(`/items/${id}`));

        try {
          setConfirmDialog({ ...confirmDialog, open: false });
          const results = await Promise.allSettled(deletePromises);
          
          // 检查是否有失败的
          const failed = results.filter(r => r.status === 'rejected');
          if (failed.length > 0) {
            setAlertDialog({ open: true, message: "删除失败，请重试" });
            return;
          }

          // 全部成功：乐观更新UI
          const idsToDeleteSet = new Set(idsToDelete);
          setNotes(prevNotes => prevNotes.filter(note => !idsToDeleteSet.has(note.id)));
          setSelectedIds(new Set());
          exitSelectionMode();
          setAlertDialog({ open: true, message: `已删除 ${count} 条` });
        } catch (err) {
          console.error("批量删除失败:", err);
          setAlertDialog({ open: true, message: "删除失败，请重试" });
        }
      },
    });
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
      {/* 顶部：返回按钮 + 标题 + 选择按钮 */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        marginBottom: "16px",
        gap: "12px"
      }}>
        <BackButton />
        <h2 className="page-title" style={{ margin: 0, flex: 1 }}>
          分类详情
        </h2>
        {!selectionMode ? (
          <button
            onClick={enterSelectionMode}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            选择
          </button>
        ) : (
          <button
            onClick={exitSelectionMode}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              backgroundColor: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            取消
          </button>
        )}
      </div>

      {/* 选择模式下的全选按钮 */}
      {selectionMode && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={handleSelectAll}
            style={{
              padding: "6px 12px",
              fontSize: "14px",
              backgroundColor: selectedIds.size === notes.length ? "#28a745" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {selectedIds.size === notes.length ? "取消全选" : "全选"}
          </button>
          <span style={{ marginLeft: "12px", fontSize: "14px", color: "#666" }}>
            已选 {selectedIds.size} 项
          </span>
        </div>
      )}

      {/* 新建 NOTE 按钮（非选择模式时显示） */}
      {!selectionMode && (
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
            {creating ? "创建中…" : "新建记事"}
          </button>
        </div>
      )}

      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && notes.length === 0 && (
        <p className="page-placeholder">暂无内容</p>
      )}
      {!loading && !error && notes.length > 0 && (
        <div className="placeholder-content" style={{ padding: 0 }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                padding: "16px",
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: "#fff",
                minHeight: "80px", // 固定最小高度
                position: "relative",
              }}
            >
              {/* 选择模式：选择框 */}
              {selectionMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(note.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(note.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    marginRight: "12px",
                    marginTop: "2px",
                    cursor: "pointer",
                  }}
                />
              )}

              {/* 内容区域 */}
              <div
                style={{ 
                  flex: 1,
                  cursor: selectionMode ? "default" : "pointer",
                  overflow: "hidden",
                }}
                onClick={() => {
                  if (selectionMode) {
                    // 选择模式下点击卡片切换选中状态
                    toggleSelect(note.id);
                  } else {
                    // 非选择模式下点击卡片打开编辑页
                    router.push(`/notes/${note.id}`);
                  }
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}>
                  <div style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {getTitlePreview(note)}
                  </div>
                  {note.isStarred && (
                    <span style={{ color: "#ffc107", fontSize: "16px" }}>★</span>
                  )}
                </div>
                {note.content && (
                  <div style={{
                    fontSize: "14px",
                    color: "#666",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {note.content}
                  </div>
                )}
              </div>

              {/* 操作按钮（非选择模式） */}
              {!selectionMode && (
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "12px", paddingRight: "12px" }}>
                  <div style={{ position: "relative" }}>
                    <MoreMenuButton
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenuId(showMenuId === note.id ? null : note.id);
                      }}
                    />
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
                          onClick={(e) => deleteNote(note.id, e)}
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
              )}
            </div>
          ))}
        </div>
      )}

      {/* 选择模式下的底部删除按钮 */}
      {selectionMode && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "16px",
            backgroundColor: "#fff",
            borderTop: "1px solid #e0e0e0",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
            zIndex: 10,
          }}
        >
          <button
            onClick={handleBatchDelete}
            disabled={selectedIds.size === 0}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
              backgroundColor: selectedIds.size === 0 ? "#ccc" : "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            删除
          </button>
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

      {/* 为底部删除按钮留出空间 */}
      {selectionMode && <div style={{ height: "80px" }} />}

      {/* 确认对话框 */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        danger={confirmDialog.danger}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
      />

      {/* 提示对话框 */}
      <AlertDialog
        open={alertDialog.open}
        title={alertDialog.title}
        message={alertDialog.message}
        onClose={() => setAlertDialog({ ...alertDialog, open: false })}
      />
    </div>
  );
}
