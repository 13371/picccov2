'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/auth';

interface UrlItem {
  title: string;
  url: string;
}

export default function UrlsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UrlItem[]>([]);

  useEffect(() => {
    const token = getToken();
    
    if (!token) {
      router.replace('/login');
      return;
    }

    const fetchUrls = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('http://localhost:3001/items/list?type=URL&includeUnfiled=true', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const json = await response.json();

        if (!response.ok) {
          setError(json.message || '加载失败');
          setData([]);
          return;
        }

        if (json.success && json.data) {
          setData(json.data);
        } else {
          setData([]);
        }
      } catch (err) {
        setError('加载失败');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();
  }, [router]);

  return (
    <div className="page-container">
      <h2 className="page-title">网址</h2>
      {loading && <p className="page-placeholder">加载中…</p>}
      {error && <p className="page-placeholder">{error}</p>}
      {!loading && !error && data.length === 0 && <p className="page-placeholder">暂无 URL</p>}
      {!loading && !error && data.length > 0 && (
        <div className="placeholder-content">
          {data.map((item, index) => (
            <div key={index} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.title}</div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#999', textDecoration: 'none' }}>
                {item.url}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

