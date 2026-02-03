'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const tabs = [
  { path: '/home', label: '首页' },
  { path: '/urls', label: '网址' },
  { path: '/categories', label: '分类' },
  { path: '/me', label: '我的' },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar-top">
      {tabs.map((tab) => {
        // 支持 / 和 /home 都匹配首页
        const isActive = pathname === tab.path || (tab.path === '/home' && pathname === '/');
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`tab-item-top ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}


