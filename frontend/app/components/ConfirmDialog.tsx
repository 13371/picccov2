"use client";

import { useEffect, useRef } from "react";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = "提示",
  message,
  confirmText = "确定",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // 打开时 focus 到确定按钮
  useEffect(() => {
    if (open && confirmButtonRef.current) {
      // 延迟一点确保 DOM 已渲染
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal open={open} onClose={onCancel} closeOnBackdrop={true}>
      <div>
        {/* 标题 */}
        <h3
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#333",
            margin: "0 0 16px 0",
            lineHeight: "1.5",
          }}
        >
          {title}
        </h3>

        {/* 正文 */}
        <div
          style={{
            fontSize: "15px",
            color: "#666",
            lineHeight: "1.6",
            marginBottom: "24px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </div>

        {/* 按钮区 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              backgroundColor: "#f5f5f5",
              color: "#333",
              border: "1px solid #e0e0e0",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e8e8e8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
            }}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              backgroundColor: danger ? "#dc3545" : "#007aff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = danger ? "#c82333" : "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = danger ? "#dc3545" : "#007aff";
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

