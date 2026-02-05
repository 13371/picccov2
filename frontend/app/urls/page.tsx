"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost, apiPatch, apiDelete } from "../../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import AlertDialog from "../components/AlertDialog";

interface Folder {
  id: string;
  name: string;
  isStarred?: boolean;
}

export default function UrlsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showMenuId, setShowMenuId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
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

  // 加载文件夹列表
  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await apiGet("/folders/list?kind=URLS");
      const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
      
      // 排序：星标优先置顶，其余按 updatedAt 倒序（但后端可能没返回 updatedAt，先按星标排序）
      const sortedFolders = [...foldersList].sort((a, b) => {
        const aStarred = a.isStarred ? 1 : 0;
        const bStarred = b.isStarred ? 1 : 0;
        return bStarred - aStarred; // 星标优先
      });
      
      setFolders(sortedFolders);
      setError(null);
      return sortedFolders;
    } catch (err) {
      console.error("加载失败:", err);
      setError("加载失败");
      setFolders([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 初始化：检查是否需要创建默认文件夹
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasInitialized) return;

    const token = localStorage.getItem("piccco_token");
    if (!token) return;

    const initialize = async () => {
      const foldersList = await loadFolders();
      
      // 如果没有任何 URL 文件夹，创建默认 3 个
      if (foldersList.length === 0) {
        const defaultFolders = ["常用", "电商", "工具"];
        try {
          for (const name of defaultFolders) {
            await apiPost("/folders", {
              name,
              kind: "URLS",
            });
          }
          // 创建完成后重新加载列表
          await loadFolders();
        } catch (err) {
          console.error("创建默认文件夹失败:", err);
          setError("创建默认文件夹失败");
        }
      }
      
      setHasInitialized(true);
    };

    initialize();
  }, [hasInitialized]);

  // 创建新文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || creating) return;

    if (newFolderName.length > 10) {
      setAlertDialog({ open: true, message: "文件夹名称最多 10 个字符" });
      return;
    }

    try {
      setCreating(true);
      await apiPost("/folders", {
        name: newFolderName.trim(),
        kind: "URLS",
      });
      
      await loadFolders();
      setShowCreateModal(false);
      setNewFolderName("");
      setAlertDialog({ open: true, message: "创建成功" });
    } catch (err) {
      console.error("创建失败:", err);
      const errorMsg = err instanceof Error ? err.message : "创建失败";
      setAlertDialog({ open: true, message: errorMsg });
    } finally {
      setCreating(false);
    }
  };

  // 切换星标
  const handleToggleStar = async (folderId: string, currentStarred: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await apiPatch(`/folders/${folderId}`, {
        isStarred: !currentStarred,
      });
      await loadFolders();
      setShowMenuId(null);
    } catch (err) {
      console.error("操作失败:", err);
      setAlertDialog({ open: true, message: err instanceof Error ? err.message : "操作失败" });
    }
  };

  // 打开重命名弹窗
  const handleOpenRename = (folder: Folder) => {
    setShowRenameModal(folder.id);
    setRenameValue(folder.name);
  };

  // 重命名
  const handleRename = async () => {
    if (!showRenameModal || !renameValue.trim() || renaming) return;

    if (renameValue.length > 10) {
      setAlertDialog({ open: true, message: "文件夹名称最多 10 个字符" });
      return;
    }

    try {
      setRenaming(true);
      await apiPatch(`/folders/${showRenameModal}`, {
        name: renameValue.trim(),
      });
      await loadFolders();
      setShowRenameModal(null);
      setRenameValue("");
      setShowMenuId(null);
      setAlertDialog({ open: true, message: "重命名成功" });
    } catch (err) {
      console.error("重命名失败:", err);
      setAlertDialog({ open: true, message: err instanceof Error ? err.message : "重命名失败" });
    } finally {
      setRenaming(false);
    }
  };

  // 删除文件夹
  const handleDelete = (folderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmDialog({
      open: true,
      title: "确认删除",
      message: "确认删除该文件夹？此操作不可恢复。",
      danger: true,
      onConfirm: async () => {
        try {
          setDeletingId(folderId);
          setConfirmDialog({ ...confirmDialog, open: false });
          await apiDelete(`/folders/${folderId}`);
          await loadFolders();
          setAlertDialog({ open: true, message: "删除成功" });
        } catch (err) {
          console.error("删除失败:", err);
          setAlertDialog({ open: true, message: err instanceof Error ? err.message : "删除失败" });
        } finally {
          setDeletingId(null);
          setShowMenuId(null);
        }
      },
    });
  };

  return (
    <div className="page-container">
      <h2 className="page-title">网址</h2>
      
      {/* 新建文件夹按钮 */}
      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "8px 16px",
            fontSize: "14px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          新建文件夹
        </button>
      </div>

      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && folders.length === 0 && (
        <p className="page-placeholder">暂无文件夹</p>
      )}
      {!loading && !error && folders.length > 0 && (
        <div className="placeholder-content">
          {folders.map((f) => (
            <div
              key={f.id}
              style={{
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Link
                href={`/urls/${f.id}`}
                style={{
                  fontSize: "16px",
                  color: "#333",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flex: 1,
                }}
              >
                {f.name}
                {f.isStarred && (
                  <span style={{ color: "#ffc107", fontSize: "16px" }}>★</span>
                )}
              </Link>
              <div style={{ position: "relative" }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMenuId(showMenuId === f.id ? null : f.id);
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
                {showMenuId === f.id && (
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
                      onClick={(e) => handleToggleStar(f.id, f.isStarred || false, e)}
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
                      {f.isStarred ? "取消星标" : "添加星标"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenRename(f);
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
                      重命名
                    </button>
                    <button
                      onClick={(e) => handleDelete(f.id, e)}
                      disabled={deletingId === f.id}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 16px",
                        textAlign: "left",
                        fontSize: "14px",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: deletingId === f.id ? "not-allowed" : "pointer",
                        color: deletingId === f.id ? "#999" : "#dc3545",
                      }}
                    >
                      {deletingId === f.id ? "删除中…" : "删除"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建文件夹弹窗 */}
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
              setShowCreateModal(false);
              setNewFolderName("");
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>新建文件夹</h3>
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
                <span>文件夹名称</span>
                <span style={{ fontSize: "11px" }}>
                  {newFolderName.length} / 10
                </span>
              </div>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setNewFolderName(value);
                  }
                }}
                placeholder="请输入文件夹名称"
                maxLength={10}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    handleCreateFolder();
                  }
                  if (e.key === "Escape") {
                    setShowCreateModal(false);
                    setNewFolderName("");
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewFolderName("");
                }}
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
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: creating ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: creating || !newFolderName.trim() ? "not-allowed" : "pointer",
                }}
              >
                {creating ? "创建中…" : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名弹窗 */}
      {showRenameModal && (
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
            if (!renaming) {
              setShowRenameModal(null);
              setRenameValue("");
            }
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: "24px",
              borderRadius: "8px",
              minWidth: "300px",
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>重命名文件夹</h3>
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
                <span>文件夹名称</span>
                <span style={{ fontSize: "11px" }}>
                  {renameValue.length} / 10
                </span>
              </div>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 10) {
                    setRenameValue(value);
                  }
                }}
                placeholder="请输入文件夹名称"
                maxLength={10}
                autoFocus
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: "14px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !renaming && renameValue.trim()) {
                    handleRename();
                  }
                  if (e.key === "Escape") {
                    setShowRenameModal(null);
                    setRenameValue("");
                  }
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowRenameModal(null);
                  setRenameValue("");
                }}
                disabled={renaming}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: "#ccc",
                  color: "#333",
                  border: "none",
                  borderRadius: "4px",
                  cursor: renaming ? "not-allowed" : "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleRename}
                disabled={renaming || !renameValue.trim()}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  backgroundColor: renaming ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: renaming || !renameValue.trim() ? "not-allowed" : "pointer",
                }}
              >
                {renaming ? "重命名中…" : "确定"}
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
