import { BadgeDollarSign, Camera, Globe, Shield, Star, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button, Card, CardContent } from '@lumina/ui';

export const metadata: Metadata = {
  title: 'Become a Host – Lumina',
  description:
    'List your property on Lumina and earn income from travelers seeking extraordinary stays.',
};

const benefits = [
  {
    icon: BadgeDollarSign,
    title: 'Earn on your terms',
    description:
      'Set your own prices, availability, and house rules. Keep the majority of every booking.',
  },
  {
    icon: Shield,
    title: 'Host protection',
    description: 'Every booking includes damage protection and liability coverage up to $1M.',
  },
  {
    icon: Globe,
    title: 'Global exposure',
    description:
      'Reach travelers worldwide with our curated marketplace and search-optimized listings.',
  },
  {
    icon: Star,
    title: 'Build your reputation',
    description: 'Collect verified reviews and become a top-rated host to attract more guests.',
  },
  {
    icon: Camera,
    title: 'Professional tools',
    description:
      'Analytics dashboard, calendar management, and messaging — everything you need in one place.',
  },
  {
    icon: TrendingUp,
    title: 'Smart pricing',
    description: 'Data-driven pricing suggestions to help you maximize your earnings year-round.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Create your listing',
    description: 'Add photos, describe your space, and set your price.',
  },
  {
    step: '02',
    title: 'Get verified',
    description: 'We review your listing to ensure it meets our quality standards.',
  },
  {
    step: '03',
    title: 'Start hosting',
    description: 'Accept bookings, welcome guests, and start earning.',
  },
];

export default function HostPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-20 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Turn your space into income
          </h1>
          <p className="text-primary-foreground/80 mx-auto mb-8 max-w-xl text-lg">
            Join thousands of hosts sharing their unique properties with travelers seeking
            extraordinary stays. List for free — we only earn when you do.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="lg" asChild>
              <Link href="/host/listings">Go to dashboard</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
              asChild
            >
              <Link href="/auth/register">Create account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16">
        <h2 className="mb-10 text-center text-2xl font-bold">How it works</h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="bg-primary text-primary-foreground mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
                {s.step}
              </div>
              <h3 className="mb-1 font-semibold">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/30">
        <div className="container py-16">
          <h2 className="mb-10 text-center text-2xl font-bold">Why host with Lumina</h2>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b) => (
              <Card key={b.title} className="bg-background border-0 shadow-none">
                <CardContent className="p-6">
                  <b.icon className="text-primary mb-3 h-6 w-6" />
                  <h3 className="mb-1 font-semibold">{b.title}</h3>
                  <p className="text-muted-foreground text-sm">{b.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Earnings estimate */}
      <section className="container py-16 text-center">
        <h2 className="mb-2 text-2xl font-bold">Estimate your earnings</h2>
        <p className="text-muted-foreground mb-8">
          Hosts on Lumina earn an average of $2,800/month from a single listing
        </p>
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-8">
          {[
            { value: '$1,200', label: 'Cabin in the woods', sub: 'Avg. 12 nights/month' },
            { value: '$3,500', label: 'City apartment', sub: 'Avg. 20 nights/month' },
            { value: '$8,200', label: 'Luxury villa', sub: 'Avg. 15 nights/month' },
          ].map((e) => (
            <div key={e.label}>
              <div className="text-2xl font-bold">
                {e.value}
                <span className="text-muted-foreground text-base font-normal">/mo</span>
              </div>
              <div className="mt-1 text-sm font-medium">{e.label}</div>
              <div className="text-muted-foreground text-xs">{e.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="bg-primary text-primary-foreground mx-auto max-w-xl rounded-2xl p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold">Ready to start hosting?</h2>
          <p className="text-primary-foreground/80 mb-6">
            Create your account and list your first property in minutes.
          </p>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/host/listings">Create your listing</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
