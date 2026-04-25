import {
  ArrowRight,
  Camera,
  Compass,
  Mountain,
  Plus,
  Sailboat,
  Sparkles,
  Star,
  Utensils,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Experiences – Lumina',
  description: 'Discover unique activities and curated experiences hosted by passionate locals worldwide.',
};

const EXPERIENCES = [
  {
    slug: 'culinary',
    label: 'Culinary',
    description: 'Private chef tastings and hidden vineyard tours for the epicurean soul.',
    icon: Utensils,
    colorBg: 'from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900',
    colorBorder: 'border-rose-100/50 dark:border-rose-900/30',
    colorIcon: 'bg-rose-500',
    colorTag: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    colorShadow: 'hover:shadow-rose-900/5',
    tags: ['Private Chef', 'Wine Tasting', 'Organic Farm', 'Masterclass'],
  },
  {
    slug: 'photography',
    label: 'Photography',
    description: 'Capture the essence of remote landscapes with expert guidance from masters.',
    icon: Camera,
    colorBg: 'from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-900',
    colorBorder: 'border-violet-100/50 dark:border-violet-900/30',
    colorIcon: 'bg-violet-500',
    colorTag: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    colorShadow: 'hover:shadow-violet-900/5',
    tags: ['Golden Hour', 'Equipment', 'Post-Process', 'Portfolio'],
  },
  {
    slug: 'water-sports',
    label: 'Water Sports',
    description: 'Navigate turquoise waters with private yacht charters and deep sea diving.',
    icon: Sailboat,
    colorBg: 'from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-900',
    colorBorder: 'border-sky-100/50 dark:border-sky-900/30',
    colorIcon: 'bg-sky-500',
    colorTag: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    colorShadow: 'hover:shadow-sky-900/5',
    tags: ['Yachting', 'Jet Ski', 'Snorkeling', 'Private Dock'],
  },
  {
    slug: 'hiking',
    label: 'Hiking',
    description: 'Reconnect with nature on untouched trails through ancient forests and peaks.',
    icon: Mountain,
    colorBg: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900',
    colorBorder: 'border-emerald-100/50 dark:border-emerald-900/30',
    colorIcon: 'bg-emerald-500',
    colorTag: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    colorShadow: 'hover:shadow-emerald-900/5',
    tags: ['Summit Goal', 'Local Guide', 'Eco-Friendly', 'Gear Prep'],
  },
  {
    slug: 'cultural',
    label: 'Cultural',
    description: 'Immerse yourself in heritage with private museum access and artisan workshops.',
    icon: Star,
    colorBg: 'from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900',
    colorBorder: 'border-amber-100/50 dark:border-amber-900/30',
    colorIcon: 'bg-amber-500',
    colorTag: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    colorShadow: 'hover:shadow-amber-900/5',
    tags: ['Art Tours', 'History', 'Language', 'Workshops'],
  },
  {
    slug: 'adventure',
    label: 'Adventure',
    description: 'Push your limits with helicopter excursions and extreme terrain expeditions.',
    icon: Compass,
    colorBg: 'from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-900',
    colorBorder: 'border-orange-100/50 dark:border-orange-900/30',
    colorIcon: 'bg-orange-500',
    colorTag: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    colorShadow: 'hover:shadow-orange-900/5',
    tags: ['Airborne', 'Off-Road', 'Survival', 'Thrills'],
  },
];

const PAIRINGS = [
  {
    title: 'Santorini Sunset Sail',
    description: 'Stay at Villa Amethyst + Private 5-hour Sunset Catamaran Cruise.',
    price: '$2,450',
    tag: 'Most popular',
    tagStyle: 'bg-amber-400 text-amber-900',
    category: 'villa',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyEoexvxIBudQQM_lb7YGsvu0Hk0Z97V36jhnM8Lj41hMlOdyPIATWXhwViXGyd3HHJnyDKU4vMH5oJX0e6A8bqdsyuIO5yKY4b7ndoGi5MCKSB1P2onu0Ecmo4uPPqGS8STShkPwjpqL5g5mtKwlL6JDLo5Q0VTSTHs3Vk3nCsJmDPPfujzIQHSfa1M0a3e8CKhw9qpLLZXYNggIVjj6pBNXh9EbnlYymz0O1lEZ0ZAqig5a4f_5jTkgBalOGGAz4ISR_nPkUo-o',
    imageAlt: 'Luxury infinity pool overlooking the Aegean sea',
  },
  {
    title: 'Tuscan Harvest Week',
    description: 'Farmhouse Stay + Personal Sommelier & Truffle Hunting Tour.',
    price: '$3,100',
    tag: 'Staff pick',
    tagStyle: 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900',
    category: 'farmhouse',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDC0A6K2zLKDpkAHSmwtxaSVkjtZ7lQimrjy4lfaHg9TgJQMmJueMKciYtc_c8eCbRcrRA40qjaQrr8jJkJr6WE6KIx19BY9oFB30oXubnt47TG1nc0HKgSUjVeDP0Bxu1Rx-yVfduHXMKEhT5t1iiY3ZlZeHKb1Wh_tZOuXFdbUleUOmpOBKXQ1M603Qd_zqh7Y2T0VDSEfF2zfsYLVLcXPvP5Zp0jlr00jFZc2wO89qQsZmjQZWqx7RD5B2q6maGngEZjzeA1crU',
    imageAlt: 'Lush vineyard rows in Tuscany',
  },
  {
    title: 'Tokyo Neon Nights',
    description: 'Skyline Penthouse + VIP Underground Jazz & Sushi Masterclass.',
    price: '$4,200',
    tag: 'New',
    tagStyle: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    category: 'penthouse',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9qvItgHjnyI8eyV1s9Ef-KOffe9CG7TvsCTDLepeCrlNKeuXKhu-7u6pPu816TDxP8ScRLISJSKZNteNXZLwTIxJHA5IDMJUqaPQVOIqjX9Q1aO8xigh3jZ1rMinjA-XNwS-LyKRLlYHkJeve_YwXbftRsZfKHRoZ9pLu9oJckkZLkh0krm0FC9YVN2Oim62G6iTGqPZ9TocTJlO7Q0C1rb25RHjgHe0L-4rGySEtCPgSFBN5est__mfq0q28Rg8Msfj9pDLaaMk',
    imageAlt: 'Night cityscape of Tokyo with neon lights',
  },
];

export default function ExperiencesPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-700 px-8 py-24 md:py-32">
        <div className="relative z-10 mx-auto grid max-w-[1400px] items-center gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium tracking-wide text-white backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              Curated by locals
            </div>
            <h1 className="text-5xl font-black leading-[1.1] tracking-tighter text-white md:text-7xl">
              Unforgettable <br />experiences
            </h1>
            <p className="max-w-lg text-xl font-light leading-relaxed text-white/70">
              Discover the world&apos;s most exclusive activities, curated for the discerning
              traveler. From private culinary journeys to adrenaline-fueled adventures.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="#journeys"
                className="rounded-lg bg-white px-8 py-4 text-sm font-semibold text-slate-900 transition-all hover:bg-slate-100"
              >
                Explore Collections
              </Link>
              <Link
                href="#pairings"
                className="rounded-lg border border-white/20 bg-transparent px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                How it Works
              </Link>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="aspect-[4/5] rotate-2 overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcgaRSf1RHQNRq8SCDPFUsXRNXIGRFCgXIhAsWsXR7OEct98MF3Ajrc77hE_ThiDx9i9sfQZJLIc2_71Fk2-yEfnVb_34IjaC6Y3ZVJX430BrjpmUcjjeYbd9pW4dYzRJhg7jP9_oNEL6SPHqZtKh22Al-UlC3VywQnP0P__IGwYS7tE4tMxbg_1KSqJq2r0pVudbH4axCUX4OIqtqm4oOBirwuSIM1tvsgR6NMSFPsosQBt5iDZmp9hMy94wUj1630OQCESrBx8Y"
                alt="Luxury yacht sailing through Mediterranean waters at sunset"
                width={600}
                height={750}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="absolute -bottom-10 -left-10 aspect-square w-64 -rotate-3 overflow-hidden rounded-2xl border-8 border-white/5 shadow-2xl backdrop-blur-xl">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhPTcoeQp74hKws0bu7_e8vJpj73HygWMpjQ1v-IHzbnwOMVxspjVtW1EHBCiTjQT0l73Pf-IPbf6qUYIkOwerZipdhVzne6W7LnJZ6alxFQRTyc6IURBaO4toMLzQESzR_JupuKzIoU2gG_MatrBwlivvJIkoww1OHC6_SpsxVkrbEAeH4aEpauOoVw5iemUvr4P4CMUBSeMQydNqeUUCNTk_uyI7UhSMHzxk5ukCi1QookDCYNsWbI43T85XqNwXpbJ6q5DfvIo"
                alt="Gourmet Michelin star dish with artistic plating"
                width={256}
                height={256}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-l from-slate-400/20 to-transparent" />
        </div>
      </section>

      {/* Category Grid */}
      <section id="journeys" className="mx-auto max-w-[1400px] px-8 py-24">
        <div className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
              The Index
            </p>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-50 md:text-5xl">
              Choose your journey.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Six curated worlds. Pick the one that calls — every entry is hand-vetted by our local concierge team.
          </p>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200 bg-white sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900 [&>*]:border-slate-200 [&>*]:dark:border-slate-800 sm:[&>*:nth-child(2n)]:border-l sm:[&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(2n)]:border-l-0 lg:[&>*:nth-child(3n+2)]:border-l lg:[&>*:nth-child(3n+3)]:border-l lg:[&>*:nth-child(n+4)]:border-t">
          {EXPERIENCES.map((exp, idx) => {
            const Icon = exp.icon;
            return (
              <Link
                key={exp.slug}
                href={`/search?experience=${exp.slug}`}
                className="group relative flex min-h-[340px] flex-col gap-6 p-8 transition-colors duration-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 md:p-10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`block h-[3px] w-10 rounded-full ${exp.colorIcon}`}
                    />
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                      No.{String(idx + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <Icon
                    className="h-5 w-5 text-slate-300 transition-colors duration-300 group-hover:text-slate-900 dark:text-slate-600 dark:group-hover:text-slate-50"
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                  {exp.label}
                </h3>

                <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {exp.description}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                  {exp.tags.map((tag, i) => (
                    <span key={tag} className="flex items-center gap-2">
                      {i > 0 && (
                        <span className="text-slate-300 dark:text-slate-700">
                          /
                        </span>
                      )}
                      <span className="transition-colors duration-300 group-hover:text-slate-700 dark:group-hover:text-slate-300">
                        {tag}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="pointer-events-none absolute right-8 bottom-8 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-slate-50 opacity-0 transition-all duration-300 group-hover:opacity-100 md:right-10 md:bottom-10 dark:bg-slate-50 dark:text-slate-900">
                  <ArrowRight className="h-4 w-4 -translate-x-1 transition-transform duration-300 group-hover:translate-x-0" strokeWidth={2.5} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pairings Section */}
      <section id="pairings" className="bg-slate-100/60 py-24 dark:bg-slate-800/30">
        <div className="mx-auto max-w-[1400px] px-8">
          <div className="mb-16 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                Perfect pairings
              </h2>
              <p className="max-w-xl text-slate-500 dark:text-slate-400">
                Curated combinations of stay and play, designed to provide a seamless high-end
                experience.
              </p>
            </div>
            <Link
              href="/search"
              className="group flex items-center gap-2 font-bold text-slate-900 dark:text-slate-50"
            >
              View all bundles
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {PAIRINGS.map((pairing) => (
              <Link
                key={pairing.title}
                href={`/search?category=${pairing.category}`}
                className="group overflow-hidden rounded-xl bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-slate-900"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={pairing.image}
                    alt={pairing.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-tight ${pairing.tagStyle}`}
                  >
                    {pairing.tag}
                  </div>
                </div>
                <div className="p-8">
                  <h4 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {pairing.title}
                  </h4>
                  <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                    {pairing.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                      {pairing.price} / total
                    </span>
                    <Plus className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-200/50 px-8 py-24 dark:border-slate-700/30">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 text-center md:grid-cols-3">
          <div className="space-y-4">
            <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
              200+
            </div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Experiences
            </div>
          </div>
          <div className="space-y-4">
            <div className="text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
              50+
            </div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Global Cities
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-5xl font-black tracking-tighter text-slate-900 dark:text-slate-50">
              4.9
              <Star className="h-9 w-9 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
              Avg Member Rating
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="relative overflow-hidden px-8 py-24">
        <div className="relative mx-auto max-w-[1000px] overflow-hidden rounded-3xl bg-slate-900 p-12 text-center md:p-20">
          <div className="relative z-10">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-white md:text-5xl">
              Access the inaccessible.
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-lg text-slate-400">
              Join our inner circle for early access to seasonal collections and member-only events.
            </p>
            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-4 text-white transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              />
              <button
                type="button"
                className="rounded-lg bg-white px-8 py-4 font-bold text-slate-900 transition-all hover:bg-slate-100"
              >
                Subscribe
              </button>
            </div>
          </div>
          {/* Decorative blurs */}
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-slate-600/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        </div>
      </section>
    </main>
  );
}
