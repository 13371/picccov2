'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPost } from '../../lib/api';
import { getToken } from '../lib/auth';

export default function UnlockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    // 页面加载时先检查状态
    const checkStatus = async () => {
      try {
        const response = await apiGet('/private/status');
        if (response.success && response.data) {
          setHasPassword(response.data.hasPassword);
        }
      } catch (err) {
        console.error('检查状态失败:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [router]);

  const handleSetup = async () => {
    if (!pin.trim()) {
      setError('请输入密码');
      return;
    }

    if (pin.length < 4 || pin.length > 10) {
      setError('密码长度必须在 4~10 字符之间');
      return;
    }

    if (pin !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiPost('/private/setup', { pin, confirm });

      // 设置成功，标记为已解锁
      localStorage.setItem('piccco_private_unlocked', '1');

      // 跳转到原来想去的页面
      const next = searchParams.get('next') || '/categories';
      router.replace(next);
    } catch (err: any) {
      setError(err.message || '设置失败');
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!pin.trim()) {
      setError('请输入密码');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiPost('/private/unlock', { pin });

      // 解锁成功
      localStorage.setItem('piccco_private_unlocked', '1');

      // 跳转到原来想去的页面
      const next = searchParams.get('next') || '/categories';
      router.replace(next);
    } catch (err: any) {
      // PIN 错误：显示错误信息，不跳转
      const errorMsg = err.message || '解锁失败';
      if (errorMsg.includes('pin incorrect') || errorMsg.includes('pin 错误') || errorMsg.includes('密码错误')) {
        setError('密码错误，请重试');
      } else {
        setError(errorMsg);
      }
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="page-container">
        <h2 className="page-title">隐私解锁</h2>
        <div style={{ padding: '20px' }}>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  const isSetupMode = hasPassword === false;

  return (
    <div className="page-container">
      <h2 className="page-title">{isSetupMode ? '设置隐私密码' : '隐私解锁'}</h2>
      <div style={{ padding: '20px' }}>
        <input
          type="password"
          placeholder={isSetupMode ? '请输入密码（4~10字符）' : '请输入密码'}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              if (isSetupMode) {
                handleSetup();
              } else {
                handleUnlock();
              }
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        />
        {isSetupMode && (
          <input
            type="password"
            placeholder="请再次输入密码"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSetup();
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          />
        )}
        {error && (
          <p style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>
            {error}
          </p>
        )}
        <button
          onClick={isSetupMode ? handleSetup : handleUnlock}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (isSetupMode ? '设置中...' : '解锁中...') : (isSetupMode ? '设置密码' : '解锁')}
        </button>
      </div>
    </div>
  );
}

