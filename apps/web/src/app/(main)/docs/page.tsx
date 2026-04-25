import type { Metadata } from 'next';

import { SwaggerUI } from './swagger-ui';

export const metadata: Metadata = {
  title: 'API Documentation',
  description: 'Interactive API documentation for the Lumina Marketplace REST API.',
};

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          API Documentation
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Interactive reference for the Lumina Marketplace REST API. Built with OpenAPI 3.1.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/api/docs/spec"
            target="_blank"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Raw OpenAPI JSON
          </a>
        </div>
      </div>
      <SwaggerUI />
    </div>
  );
}
