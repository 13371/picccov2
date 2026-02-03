"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/api";

interface SearchResult {
  id: string;
  title?: string;
  content?: string;
  type: string;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 从 URL query 恢复初始关键词
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMountRef = useRef(true);

  // 防抖搜索函数（使用 AbortController 取消上一次请求）
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    // 取消上一次请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setSearching(true);
      setError(null);

      // 调用搜索接口：GET /search?q=xxx&type=NOTE
      // 传递 AbortSignal 以支持请求取消
      const res = await apiGet(`/search?q=${encodeURIComponent(query.trim())}&type=NOTE`, abortController.signal);

      // 检查是否被取消
      if (abortController.signal.aborted) {
        return;
      }

      // 后端返回格式：{ success: true, data: [...] }
      const items = Array.isArray(res) ? res : res?.data ?? [];
      setResults(items);
    } catch (e: any) {
      // 如果请求被取消，不更新错误状态
      if (abortController.signal.aborted || e.name === "AbortError") {
        return;
      }
      const errorMsg = e?.message || "搜索失败";
      setError(errorMsg);
      setResults([]);
    } finally {
      // 只有当前请求才更新 searching 状态
      if (!abortController.signal.aborted) {
        setSearching(false);
      }
    }
  }, []);

  // 从 URL query 恢复关键词（仅在初始加载时）
  useEffect(() => {
    if (!isInitialMountRef.current) return;
    
    const urlQ = searchParams.get("q");
    if (urlQ) {
      setQ(urlQ);
      performSearch(urlQ);
    }
    isInitialMountRef.current = false;
  }, [searchParams, performSearch]);

  // 监听 q 变化，用防抖触发搜索请求（不更新 URL）
  useEffect(() => {
    // 如果正在输入中文（IME composition），直接返回，不发请求
    if (isComposing) {
      return;
    }

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 如果输入为空，立即清空结果
    if (!q || q.trim().length < 1) {
      setResults([]);
      setError(null);
      return;
    }

    // 跳过初始加载时的防抖（因为已经在上面处理了）
    if (isInitialMountRef.current) {
      return;
    }

    // 设置新的防抖定时器（300ms）
    debounceTimerRef.current = setTimeout(() => {
      // 再次检查 IME 状态，避免在 composition 期间触发
      if (!isComposing) {
        performSearch(q);
      }
    }, 300);

    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [q, performSearch, isComposing]);

  // 处理输入变化（只更新本地 state，不更新 URL）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQ(value);
    // 注意：这里不调用 router.replace，避免打断输入法
  };

  // IME 输入开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // IME 输入结束
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    // IME 结束后，可以触发一次搜索（可选）
    const value = e.currentTarget.value;
    if (value && value.trim().length >= 1) {
      // 清除防抖定时器，立即触发搜索
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // 延迟一小段时间再触发，确保 IME 状态已更新
      setTimeout(() => {
        performSearch(value);
      }, 50);
    }
  };

  // 处理 Enter 键（立即搜索并同步 URL）
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 只允许 Enter 键触发提交搜索/更新 URL
    // Space、Tab、方向键等一律不得触发 router.replace/push 或搜索提交
    if (e.key !== "Enter") {
      return;
    }

    // 如果当前处于中文输入法 composing（isComposing=true），Enter 也不要触发提交（避免再次打断）
    if (isComposing) {
      return;
    }

    // 阻止默认行为（避免可能的 form 提交等）
    e.preventDefault();

    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const query = q.trim();
    if (query.length >= 1) {
      // 仅在 Enter 时更新 URL（使用 scroll: false 避免滚动）
      router.replace(`/search?q=${encodeURIComponent(query)}&type=NOTE`, { scroll: false });
      performSearch(query);
    }
  };

  // 点击结果跳转
  const handleResultClick = (id: string) => {
    router.push(`/notes/${id}`);
  };

  // 截取 content 前 30 字
  const getContentPreview = (content?: string): string => {
    if (!content) return "";
    return content.length > 30 ? content.slice(0, 30) + "..." : content;
  };

  return (
    <div className="page-container">
      <h2 className="page-title">搜索</h2>

      {/* 搜索输入框 */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={q}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="输入关键词搜索笔记..."
          disabled={searching}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            outline: "none",
          }}
        />
      </div>

      {/* 搜索中状态 */}
      {searching && (
        <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
          搜索中…
        </div>
      )}

      {/* 错误提示 */}
      {error && !searching && (
        <div style={{ padding: "16px", color: "red", background: "#fff", borderRadius: "8px", marginBottom: 16 }}>
          错误：{error}
        </div>
      )}

      {/* 结果列表 */}
      {!searching && !error && q.trim().length >= 1 && results.length === 0 && (
        <div style={{ padding: "16px", textAlign: "center", color: "#666" }}>
          无结果
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="placeholder-content">
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleResultClick(item.id)}
              style={{
                padding: "12px",
                marginBottom: "12px",
                borderBottom: "1px solid #e0e0e0",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f5f5f5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: "4px",
                }}
              >
                {item.title || "（无标题）"}
              </div>
              {item.content && (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    lineHeight: 1.5,
                  }}
                >
                  {getContentPreview(item.content)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 初始状态提示 */}
      {!searching && !error && q.trim().length === 0 && (
        <div style={{ padding: "16px", textAlign: "center", color: "#999" }}>
          请输入关键词搜索笔记
        </div>
      )}
    </div>
  );
}

