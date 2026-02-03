'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

const tabs = [
  { path: '/home', label: '首页', icon: '🏠' },
  { path: '/urls', label: '网址', icon: '🔗' },
  { path: '/categories', label: '分类', icon: '📁' },
  { path: '/me', label: '我的', icon: '👤' },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`tab-item ${isActive ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}


