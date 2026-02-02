'use client';

export default function Header() {
  const handleNewNote = () => {
    // TODO: 打开新建 NOTE 编辑页
    console.log('打开新建 NOTE');
  };

  const handleSearch = () => {
    // TODO: 打开搜索页
    console.log('打开搜索页');
  };

  return (
    <header className="header">
      <button 
        className="header-button"
        onClick={handleNewNote}
        aria-label="新建笔记"
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

