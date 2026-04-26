import { Globe, Heart, Shield, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button, Card, CardContent } from '@lumina/ui';

export const metadata: Metadata = {
  title: 'About – Lumina',
  description:
    'Learn about Lumina — a premium rental marketplace connecting travelers with extraordinary stays worldwide.',
};

const values = [
  {
    icon: Heart,
    title: 'Curated quality',
    description:
      'Every listing is vetted to meet our standards for comfort, design, and hospitality.',
  },
  {
    icon: Shield,
    title: 'Trust & safety',
    description: 'Verified hosts, secure payments, and 24/7 support for every stay.',
  },
  {
    icon: Globe,
    title: 'Global reach',
    description:
      'From treehouses in Costa Rica to penthouses in Tokyo — discover stays on every continent.',
  },
  {
    icon: Users,
    title: 'Community first',
    description:
      'We empower hosts to share their spaces and guests to find unforgettable experiences.',
  },
];

export default function AboutPage() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Extraordinary stays,
          <br />
          <span className="text-muted-foreground">effortlessly found</span>
        </h1>
        <p className="text-muted-foreground mx-auto max-w-xl text-lg">
          Lumina is a premium rental marketplace that connects discerning travelers with unique
          properties around the world — from beachfront villas to secluded cabins and everything in
          between.
        </p>
      </div>

      {/* Values */}
      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {values.map((v) => (
          <Card key={v.title} className="bg-secondary/50 border-0">
            <CardContent className="p-6">
              <div className="bg-primary/10 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                <v.icon className="text-primary h-5 w-5" />
              </div>
              <h3 className="mb-1 font-semibold">{v.title}</h3>
              <p className="text-muted-foreground text-sm">{v.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-8 text-center">
        {[
          { value: '10K+', label: 'Active listings' },
          { value: '50+', label: 'Countries' },
          { value: '98%', label: 'Guest satisfaction' },
        ].map((stat) => (
          <div key={stat.label}>
            <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
            <div className="text-muted-foreground mt-1 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-primary text-primary-foreground mx-auto mt-16 max-w-xl rounded-2xl p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold">Ready to explore?</h2>
        <p className="text-primary-foreground/80 mb-6">
          Browse our curated collection of extraordinary stays.
        </p>
        <Button variant="secondary" size="lg" asChild>
          <Link href="/search">Start exploring</Link>
        </Button>
      </div>
    </div>
  );
}
