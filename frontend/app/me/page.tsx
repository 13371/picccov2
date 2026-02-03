'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../lib/auth';
import { apiGet } from '../../lib/api';

export default function MePage() {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    // 调用后端接口校准解锁状态
    const syncUnlockStatus = async () => {
      try {
        const response = await apiGet('/private/status');
        if (response.success && response.data) {
          const { unlocked } = response.data;
          
          // 根据后端真实状态校准 localStorage
          if (unlocked) {
            localStorage.setItem('piccco_private_unlocked', '1');
            setIsUnlocked(true);
          } else {
            localStorage.removeItem('piccco_private_unlocked');
            setIsUnlocked(false);
          }
        }
      } catch (err) {
        // 如果接口失败，使用 localStorage 的缓存值
        const unlocked = localStorage.getItem('piccco_private_unlocked') === '1';
        setIsUnlocked(unlocked);
      } finally {
        setLoading(false);
      }
    };

    syncUnlockStatus();
  }, [router]);

  const handleLock = () => {
    localStorage.removeItem('piccco_private_unlocked');
    setIsUnlocked(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('piccco_token');
    localStorage.removeItem('piccco_private_unlocked');
    router.replace('/login');
  };

  return (
    <div className="page-container">
      <h2 className="page-title">我的</h2>
      <div style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ marginBottom: '20px' }}>
            <p>加载中...</p>
          </div>
        ) : isUnlocked ? (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '12px' }}>隐私状态：已解锁</p>
            <button
              onClick={handleLock}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              点击锁定
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <p>隐私状态：未解锁</p>
          </div>
        )}
      </div>

      {/* 账号与安全入口 */}
      <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', marginTop: '20px' }}>
        <Link
          href="/account-security"
          style={{
            display: 'block',
            padding: '12px 16px',
            fontSize: '16px',
            color: '#333',
            textDecoration: 'none',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e9ecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
          }}
        >
          账号与安全
        </Link>
      </div>

      {/* 退出登录按钮 */}
      <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          退出登录
        </button>
      </div>

      <p className="page-placeholder">
        这里是我的页面占位（后续展示邮箱、信息中心/设置/帮助与反馈/关于）
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

