'use client';

import Link from 'next/link';
import { reauthenticate } from '@/app/actions/auth';
import { usePathname } from 'next/navigation';
import { ClipboardList, Search, History, Settings, User, ArrowLeftRight } from 'lucide-react';

type SidebarProps = {
  userName: string;
  userEmail: string;
  isOwner: boolean;
};

type TabItem = {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
};

export const Sidebar = ({ userName, userEmail, isOwner }: SidebarProps) => {
  const pathname = usePathname();

  const items: TabItem[] = [
    {
      href: '/manage',
      label: 'Manage',
      short: 'Manage',
      icon: Settings,
      visible: isOwner,
    },
    {
      href: '/browse',
      label: 'Browse',
      short: 'Browse',
      icon: Search,
      visible: true,
    },
    {
      href: '/history',
      label: 'Request History',
      short: 'History',
      icon: History,
      visible: true,
    },
  ];

  const visibleItems = items.filter((item) => item.visible);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:h-screen lg:w-64 lg:border-r lg:border-b-0 lg:sticky lg:top-0">
      {/* Desktop heading */}
      <div className="hidden items-center gap-2 border-b border-slate-100 px-4 py-4 lg:flex">
        <ClipboardList className="h-5 w-5 text-indigo-600" />
        <span className="text-base font-semibold text-slate-800">jkPay</span>
      </div>

      {/* Nav links — row on mobile, column on desktop */}
      <nav className="flex flex-row overflow-x-auto px-2 py-2 lg:flex-col lg:gap-1 lg:px-3 lg:py-3">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors lg:flex-row lg:gap-3 lg:px-3 lg:py-2 lg:text-sm ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 lg:h-4 lg:w-4" />
              <span className="whitespace-nowrap">{item.short}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <User className={`h-3.5 w-3.5 shrink-0 ${isOwner ? 'text-slate-400 fill-slate-400' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-700" title={userName || userEmail}>
              {userName || (isOwner ? 'Owner' : 'User')}
            </p>
            <p className="truncate text-[11px] text-slate-500" title={userEmail}>
              {isOwner ? 'Owner: ' : ''}{userEmail}
            </p>
          </div>
        </div>
        <form action={reauthenticate}>
          <button
            type="submit"
            className="ml-2 flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            title="Switch user"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* User email — desktop */}
      <div className="mt-auto hidden items-center justify-between border-t border-slate-100 px-4 py-3 lg:flex">
        <div className="flex items-center gap-2 overflow-hidden">
          <User className={`h-3.5 w-3.5 shrink-0 ${isOwner ? 'text-slate-400 fill-slate-400' : 'text-slate-400'}`} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-700" title={userName || userEmail}>
              {userName || (isOwner ? 'Owner' : 'User')}
            </p>
            <p className="truncate text-[11px] text-slate-500" title={userEmail}>
              {isOwner ? 'Owner: ' : ''}{userEmail}
            </p>
          </div>
        </div>
        <form action={reauthenticate}>
          <button
            type="submit"
            className="ml-2 flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            title="Switch user"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};
