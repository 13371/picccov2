'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';
import { apiPost } from '../../lib/api';

export default function AccountSecurityPage() {
  const router = useRouter();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  const handleChangePin = async () => {
    if (!oldPin.trim()) {
      setError('请输入旧密码');
      return;
    }

    if (!newPin.trim()) {
      setError('请输入新密码');
      return;
    }

    if (newPin.length < 4 || newPin.length > 10) {
      setError('新密码长度必须在 4~10 字符之间');
      return;
    }

    if (newPin !== confirmNewPin) {
      setError('两次输入的新密码不一致');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await apiPost('/private/change-pin', {
        oldPin,
        newPin,
        confirmNewPin,
      });

      // 修改成功
      setSuccess(true);
      
      // 清除解锁标记
      localStorage.removeItem('piccco_private_unlocked');
      
      // 清空输入（只清空旧密码字段，新密码字段保留以便用户确认）
      setOldPin('');
      
      // 3秒后清空新密码字段
      setTimeout(() => {
        setNewPin('');
        setConfirmNewPin('');
      }, 3000);
    } catch (err: any) {
      const errorMsg = err.message || '修改失败';
      if (errorMsg.includes('old pin incorrect') || errorMsg.includes('旧密码')) {
        setError('旧密码错误');
        // 清空旧密码字段
        setOldPin('');
      } else {
        setError(errorMsg);
      }
      setLoading(false);
    }
  };

  const handleResetPinClick = () => {
    alert('通过邮箱验证码重置功能即将支持，敬请期待！');
  };

  return (
    <div className="page-container">
      <h2 className="page-title">账号与安全</h2>
      <div style={{ padding: '20px' }}>
        {/* 模块1：修改隐私文件夹密码 */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 'bold' }}>
            修改隐私文件夹密码
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              旧密码
            </label>
            <input
              type="password"
              placeholder="请输入旧密码"
              value={oldPin}
              onChange={(e) => setOldPin(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              新密码
            </label>
            <input
              type="password"
              placeholder="请输入新密码（4~10字符）"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              确认新密码
            </label>
            <input
              type="password"
              placeholder="请再次输入新密码"
              value={confirmNewPin}
              onChange={(e) => setConfirmNewPin(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleChangePin();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </p>
          )}

          {success && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: 'green', fontSize: '14px', marginBottom: '8px' }}>
                密码修改成功！
              </p>
              <p style={{ color: '#666', fontSize: '14px' }}>
                请重新解锁隐私文件夹
              </p>
            </div>
          )}

          <button
            onClick={handleChangePin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '修改中...' : '确认修改'}
          </button>
        </div>

        {/* 模块2：忘记密码（占位） */}
        <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid #e0e0e0' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 'bold' }}>
            忘记隐私密码？
          </h3>
          <button
            onClick={handleResetPinClick}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            通过邮箱验证码重置（即将支持）
          </button>
        </div>
      </div>
    </div>
  );
}

