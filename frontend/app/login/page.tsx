'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setToken } from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱');
      return;
    }

    setSendingCode(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:3001/auth/request-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || '发送验证码失败');
        return;
      }

      setSuccess('已发送验证码（开发模式请看后端日志）');
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !code) {
      setError('请输入邮箱和验证码');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('http://localhost:3001/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || '登录失败');
        return;
      }

      if (json.accessToken) {
        setToken(json.accessToken);
        router.push('/urls');
      } else {
        setError('登录失败：未返回 token');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">登录</h2>
      
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
            disabled={loading || sendingCode}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            验证码
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="请输入验证码"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
            disabled={loading || sendingCode}
          />
        </div>

        {error && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: '#fee', 
            color: '#c33', 
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            marginBottom: '16px', 
            padding: '12px', 
            background: '#efe', 
            color: '#3c3', 
            borderRadius: '8px',
            fontSize: '14px',
          }}>
            {success}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSendCode}
            disabled={sendingCode || loading}
            style={{
              flex: 1,
              padding: '12px',
              background: sendingCode ? '#ccc' : '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: sendingCode ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {sendingCode ? '发送中...' : '发送验证码'}
          </button>

          <button
            onClick={handleLogin}
            disabled={loading || sendingCode}
            style={{
              flex: 1,
              padding: '12px',
              background: loading ? '#ccc' : '#007aff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  );
}



