import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service – Lumina',
  description: 'Terms and conditions for using the Lumina rental marketplace.',
};

export default function TermsPage() {
  return (
    <div className="container py-12">
      <article className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: January 1, 2024</p>

        <p>
          Welcome to Lumina Marketplace. By accessing or using our platform, you agree to be bound
          by these Terms of Service (&ldquo;Terms&rdquo;). Please read them carefully.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using Lumina, you agree to these Terms and our Privacy Policy.
          If you do not agree, please do not use the platform.
        </p>

        <h2>2. Accounts</h2>
        <p>
          You must provide accurate information when creating an account. You are responsible for
          maintaining the security of your credentials and for all activity under your account. You
          must be at least 18 years old to use Lumina.
        </p>

        <h2>3. Listings & Bookings</h2>
        <p>
          Hosts are responsible for the accuracy of their listing information, including
          descriptions, photos, pricing, and availability. Guests agree to treat properties with
          respect and follow all house rules.
        </p>
        <p>
          Bookings are a binding agreement between guest and host. Cancellation policies are set by
          individual hosts and displayed on each listing.
        </p>

        <h2>4. Payments</h2>
        <p>
          All prices are displayed in the currency specified on each listing. Lumina charges a
          service fee to guests and a commission to hosts. Payment is processed at the time of
          booking confirmation.
        </p>

        <h2>5. Prohibited Conduct</h2>
        <ul>
          <li>Creating false or misleading listings</li>
          <li>Circumventing the platform to avoid fees</li>
          <li>Harassing other users</li>
          <li>Using the platform for unlawful purposes</li>
          <li>Scraping or automated access without permission</li>
        </ul>

        <h2>6. Content</h2>
        <p>
          You retain ownership of content you upload (photos, reviews, descriptions). By posting
          content, you grant Lumina a non-exclusive, worldwide license to display it on the
          platform.
        </p>

        <h2>7. Reviews</h2>
        <p>
          Reviews must be honest and based on actual experiences. Lumina reserves the right to
          remove reviews that violate our guidelines, including those containing hate speech, spam,
          or personally identifiable information.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          Lumina is a marketplace platform that connects hosts and guests. We are not responsible
          for the condition of properties, the behavior of users, or disputes between parties. Our
          liability is limited to the fees collected by Lumina.
        </p>

        <h2>9. Modifications</h2>
        <p>
          We may update these Terms from time to time. Continued use of Lumina after changes
          constitutes acceptance of the revised Terms.
        </p>

        <h2>10. Contact</h2>
        <p>
          Questions about these Terms? Contact us at{' '}
          <a href="mailto:legal@lumina.dev">legal@lumina.dev</a>.
        </p>
      </article>
    </div>
  );
}
