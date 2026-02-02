'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const tabs = [
  { path: '/home', label: 'Home', icon: '🏠' },
  { path: '/urls', label: 'URLs', icon: '🔗' },
  { path: '/categories', label: 'Categories', icon: '📁' },
  { path: '/me', label: 'Me', icon: '👤' },
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

