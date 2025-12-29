'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  MessageSquare,
  Mail,
  User,
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/use-notifications';
import { useUnreadMessageCount } from '@/hooks/use-messaging';
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
    name: 'Messages',
    href: '/dashboard/messages',
    icon: Mail,
    showMessageBadge: true,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: User,
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const { data: unreadNotifications } = useUnreadCount();
  const { data: unreadMessages } = useUnreadMessageCount();
  const notificationCount = unreadNotifications?.count || 0;
  const messageCount = unreadMessages?.count || 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            'exact' in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

          const showBadge =
            'showMessageBadge' in item && item.showMessageBadge && messageCount > 0;

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
                {showBadge && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center">
                    {messageCount > 9 ? '9+' : messageCount}
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
