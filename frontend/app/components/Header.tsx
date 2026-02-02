'use client';

export default function Header() {
  const handleNewNote = () => {
    console.log('打开新增 NOTE');
  };

  const handleSearch = () => {
    console.log('打开搜索页');
  };

  return (
    <header className="header">
      <button 
        className="header-button"
        onClick={handleNewNote}
        aria-label="新增NOTE"
      >
        新增NOTE
      </button>
      <h1 className="header-title">piccco</h1>
      <button 
        className="header-button"
        onClick={handleSearch}
        aria-label="搜索"
      >
        搜索
      </button>
    </header>
  );
}

