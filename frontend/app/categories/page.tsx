"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../lib/api";

interface Folder {
  id: string;
  name: string;
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("piccco_token");
    if (!token) return; // 关键：token 未就绪，不发请求

    apiGet("/folders/list?kind=NOTES")
      .then((resp) => {
        const foldersList = Array.isArray(resp) ? resp : resp.data ?? [];
        setFolders(foldersList);
        setError(null);
      })
      .catch(() => {
        setError("加载失败");
        setFolders([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-container">
      <h2 className="page-title">Categories</h2>
      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && folders.length === 0 && (
        <p className="page-placeholder">暂无分类</p>
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
              }}
            >
              <Link
                href={`/categories/${f.id}`}
                style={{
                  fontSize: "16px",
                  color: "#333",
                  textDecoration: "none",
                }}
              >
                {f.name}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
