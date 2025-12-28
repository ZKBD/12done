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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
];

export function Sidebar() {
  const pathname = usePathname();

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
                {link.title}
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
