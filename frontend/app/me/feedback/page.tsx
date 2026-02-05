'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../../lib/auth';
import BackButton from '../../components/BackButton';

export default function FeedbackPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="page-container">
      <div style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '12px',
        marginBottom: '20px'
      }}>
        <BackButton />
        <h2 className="page-title" style={{ marginBottom: 0 }}>帮助与反馈</h2>
      </div>
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        color: '#666'
      }}>
        <p>帮助与反馈功能开发中...</p>
      </div>
    </div>
  );
}

