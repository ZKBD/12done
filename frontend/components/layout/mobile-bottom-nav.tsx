'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  MessageSquare,
  Bell,
  User,
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: 'Properties',
    href: '/dashboard/properties',
    icon: Home,
  },
  {
    name: 'Negotiations',
    href: '/dashboard/negotiations',
    icon: MessageSquare,
  },
  {
    name: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    showBadge: true,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: User,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: unreadData } = useUnreadCount();
  const unreadCount = unreadData?.count || 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 py-1 rounded-lg transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iPhone notch */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
}
