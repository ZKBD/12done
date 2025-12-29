'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  Heart,
  Bell,
  MessageSquare,
  CreditCard,
  Settings,
  Search,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUnreadMessageCount } from '@/hooks/use-messaging';

const sidebarLinks = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My Properties',
    href: '/dashboard/properties',
    icon: Home,
  },
  {
    title: 'Favorites',
    href: '/favorites',
    icon: Heart,
  },
  {
    title: 'Search Agents',
    href: '/dashboard/search-agents',
    icon: Search,
  },
  {
    title: 'Negotiations',
    href: '/dashboard/negotiations',
    icon: MessageSquare,
  },
  {
    title: 'Messages',
    href: '/dashboard/messages',
    icon: Mail,
    showBadge: true,
  },
  {
    title: 'Transactions',
    href: '/dashboard/transactions',
    icon: CreditCard,
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { data: unreadData } = useUnreadMessageCount();
  const unreadCount = unreadData?.count || 0;

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r bg-slate-50/50">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="text-xl font-bold text-primary">
          12done
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {sidebarLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== '/dashboard' && pathname.startsWith(link.href));

          const showBadge = 'showBadge' in link && link.showBadge && unreadCount > 0;

          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3',
                  isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                <link.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{link.title}</span>
                {showBadge && (
                  <Badge
                    variant="default"
                    className="h-5 min-w-5 px-1.5 text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Link href="/dashboard/properties/new">
          <Button className="w-full">List New Property</Button>
        </Link>
      </div>
    </aside>
  );
}
