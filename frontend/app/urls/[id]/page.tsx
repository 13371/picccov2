"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../../lib/api";
import MoreMenuButton from "@/components/MoreMenuButton";
import BackButton from "../../components/BackButton";
import ConfirmDialog from "../../components/ConfirmDialog";
import AlertDialog from "../../components/AlertDialog";

interface UrlItem {
  id: string;
  title?: string;
  url?: string;
  isStarred?: boolean;
  updatedAt: string;
  folder?: {
    id: string;
    name: string;
  };
}

export default function UrlFolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUrl, setEditingUrl] = useState<UrlItem | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  
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

  // 加载 URLs 列表
  const loadUrls = useCallback(async () => {
    if (!folderId) return;

    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet(
        `/items/list?type=URL&folderId=${encodeURIComponent(folderId)}`
      );
      const urlsList = Array.isArray(resp) ? resp : resp.data ?? [];
      
      // 排序：星标优先置顶，其余按 updatedAt 倒序
      const sortedUrls = [...urlsList].sort((a, b) => {
        const aStarred = a.isStarred ? 1 : 0;
        const bStarred = b.isStarred ? 1 : 0;
        if (aStarred !== bStarred) {
          return bStarred - aStarred; // 星标优先
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      setUrls(sortedUrls);
    } catch (err) {
      console.error("加载失败:", err);
      setError("加载失败");
      setUrls([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  // 初始加载
  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  // 监听页面显示：当页面显示时（包括从其他页面返回），重新加载
  useEffect(() => {
    const handlePageshow = (e: PageTransitionEvent) => {
      if (e.persisted || document.visibilityState === 'visible') {
        if (folderId) {
          loadUrls();
        }
      }
    };

    window.addEventListener('pageshow', handlePageshow);
    return () => {
      window.removeEventListener('pageshow', handlePageshow);
    };
  }, [folderId, loadUrls]);

  // 打开新建弹窗
  const handleOpenCreateModal = () => {
    setTitle("");
    setUrl("");
    setShowCreateModal(true);
    setTimeout(() => {
      urlInputRef.current?.focus();
    }, 100);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (item: UrlItem) => {
    setEditingUrl(item);
    setTitle(item.title || "");
    setUrl(item.url || "");
    setShowEditModal(true);
    setTimeout(() => {
      urlInputRef.current?.focus();
    }, 100);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingUrl(null);
    setTitle("");
    setUrl("");
  };

  // 创建 URL
  const handleCreateUrl = async () => {
    if (!url.trim() || creating) return;

    if (!url.trim()) {
      setAlertDialog({ open: true, message: "URL 不能为空" });
      return;
    }

    try {
      setCreating(true);
      await apiPost("/items", {
        type: "URL",
        title: title.trim() || null,
        url: url.trim(),
        folderId,
      });

      await loadUrls();
      handleCloseModal();
      setAlertDialog({ open: true, message: "创建成功" });
    } catch (err) {
      console.error("创建失败:", err);
      const errorMsg = err instanceof Error ? err.message : "创建失败";
      setAlertDialog({ open: true, message: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  // 编辑 URL
  const handleEditUrl = async () => {
    if (!editingUrl || !url.trim() || saving) return;

    if (!url.trim()) {
      setAlertDialog({ open: true, message: "URL 不能为空" });
      return;
    }

    try {
      setSaving(true);
      await apiPatch(`/items/${editingUrl.id}`, {
        title: title.trim() || null,
        url: url.trim(),
      });

      await loadUrls();
      handleCloseModal();
      setAlertDialog({ open: true, message: "保存成功" });
    } catch (err) {
      console.error("保存失败:", err);
      const errorMsg = err instanceof Error ? err.message : "保存失败";
      setAlertDialog({ open: true, message: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  // 删除 URL
  const handleDeleteUrl = (urlId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: "确认删除该网址？此操作不可恢复。",
      danger: true,
      onConfirm: async () => {
        try {
          setDeletingId(urlId);
          setConfirmDialog({ ...confirmDialog, open: false });
          await apiDelete(`/items/${urlId}`);
          await loadUrls();
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
  const handleToggleStar = async (urlId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiPatch(`/items/${urlId}`, {
        isStarred: !currentStarred,
      });
      await loadUrls();
      setShowMenuId(null);
    } catch (err) {
      console.error("操作失败:", err);
      setAlertDialog({ open: true, message: err instanceof Error ? err.message : "操作失败" });
    }
  };

  // 点击 URL 条目：在新 tab 打开
  const handleUrlClick = (item: UrlItem) => {
    if (selectionMode) return;
    
    if (!item.url || !item.url.trim()) {
      setAlertDialog({ open: true, message: "链接无效" });
      return;
    }
    
    // 规范化 URL
    let normalizedUrl = item.url.trim();
    
    // 如果不以 http:// 或 https:// 开头，则自动补 https://
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = "https://" + normalizedUrl;
    }
    
    // 简单验证：确保 URL 格式基本有效
    try {
      new URL(normalizedUrl);
    } catch {
      setAlertDialog({ open: true, message: "链接无效" });
      return;
    }
    
    // 在新标签页打开
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
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
    if (selectedIds.size === urls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(urls.map(u => u.id)));
    }
  };

  // 切换单个条目选中状态
  const toggleSelect = (urlId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(urlId)) {
      newSelected.delete(urlId);
    } else {
      newSelected.add(urlId);
    }
    setSelectedIds(newSelected);
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
          URL 文件夹
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
            完成
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
              backgroundColor: selectedIds.size === urls.length ? "#28a745" : "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {selectedIds.size === urls.length ? "取消全选" : "全选"}
          </button>
          {selectedIds.size > 0 && (
            <span style={{ marginLeft: "12px", fontSize: "14px", color: "#666" }}>
              已选 {selectedIds.size} 项
            </span>
          )}
        </div>
      )}

      {/* 新建 URL 按钮（非选择模式时显示） */}
      {!selectionMode && (
        <div style={{ marginBottom: "16px" }}>
          <button
            onClick={handleOpenCreateModal}
            disabled={loading}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            新建URL
          </button>
        </div>
      )}

      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && urls.length === 0 && (
        <p className="page-placeholder">暂无 URL</p>
      )}
      {!loading && !error && urls.length > 0 && (
        <div className="placeholder-content" style={{ padding: 0 }}>
          {urls.map((item) => (
            <div
              key={item.id}
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
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
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
                onClick={() => handleUrlClick(item)}
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
                    {item.title || item.url || item.id}
                  </div>
                  {item.isStarred && (
                    <span style={{ color: "#ffc107", fontSize: "16px" }}>★</span>
                  )}
                </div>
                {item.url && (
                  <div style={{
                    fontSize: "12px",
                    color: "#999",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    wordBreak: "break-all",
                  }}>
                    {item.url.length > 50 ? item.url.slice(0, 50) + "..." : item.url}
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
                        setShowMenuId(showMenuId === item.id ? null : item.id);
                      }}
                    />
                    {/* 菜单 */}
                    {showMenuId === item.id && (
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
                          onClick={(e) => handleToggleStar(item.id, item.isStarred || false, e)}
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
                          {item.isStarred ? "取消星标" : "添加星标"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenEditModal(item);
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
                          onClick={(e) => handleDeleteUrl(item.id, e)}
                          disabled={deletingId === item.id}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 16px",
                            textAlign: "left",
                            fontSize: "14px",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: deletingId === item.id ? "not-allowed" : "pointer",
                            color: deletingId === item.id ? "#999" : "#dc3545",
                          }}
                        >
                          {deletingId === item.id ? "删除中…" : "删除"}
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

      {/* 新建 URL 弹窗 */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            if (!creating) {
              handleCloseModal();
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "400px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>新建 URL</h3>
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span>标题（可选）</span>
                <span style={{ fontSize: "11px" }}>{title.length} / 10</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setTitle(value);
                  }
                }}
                placeholder="标题（可选）"
                maxLength={10}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCloseModal();
                  }
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginBottom: "6px",
                }}
              >
                URL <span style={{ color: "red" }}>*</span>
              </div>
              <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="请输入 URL"
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating && url.trim()) {
                    handleCreateUrl();
                  }
                  if (e.key === "Escape") {
                    handleCloseModal();
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseModal}
                disabled={creating}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "#ccc",
                  color: "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: creating ? "not-allowed" : "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateUrl}
                disabled={creating || !url.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: creating ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: creating || !url.trim() ? "not-allowed" : "pointer",
                }}
              >
                {creating ? "创建中…" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑 URL 弹窗 */}
      {showEditModal && editingUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            if (!saving) {
              handleCloseModal();
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "400px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>编辑 URL</h3>
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <span>标题（可选）</span>
                <span style={{ fontSize: "11px" }}>{title.length} / 10</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setTitle(value);
                  }
                }}
                placeholder="标题（可选）"
                maxLength={10}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCloseModal();
                  }
                }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginBottom: "6px",
                }}
              >
                URL <span style={{ color: "red" }}>*</span>
              </div>
              <input
                ref={urlInputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="请输入 URL"
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !saving && url.trim()) {
                    handleEditUrl();
                  }
                  if (e.key === "Escape") {
                    handleCloseModal();
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "#ccc",
                  color: "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleEditUrl}
                disabled={saving || !url.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: saving ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: saving || !url.trim() ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
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
