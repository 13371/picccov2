'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="page-container">
      <h2 className="page-title">首页</h2>
      <p className="page-placeholder">这里是首页内容占位（后续做大白框+列表）</p>
      <div className="placeholder-content">
        <p>内容区域可滚动</p>
        <p>Header 和 TabBar 固定不动</p>
        {Array.from({ length: 20 }).map((_, i) => (
          <p key={i}>占位内容 {i + 1}</p>
        ))}
      </div>
    </div>
  );
}

