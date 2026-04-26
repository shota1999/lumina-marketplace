import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – Lumina',
  description: 'How Lumina collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="container py-12">
      <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: January 1, 2024</p>

        <p>
          Lumina Marketplace (&ldquo;Lumina,&rdquo; &ldquo;we,&rdquo; &ldquo;our&rdquo;) is
          committed to protecting your privacy. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you visit our platform.
        </p>

        <h2>Information We Collect</h2>
        <h3>Personal Information</h3>
        <p>
          When you create an account, we collect your name, email address, and password (stored as a
          bcrypt hash). If you make a booking, we collect additional details such as check-in and
          check-out dates and guest count.
        </p>

        <h3>Usage Data</h3>
        <p>
          We automatically collect information about how you interact with our platform, including
          pages visited, search queries, listings viewed, and actions taken (favorites, bookings).
          This data helps us improve the experience.
        </p>

        <h3>Cookies</h3>
        <p>
          We use a session cookie (<code>lumina_session</code>) to keep you signed in. This cookie
          is HTTP-only, secure in production, and expires after 30 days of inactivity.
        </p>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain our platform</li>
          <li>To process bookings and communicate with hosts</li>
          <li>To personalize your experience (favorites, saved searches)</li>
          <li>To send you relevant notifications about your bookings</li>
          <li>To improve our platform through analytics</li>
          <li>To prevent fraud and ensure security</li>
        </ul>

        <h2>Data Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with hosts when you make a
          booking (name and dates), and with service providers that help us operate the platform
          (hosting, analytics, search).
        </p>

        <h2>Data Security</h2>
        <p>
          We implement industry-standard security measures including encrypted connections (TLS),
          hashed passwords (bcrypt with cost factor 12), and secure session management.
        </p>

        <h2>Your Rights</h2>
        <p>
          You can update or delete your account information at any time from your account settings.
          To request a full data export or deletion, contact us at privacy@lumina.dev.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, contact us at{' '}
          <a href="mailto:privacy@lumina.dev">privacy@lumina.dev</a>.
        </p>
      </article>
    </div>
  );
}
