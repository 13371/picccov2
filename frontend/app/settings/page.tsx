'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';
import BackButton from '../components/BackButton';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('piccco_token');
    localStorage.removeItem('piccco_private_unlocked');
    router.replace('/login');
  };

  return (
    <div className="page-container">
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '20px'
      }}>
        <BackButton />
        <h2 className="page-title" style={{ marginBottom: 0 }}>设置</h2>
      </div>

      {/* 账号相关 */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#333'
        }}>
          账号相关
        </h3>
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

      {/* 其他设置项 */}
      <div>
        <h3 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px',
          color: '#333'
        }}>
          其他设置
        </h3>
        <div style={{ 
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '16px 20px',
            borderBottom: '1px solid #e0e0e0',
            color: '#999',
            fontSize: '14px'
          }}>
            主题（开发中）
          </div>
          <div style={{ 
            padding: '16px 20px',
            borderBottom: '1px solid #e0e0e0',
            color: '#999',
            fontSize: '14px'
          }}>
            语言（开发中）
          </div>
          <div style={{ 
            padding: '16px 20px',
            color: '#999',
            fontSize: '14px'
          }}>
            同步（开发中）
          </div>
        </div>
      </div>
    </div>
  );
}

