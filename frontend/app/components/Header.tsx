'use client';

import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();

  const handleNewNote = () => {
    // 直接跳转到新建页，不先 POST
    // 这样点击取消不会产生空白 note（满足硬规则）
    router.push('/notes/new?from=quick');
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


