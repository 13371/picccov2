'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';

export default function MePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="page-container">
      <h2 className="page-title">我的</h2>
      <p className="page-placeholder">
        这里是我的页面占位（后续展示邮箱、信息中心/设置/账号与安全/帮助与反馈/关于）
      </p>
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

