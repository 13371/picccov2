'use client';

import React from 'react';

interface MoreMenuButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-label'?: string;
}

export default function MoreMenuButton({ onClick, 'aria-label': ariaLabel = '更多' }: MoreMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        minWidth: '40px',
        minHeight: '40px',
        padding: '8px 10px',
        fontSize: '22px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        color: '#666',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.backgroundColor = '#e0e0e0';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.backgroundColor = '#f0f0f0';
      }}
    >
      ⋮
    </button>
  );
}

