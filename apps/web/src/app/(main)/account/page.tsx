'use client';

import { Bookmark, Eye, EyeOff, Loader2, Save, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from '@lumina/ui';

import { toast } from '@/hooks/use-toast';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface SavedSearch {
  id: string;
  name: string;
  params: Record<string, unknown>;
  notifyOnNew: boolean;
  createdAt: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [deletingSearch, setDeletingSearch] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success) {
          setUser(data.data);
          setName(data.data.name);
          setEmail(data.data.email);
          // Fetch saved searches once authenticated
          fetch('/api/saved-searches')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d?.success) setSavedSearches(d.data);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteSearch = useCallback(async (id: string) => {
    setDeletingSearch(id);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Delete failed',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Search deleted', description: 'Saved search has been removed' });
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not delete saved search',
        variant: 'destructive',
      });
    } finally {
      setDeletingSearch(null);
    }
  }, []);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Update failed',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }
      setUser((prev) => (prev ? { ...prev, name, email } : null));
      toast({ title: 'Profile updated', description: 'Your changes have been saved' });
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Minimum 8 characters required',
        variant: 'destructive',
      });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast({
          title: 'Password update failed',
          description: data.error?.message ?? 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed' });
    } catch {
      toast({
        title: 'Network error',
        description: 'Could not update password',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <User className="text-muted-foreground mb-4 h-12 w-12" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to manage your account</h1>
        <p className="text-muted-foreground mb-6">
          You need to be signed in to access account settings.
        </p>
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Account settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your profile and preferences</p>
      </div>

      {/* Profile overview */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="bg-primary text-primary-foreground flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold">
            {user.name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
              <span className="text-muted-foreground text-xs">Member since {memberSince}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profile information</CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={saving || (name === user.name && email === user.email)}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Saved searches */}
      {savedSearches.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Saved searches
            </CardTitle>
            <CardDescription>Your saved search filters — click to re-run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedSearches.map((s) => {
                const params = s.params as Record<string, unknown>;
                const chips: string[] = [];
                if (params.query) chips.push(`"${params.query}"`);
                if (Array.isArray(params.category)) chips.push(...(params.category as string[]));
                if (params.priceMin || params.priceMax)
                  chips.push(`$${params.priceMin || 0}–$${params.priceMax || '∞'}`);
                if (params.guests) chips.push(`${params.guests}+ guests`);
                if (params.location) chips.push(params.location as string);

                // Build URL from params
                const sp = new URLSearchParams();
                if (params.query) sp.set('q', params.query as string);
                if (Array.isArray(params.category))
                  (params.category as string[]).forEach((c) => sp.append('category', c));
                if (params.priceMin) sp.set('priceMin', String(params.priceMin));
                if (params.priceMax) sp.set('priceMax', String(params.priceMax));
                if (params.guests) sp.set('guests', String(params.guests));
                if (params.bedrooms) sp.set('bedrooms', String(params.bedrooms));
                if (Array.isArray(params.amenities))
                  (params.amenities as string[]).forEach((a) => sp.append('amenity', a));
                if (params.sort && params.sort !== 'relevance')
                  sp.set('sort', params.sort as string);

                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <Link href={`/search?${sp.toString()}`} className="flex-1 hover:underline">
                      <div className="font-medium">{s.name}</div>
                      {chips.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {chips.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs capitalize">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-muted-foreground mt-1 text-xs">
                        Saved{' '}
                        {new Date(s.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingSearch === s.id}
                      onClick={() => handleDeleteSearch(s.id)}
                      className="text-muted-foreground hover:text-destructive ml-2"
                    >
                      {deletingSearch === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium">
                Current password
              </label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                </>
              ) : (
                'Update password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
