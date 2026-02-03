'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function Header() {
  const router = useRouter();

  const handleNewNote = async () => {
    try {
      // 快速新建NOTE到未分类（folderId=null）
      const res = await apiPost('/items', {
        type: 'NOTE',
        title: '',
        content: '',
        folderId: null,
      });
      
      // 成功后跳转到编辑页面
      if (res?.data?.id) {
        router.push(`/notes/${res.data.id}`);
      }
    } catch (error: any) {
      alert(error?.message || '创建失败');
    }
  };

  const handleSearch = () => {
    router.push('/search');
  };

  return (
    <header className="header">
      <button 
        className="header-button"
        onClick={handleNewNote}
        aria-label="快速新建"
      >
        +
      </button>
      <h1 className="header-title">piccco</h1>
      <button 
        className="header-button"
        onClick={handleSearch}
        aria-label="搜索"
      >
        🔍
      </button>
    </header>
  );
}


