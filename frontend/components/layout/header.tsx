'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, MapPin, Heart } from 'lucide-react';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from '@/components/notifications';

const navigation = [
  { name: 'Browse', href: '/properties', icon: Search },
  { name: 'Map', href: '/properties/map', icon: MapPin },
];

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Logo + Mobile Nav */}
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">12done</span>
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
          {isAuthenticated && (
            <Link href="/favorites">
              <Button
                variant={pathname === '/favorites' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-2',
                  pathname === '/favorites' &&
                    'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                <Heart className="h-4 w-4" />
                Favorites
              </Button>
            </Link>
          )}
        </nav>

        {/* Right: User Menu */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Link href="/dashboard/properties/new" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  List your property
                </Button>
              </Link>
              <NotificationBell />
            </>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
