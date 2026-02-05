"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiDelete } from "../../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import AlertDialog from "../components/AlertDialog";

interface Folder {
  id: string;
  name: string;
  isStarred?: boolean;
  isPrivate?: boolean;
}

interface PrivateFolderMeta {
  id: string;
  name: string;
  isPrivate: boolean;
  kind: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [privateFolder, setPrivateFolder] = useState<PrivateFolderMeta | null>(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("piccco_token");
    if (!token) return;

    // 先请求隐私文件夹元信息
    const fetchPrivateMeta = apiGet("/folders/private-meta")
      .then((resp) => {
        const data = resp.data;
        if (data) {
          setPrivateFolder(data);
        } else {
          setPrivateFolder(null);
        }
      })
      .catch(() => {
        setPrivateFolder(null);
      });

    // 再请求普通文件夹列表
    const fetchPublicFolders = apiGet("/folders/list?kind=NOTES")
      .then((resp) => {
        const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
        
        // 排序：隐私文件夹置顶，然后星标优先，其余按 updatedAt 倒序（但后端可能没返回 updatedAt，先按星标排序）
        const sortedFolders = [...foldersList].sort((a, b) => {
          const aStarred = a.isStarred ? 1 : 0;
          const bStarred = b.isStarred ? 1 : 0;
          return bStarred - aStarred; // 星标优先
        });
        
        setFolders(sortedFolders);
        setError(null);
      })
      .catch(() => {
        setError("加载失败");
        setFolders([]);
      });

    Promise.all([fetchPrivateMeta, fetchPublicFolders]).finally(() => {
      setLoading(false);
    });
  }, []);

  const handlePrivateClick = async () => {
    if (!privateFolder) return;

    try {
      const statusResp = await apiGet("/private/status");
      if (statusResp.success && statusResp.data) {
        const { hasPassword, unlocked } = statusResp.data;
        
        if (!hasPassword || !unlocked) {
          router.push(`/unlock?next=/categories/${privateFolder.id}`);
        } else {
          router.push(`/categories/${privateFolder.id}`);
        }
      } else {
        router.push(`/unlock?next=/categories/${privateFolder.id}`);
      }
    } catch (err) {
      router.push(`/unlock?next=/categories/${privateFolder.id}`);
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
      // 刷新列表
      const resp = await apiGet("/folders/list?kind=NOTES");
      const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
      const sortedFolders = [...foldersList].sort((a, b) => {
        const aStarred = a.isStarred ? 1 : 0;
        const bStarred = b.isStarred ? 1 : 0;
        return bStarred - aStarred;
      });
      setFolders(sortedFolders);
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
      // 刷新列表
      const resp = await apiGet("/folders/list?kind=NOTES");
      const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
      const sortedFolders = [...foldersList].sort((a, b) => {
        const aStarred = a.isStarred ? 1 : 0;
        const bStarred = b.isStarred ? 1 : 0;
        return bStarred - aStarred;
      });
      setFolders(sortedFolders);
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
          // 刷新列表
          const resp = await apiGet("/folders/list?kind=NOTES");
          const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
          const sortedFolders = [...foldersList].sort((a, b) => {
            const aStarred = a.isStarred ? 1 : 0;
            const bStarred = b.isStarred ? 1 : 0;
            return bStarred - aStarred;
          });
          setFolders(sortedFolders);
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
      <h2 className="page-title">分类</h2>
      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && (
        <div className="placeholder-content">
          {/* 隐私入口（置顶显示，无菜单） */}
          {privateFolder && (
            <div
              style={{
                marginBottom: "16px",
                paddingBottom: "16px",
                borderBottom: "1px solid #e0e0e0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onClick={handlePrivateClick}
            >
              <div
                style={{
                  fontSize: "16px",
                  color: "#333",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                隐私
              </div>
            </div>
          )}

          {/* 普通文件夹列表 */}
          {folders.length === 0 && !privateFolder && (
            <p className="page-placeholder">暂无分类</p>
          )}
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
                href={`/categories/${f.id}`}
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
