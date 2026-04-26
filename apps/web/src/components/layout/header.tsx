'use client';

import {
  CalendarDays,
  Heart,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Shield,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lumina/ui';

import { toast } from '@/hooks/use-toast';
import { NotificationBell } from '@/components/notifications/notification-bell';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const NAV_LINKS = [
  { href: '/search', label: 'Explore' },
  { href: '/categories', label: 'Categories' },
  { href: '/experiences', label: 'Experiences' },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success) setUser(data.data);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      toast({ title: 'Signed out', description: 'You have been logged out successfully' });
      router.push('/');
      router.refresh();
    } catch {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  }, [router]);

  // Determine if current page is the homepage hero (for transparent header)
  const isHome = pathname === '/';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-300 ${
        isHome
          ? 'bg-white/80 shadow-sm backdrop-blur-xl dark:bg-slate-950/80'
          : 'bg-white/80 shadow-sm backdrop-blur-xl dark:bg-slate-950/80'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-8">
        {/* Logo (left, isolated) */}
        <Link href="/" aria-label="Lumina — home" className="group flex items-center gap-2.5">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-900 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:bg-slate-50">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-5 w-5 text-white dark:text-slate-900"
            >
              <circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.85"
              />
              <circle cx="15" cy="9" r="3" fill="currentColor" />
            </svg>
            <span className="pointer-events-none absolute -right-3 -top-3 h-6 w-6 rounded-full bg-amber-400/30 opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100" />
          </span>
          <span className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Lumina
            </span>
            <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-amber-400" />
          </span>
        </Link>

        {/* Right cluster: nav + actions */}
        <div className="flex items-center gap-6">
          {/* Desktop nav */}
          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'border-b-2 border-slate-900 pb-1 text-slate-900 dark:border-slate-50 dark:text-slate-50'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <span
            aria-hidden="true"
            className="hidden h-6 w-px bg-slate-200 md:block dark:bg-slate-800"
          />

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-900 dark:text-slate-50"
            >
              <Link href="/search">
                <Search className="h-[18px] w-[18px]" />
                <span className="sr-only">Search</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-slate-900 dark:text-slate-50"
            >
              <Link href="/favorites">
                <Heart className="h-[18px] w-[18px]" />
                <span className="sr-only">Favorites</span>
              </Link>
            </Button>

            {/* Notification bell */}
            {checked && user && <NotificationBell />}

            {/* Auth */}
            {checked &&
              (user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative"
                      aria-label="Account menu"
                    >
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-900"
                        aria-hidden="true"
                      >
                        {getInitials(user.name)}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-muted-foreground text-xs">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link href="/account">
                          <Settings className="mr-2 h-4 w-4" />
                          Account settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bookings">
                          <CalendarDays className="mr-2 h-4 w-4" />
                          My bookings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/favorites">
                          <Heart className="mr-2 h-4 w-4" />
                          Favorites
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/messages">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Messages
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    {(user.role === 'admin' || user.role === 'host') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          {(user.role === 'host' || user.role === 'admin') && (
                            <DropdownMenuItem asChild>
                              <Link href="/host/dashboard">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Host Dashboard
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {user.role === 'admin' && (
                            <DropdownMenuItem asChild>
                              <Link href="/admin">
                                <Shield className="mr-2 h-4 w-4" />
                                Admin dashboard
                              </Link>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuGroup>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/auth/login" className="gap-1.5 text-slate-900 dark:text-slate-50">
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign in</span>
                  </Link>
                </Button>
              ))}

            <Button
              variant="ghost"
              size="icon"
              className="text-slate-900 md:hidden dark:text-slate-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden">
          <nav
            aria-label="Mobile navigation"
            className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4"
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  className="px-2 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            {user && (
              <>
                <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />
                <Link
                  href="/account"
                  className="px-2 py-1.5 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
                <Link
                  href="/bookings"
                  className="px-2 py-1.5 text-sm font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Bookings
                </Link>
                <button
                  className="px-2 py-1.5 text-left text-sm font-medium text-red-500"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                >
                  Sign out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
