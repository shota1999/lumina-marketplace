import {
  ArrowRight,
  ArrowUpRight,
  Bed,
  Building,
  Castle,
  Mountain,
  Sailboat,
  Star,
  TreePine,
  Warehouse,
  Waves,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { HeroSearchBar } from '@/components/search/hero-search-bar';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { slug: 'villa', label: 'Villa', icon: Building },
  { slug: 'cabin', label: 'Cabin', icon: TreePine },
  { slug: 'treehouse', label: 'Treehouse', icon: Mountain },
  { slug: 'boat', label: 'Boat', icon: Sailboat },
  { slug: 'castle', label: 'Castle', icon: Castle },
  { slug: 'farmhouse', label: 'Farmhouse', icon: Warehouse },
];

const FEATURED_SIDE = [
  {
    tag: 'Hidden Gem',
    title: 'Seaside Driftwood Cabin',
    location: 'Tulum, Mexico',
    price: '$480',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBC1Liw1rUKvw-hpzu__Zwn4BgYZ7ZDoCiXi_ebSmTwM2ZvE7bj2d0rxwX7J1WhlUAKJlxeVk7znnxA5NZNPajEUmeJmYbQzxIy0OLiQ3FQ9aiJiOLFe2d9B7cgANyLXE0PScPU7Cv0z39LgObB9sqB2b9gVDI7iij9qj0O5UcFTh0V2z_Ss7pdzFN7SpgFCGsZHcIfz4s_pjfR4M3aeMyPPHCSFJ1Ml_whYIc8SPo1ruElN_KzJTlwlLBf4aBCsLjjZAn65Rx9A24',
    href: '/search?category=cabin',
  },
  {
    tag: 'Winter Retreat',
    title: 'Midnight Pine Lodge',
    location: 'Aspen, Colorado',
    price: '$890',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAL6HADpGonysddyJxo4q4u95QW5-uMixpsrZm0FybN1k_STSjFH6ndpFjkzmCH_Zi0ewRqe77iduKB1QWXMIBGYXIR00chKQY_1BhuvfSZuV7QB66_VocQjfpM65X0sl-jSHcxxOk9gcS2mlPZcbFYze0cT7Z13LDuW6FRFymS0OGgujnBrwzbQ0Ej76TIPvGkLGJohXZgG_KiFFzaotcGtPnhz6sDB3H0BB8Ph1Ll1HfTKf0CRAwx2YMdojPd0biCMci9DZGjnLQ',
    href: '/search?category=cabin',
  },
  {
    tag: 'Penthouse',
    title: 'The Sky Loft',
    location: 'Tokyo, Japan',
    price: '$1,200',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDH0JdlCJ_2FOXL0I4SjeIC_HjS-_zsT0qROJXlVCzStpUbK32q_GBwPnFgetOEpbNsfb7E5krTS6w7VzSxKnzy1xyhizwyzfGq7tl_sY3x6agaxEOgPfTkYOn6OlJnBlpHdrQ7q3UMGpP7UY_cbbe4fL3euaal_n8CChTcqhzYny9zfj0HOMLRmR35T2daK9PPT22fsypNUlLbwDAetwriHf5Drn0XmWlLV0vdYMdMfwMivSL0uNU9aIXh3SNIV7jB9he-sAya8-M',
    href: '/search?category=penthouse',
  },
];

const DESTINATIONS = [
  {
    name: 'Malibu',
    count: '120 Properties',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDXcIuD4c9pnhD2o7aSgKC7NRzyT0omddtmqQKisrr_93CAP8ezxd1nQTJ__xuALfAI3VTTpDJ6tHsA6ef1km6p7oAoZVCgv8XIYoOTEMEJdi6M16nJVDzZZmjITA9cdVh3k2UVxazMnB2BcNVYIEyn1hnU1lOIlfuPZIKo5kXyMbQviH1sZ41tzl13iKfn9M6dPPocY8ivPINPKJFVzv4GQEyMWgigODp0Ud1Sw0C9fnkHIh8oVvvaNWL1tBP32f5PAx63_taeGnI',
    href: '/search?location=malibu',
  },
  {
    name: 'Aspen',
    count: '85 Properties',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD_-RBE_iRqluDvYY7eTQZwsvXMzYIW1Ro5rSHYPm62xPTkscy3Lc88NACr3ZmfyGgxleGyaOs-mNAZnIoeYQA0w0bak4Gr5XiT7ak6KTAFWjQ3Rk0Y1Mr3gW9CEMpyiTyMp-I9vIYURF3miDrjPZvomi1qV6OOcQGKddM74SaOOZnzCRmYYvTPIFlsEvpiLY61Br4xvLsq2le88HwosBX11pRRejABW99VGPnpDQ-5FsVk5rKaggff7TALMo80qaaJazh3nVV2K-M',
    href: '/search?location=aspen',
  },
  {
    name: 'Big Sur',
    count: '45 Properties',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAy5FPbuSMq77H2VzUPN6mgwZGmaypXV4-gZq3LtaTFU8hiHlaKnS9vdhCfQK6hZQJjF4tj8vKcjSumHJC62aJxbjNxnOnNEE_vBiONorBjGiSKEo2taAPTsYlLS_3VvlF6kTLTA9YyU6ocAlzxRWGQbw79empF-2p9VHotv7DGzrTH7RWBTb3zlx_nHf-ifP1CiDxq25h5riBhpBzf0PEuJxLkt1xab0nT4edAT4JqCcH0P7k9yTmMG16x2iYzBx0lAMNo4yWE_ZI',
    href: '/search?location=big-sur',
  },
  {
    name: 'Miami Beach',
    count: '210 Properties',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA96VFuJ2WMtKJ7KDb4JfRcxO9JGnzBWr5fAB2RqJPNr4csbKsBKE4PO0GPkiua5Ia6gT2GFkyBPdzxBzrHoqXSJ5VCL8bnOgopaqd7Z0C4Qrba43AvKlwTewhLoGeGNOldeLZQou5pxIcxcIB9ZXtqhBuOSl97QyxAyX2RXotGGWsTxHYBAlKs889Cl9k91_zDWT4I0zY7036FyKO1W9ZN3mafTViaFGL7XzHXIQaJkV5_TQnB5BnT8n73GNKRKETkpojCmu1bR_s',
    href: '/search?location=miami-beach',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative z-30 flex h-[870px] items-center justify-center bg-slate-900">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCrI-3Azufoo12onaf1KXbXhvOl8yIwiCCVkUYRgH2hPIkRXsJWhSFoMIYKqaOgZKZGJcH94RNUvtgbyHdwU-kbI0b8lFQp6EExdGBXiGxk2Ew2TxjwYxMPmGFxhjJQMh8-JtzNFQda41Uv5y5qrD9ePP8hmhKZ7KXDJKCo31X9C0UIdo9VwV2gMxfYblv00YaMhOQp8pItnpZUnObF6O0fk4Ki1WdtmmFjb5fQanUl_iPhV9XaExEqrKDUPdZJXU4ZYU95BGmu8BM"
            alt="Modern luxury villa with infinity pool at dusk"
            fill
            className="object-cover opacity-60"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1600px] px-8 text-center">
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight text-white md:text-7xl">
            Extraordinary stays, <br />
            <span className="font-light italic text-amber-400">curated for you</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg font-light leading-relaxed text-slate-200 md:text-xl">
            Discover premium villas, unique cabins, and architectural wonders across the globe,
            hand-picked for the discerning traveler.
          </p>

          {/* Search bar */}
          <div className="mx-auto max-w-4xl">
            <Suspense>
              <HeroSearchBar />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-[1600px] px-8 py-20">
        <div className="grid grid-cols-3 gap-8 md:grid-cols-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/search?category=${cat.slug}`}
              className="group flex cursor-pointer flex-col items-center gap-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 transition-colors duration-300 group-hover:bg-slate-100 dark:bg-slate-800 dark:group-hover:bg-slate-700">
                <cat.icon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Stays — Spotlight + Filmstrip */}
      <section className="mx-auto mb-32 max-w-[1600px] px-8">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <span className="h-px w-8 bg-slate-300" />
              Curated Collection
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-5xl">
              In the spotlight <span className="font-light italic text-amber-500">this week</span>
            </h2>
            <p className="mt-3 text-base text-slate-500">
              One headline stay, three quietly remarkable companions — refreshed by our editors
              every Monday.
            </p>
          </div>
          <Link
            href="/search?featured=true"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-all hover:border-slate-900 hover:bg-slate-900 hover:text-white"
          >
            Browse all properties
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Spotlight: split image / content */}
        <Link
          href="/search?category=villa"
          className="group mb-10 grid grid-cols-12 overflow-hidden rounded-3xl bg-white shadow-[0_30px_60px_-30px_rgb(15_23_42_/_0.25)] ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="relative col-span-12 aspect-[4/3] overflow-hidden md:col-span-7 md:aspect-auto">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCoQS826b6pK2mDV-ZpXst-qsqzLuY8ltahQugjnWpgo-CcUykUBI9pXPdwFf8uy4Y76GnCNq4Tn-CYPsk5kr9K3fztzR1UcVv2IYMrwvBjNNBlkUxn3sA0LWdecNWS5AqiGFRpOJghc2S4YrI3SNat8zB2zwX_aSmdTBdoUDj0Pbdg58E-_fwNEHIOc6xZeOAmtGQ19UfUeMwtmmHAmUw_d3lvjn_qAw4yP3wqlr9fE9AHIafFKGxtrvT32CVSdlMzbV0ZSAe3vWc"
              alt="Ultra-modern coastal mansion with glass windows and pool overlooking the Mediterranean"
              fill
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, 58vw"
            />
            <span className="absolute left-6 top-6 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 shadow-sm backdrop-blur-sm">
              Editor&rsquo;s Pick
            </span>
            <span className="absolute right-6 top-6 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-slate-900">4.98</span>
              <span className="text-[11px] text-slate-500">(218)</span>
            </span>
          </div>
          <div className="col-span-12 flex flex-col justify-between gap-10 p-10 md:col-span-5 md:p-14">
            <div>
              <div className="mb-6 flex items-baseline gap-3">
                <span className="font-serif text-3xl font-light italic text-amber-500">01</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Architectural Masterpiece
                </span>
              </div>
              <h3 className="mb-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
                The Glass Pavilion
              </h3>
              <p className="mb-6 text-sm uppercase tracking-widest text-slate-500">
                Amalfi Coast, Italy
              </p>
              <p className="mb-8 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                Cantilevered above a private cove, this seven-bedroom retreat opens entirely to the
                Mediterranean — built by Studio Visconti to disappear into its cliffside.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <Bed className="h-3.5 w-3.5" /> 4 Bedrooms
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <Waves className="h-3.5 w-3.5" /> Private Pool
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  From
                </span>
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  $2,450{' '}
                  <span className="text-sm font-normal text-slate-400">/ night</span>
                </span>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition-all group-hover:scale-110 group-hover:bg-amber-500 dark:bg-slate-50 dark:text-slate-900">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        </Link>

        {/* Filmstrip */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURED_SIDE.map((item, idx) => (
            <Link key={item.title} href={item.href} className="group block">
              <div className="relative mb-4 aspect-[5/4] overflow-hidden rounded-2xl">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                  sizes="(max-width: 768px) 100vw, 30vw"
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5" />
                <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700 shadow-sm backdrop-blur-sm">
                  {item.tag}
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-lg font-light italic text-amber-500">
                  {String(idx + 2).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-amber-600 dark:text-slate-50">
                    {item.title}
                  </h4>
                  <p className="text-xs uppercase tracking-widest text-slate-500">
                    {item.location}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-50">
                  {item.price}
                  <span className="ml-0.5 font-normal text-slate-400">/n</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Popular Destinations — Editorial Strips */}
      <section className="mb-32 bg-slate-50 py-24 dark:bg-slate-900/50">
        <div className="mx-auto max-w-[1600px] px-8">
          <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <span className="h-px w-8 bg-slate-300" />
                Where To Next
              </span>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-5xl">
                Destinations our members
                <span className="font-light italic text-amber-500"> can&rsquo;t stop booking</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-col">
            {DESTINATIONS.map((dest, idx) => (
              <Link
                key={dest.name}
                href={dest.href}
                className={`group grid grid-cols-12 items-center gap-8 border-t border-slate-200 py-10 transition-colors hover:bg-white/60 dark:border-slate-800 dark:hover:bg-slate-900/40 ${
                  idx === DESTINATIONS.length - 1 ? 'border-b' : ''
                }`}
              >
                <span
                  className={`col-span-2 font-serif text-3xl font-light italic text-slate-400 transition-colors group-hover:text-amber-500 md:text-4xl ${
                    idx % 2 === 1 ? 'md:order-3 md:text-right' : ''
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div
                  className={`col-span-10 flex items-center gap-6 md:col-span-6 md:gap-10 ${
                    idx % 2 === 1 ? 'md:order-2' : ''
                  }`}
                >
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl shadow-sm md:h-28 md:w-44">
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                      sizes="(max-width: 768px) 128px, 176px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-amber-600 dark:text-slate-50 md:text-3xl">
                      {dest.name}
                    </h3>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {dest.count}
                    </p>
                  </div>
                </div>

                <div
                  className={`col-span-12 flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-slate-50 md:col-span-4 md:justify-end ${
                    idx % 2 === 1 ? 'md:order-1 md:justify-start' : ''
                  }`}
                >
                  <span className="hidden text-slate-500 transition-colors group-hover:text-slate-900 md:inline">
                    Explore the collection
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 transition-all group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Host — Split CTA */}
      <section className="mx-auto mb-32 max-w-[1600px] px-8">
        <div className="grid grid-cols-12 overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-[0_40px_80px_-40px_rgb(15_23_42_/_0.5)]">
          <div className="relative col-span-12 aspect-[4/3] md:col-span-6 md:aspect-auto">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAP853cz9RdtRoVaF2w3GIqrGAsF3WXo_UHaocnnpjvTe9ByXPR53DOtDKlk0ZAzlIdxyQidNDGxv1Bn2EVPlj0GTk8ZkyPmcSpd3hFp7VeOx1LK0FAzN2Xhei7Lk9tCg2f1DZ6hyXazQWSpE7Rl2m4IvuTeVVpcmUJhnmnfCJ0a_sGlQnLAl7lflHSbPKouBISxzJL_bdaW1tuy4SwIaf0GfvRswBo3xeAOHuCL1_GSHXoNkGnGlTzcKsLbBLImaiQnEW2to_PT7U"
              alt="Sunlit interior of a curated host home"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-slate-900/30" />
            <div className="absolute bottom-8 left-8 hidden rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur-sm md:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Avg. monthly host earnings
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                $4,820
                <span className="ml-1 text-xs font-normal text-emerald-600">+12% YoY</span>
              </p>
            </div>
          </div>

          <div className="col-span-12 flex flex-col justify-center gap-8 p-12 md:col-span-6 md:p-16 lg:p-20">
            <span className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-400">
              <span className="h-px w-8 bg-amber-400/60" />
              For Hosts
            </span>
            <h2 className="text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl lg:text-6xl">
              Open your doors.
              <br />
              <span className="font-light italic text-amber-400">Earn beautifully.</span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-300">
              Join a curated network of hosts welcoming travelers who care as much about your
              space as you do. We handle the marketing, payments, and concierge — you focus on
              making it memorable.
            </p>

            <dl className="grid grid-cols-3 gap-6 border-y border-white/10 py-6">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Hosts
                </dt>
                <dd className="mt-1 text-2xl font-bold text-white">3,200+</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Countries
                </dt>
                <dd className="mt-1 text-2xl font-bold text-white">48</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Avg. Rating
                </dt>
                <dd className="mt-1 flex items-baseline gap-1 text-2xl font-bold text-white">
                  4.92
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/host"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-amber-400"
              >
                List your property
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/host#how-it-works"
                className="text-sm font-semibold text-slate-300 underline underline-offset-4 transition-colors hover:text-white"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

