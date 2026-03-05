'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppsListRegular,
  HistoryRegular,
  SettingsRegular,
} from '@fluentui/react-icons';

type SidebarProps = {
  userEmail: string;
  isOwner: boolean;
};

type TabItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
};

export const Sidebar = ({ userEmail, isOwner }: SidebarProps) => {
  const pathname = usePathname();

  const items: TabItem[] = [
    {
      href: '/manage',
      label: 'Manage',
      icon: <SettingsRegular />,
      visible: isOwner,
    },
    {
      href: '/browse',
      label: 'Browse',
      icon: <AppsListRegular />,
      visible: true,
    },
    {
      href: '/history',
      label: 'Request History',
      icon: <HistoryRegular />,
      visible: true,
    },
  ];

  return (
    <aside className="sidebar">
      {items
        .filter((item) => item.visible)
        .map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}

      <div className="sidebar-bottom">{userEmail}</div>
    </aside>
  );
};
