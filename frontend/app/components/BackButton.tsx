'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface BackButtonProps {
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function BackButton({ onClick, className, ariaLabel = '返回' }: BackButtonProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.back();
    }
  };

  const baseStyle: React.CSSProperties = {
    padding: "8px 14px",
    fontSize: "14px",
    backgroundColor: isActive ? "#4b5563" : isHovered ? "#5b6573" : "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 500,
    transition: "background-color 0.2s",
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={baseStyle}
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <span
        style={{
          fontSize: "18px",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        ‹
      </span>
      <span>返回</span>
    </button>
  );
}

