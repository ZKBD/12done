'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Home,
  Search,
  Heart,
  User,
  Settings,
  LogOut,
  Plus,
  Bell,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/providers';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function MobileNav() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    router.push('/');
  };

  const handleNavigation = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="text-2xl font-bold text-primary"
            >
              12done
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-8 flex flex-col gap-4">
          {isAuthenticated && user ? (
            <>
              {/* User Info */}
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatarUrl || undefined} alt={user.firstName || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => handleNavigation('/dashboard')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <User className="h-5 w-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => handleNavigation('/properties')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Search className="h-5 w-5" />
                  <span>Browse Properties</span>
                </button>
                <button
                  onClick={() => handleNavigation('/properties/map')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Map Search</span>
                </button>
                <button
                  onClick={() => handleNavigation('/favorites')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Heart className="h-5 w-5" />
                  <span>Favorites</span>
                </button>
                <button
                  onClick={() => handleNavigation('/dashboard/notifications')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </button>

                <div className="my-2 h-px bg-border" />

                <button
                  onClick={() => handleNavigation('/dashboard/properties')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Home className="h-5 w-5" />
                  <span>My Properties</span>
                </button>
                <button
                  onClick={() => handleNavigation('/dashboard/properties/new')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Plus className="h-5 w-5" />
                  <span>List Property</span>
                </button>

                <div className="my-2 h-px bg-border" />

                <button
                  onClick={() => handleNavigation('/dashboard/settings')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Log out</span>
                </button>
              </nav>
            </>
          ) : (
            <>
              {/* Guest Navigation */}
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => handleNavigation('/properties')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <Search className="h-5 w-5" />
                  <span>Browse Properties</span>
                </button>
                <button
                  onClick={() => handleNavigation('/properties/map')}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Map Search</span>
                </button>
              </nav>

              <div className="my-2 h-px bg-border" />

              {/* Auth Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleNavigation('/login')}
                >
                  Log in
                </Button>
                <Button
                  className="w-full"
                  onClick={() => handleNavigation('/register')}
                >
                  Sign up
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
