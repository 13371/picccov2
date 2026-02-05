'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken } from '../lib/auth';
import { apiGet } from '../../lib/api';

export default function MePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    // 获取用户邮箱
    const fetchEmail = async () => {
      try {
        const response = await apiGet('/auth/me');
        if (response.success && response.data) {
          setEmail(response.data.email || '');
        }
      } catch (err) {
        console.error('获取用户邮箱失败:', err);
      } finally {
        setEmailLoading(false);
      }
    };

    fetchEmail();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('piccco_token');
    localStorage.removeItem('piccco_private_unlocked');
    router.replace('/login');
  };

  const menuItems = [
    { label: '信息中心', href: '/me/messages' },
    { label: '设置', href: '/settings' },
    { label: '账号与安全', href: '/account-security' },
    { label: '帮助与反馈', href: '/me/feedback' },
    { label: '关于', href: '/me/about' },
  ];

  return (
    <div className="page-container">
      <h2 className="page-title">我的</h2>
      
      {/* 顶部：邮箱 */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
        {emailLoading ? (
          <p style={{ color: '#666' }}>加载中...</p>
        ) : (
          <p style={{ fontSize: '16px', fontWeight: '500' }}>
            {email || '未获取到邮箱'}
          </p>
        )}
      </div>

      {/* 中部：5个入口列表 */}
      <div style={{ padding: '20px 0' }}>
        {menuItems.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'block',
              padding: '16px 20px',
              fontSize: '16px',
              color: '#333',
              textDecoration: 'none',
              borderBottom: index < menuItems.length - 1 ? '1px solid #e0e0e0' : 'none',
              backgroundColor: '#fff',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* 底部：退出登录按钮 */}
      <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', marginTop: '20px' }}>
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
    </div>
  );
}

