"use client";

import Modal from "./Modal";

interface AlertDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  onClose: () => void;
}

export default function AlertDialog({
  open,
  title = "提示",
  message,
  confirmText = "确定",
  onClose,
}: AlertDialogProps) {
  return (
    <Modal open={open} onClose={onClose} closeOnBackdrop={true}>
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
            onClick={onClose}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              backgroundColor: "#007aff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#007aff";
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

