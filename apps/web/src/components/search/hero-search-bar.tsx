'use client';

import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

import { HeroDatePicker } from '@/components/search/hero-date-picker';
import { HeroDestinationPicker } from '@/components/search/hero-destination-picker';
import { HeroGuestPicker } from '@/components/search/hero-guest-picker';
import { SearchBar } from '@/components/search/search-bar';

export function HeroSearchBar() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    for (const el of Array.from(form.elements)) {
      const input = el as HTMLInputElement;
      if (input.name && input.value === '') input.disabled = true;
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <form
          action="/search"
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-full bg-white p-2 shadow-2xl"
        >
          <div className="border-r border-slate-100">
            <HeroDestinationPicker />
          </div>
          <div className="border-r border-slate-100">
            <HeroDatePicker />
          </div>
          <HeroGuestPicker />
          <button
            type="submit"
            className="flex h-12 w-36 flex-shrink-0 items-center justify-center gap-2 rounded-full bg-slate-900 font-semibold text-white transition-all hover:bg-slate-800 active:scale-95"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
        </form>
      </div>

      <div className="md:hidden">
        <SearchBar size="lg" />
      </div>
    </>
  );
}
