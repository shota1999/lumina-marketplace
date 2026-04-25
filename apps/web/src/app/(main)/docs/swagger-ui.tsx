'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Loads Swagger UI from CDN to avoid SSR/bundle issues with swagger-ui-react.
 * This is the recommended approach for Next.js App Router.
 */
export function SwaggerUI() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SwaggerUIBundle = (window as any).SwaggerUIBundle;
      if (SwaggerUIBundle && containerRef.current) {
        SwaggerUIBundle({
          url: '/api/docs/spec',
          domNode: containerRef.current,
          deepLinking: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
          layout: 'BaseLayout',
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
          docExpansion: 'list',
          filter: true,
          tryItOutEnabled: true,
        });
        setLoaded(true);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, [loaded]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {!loaded && (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-slate-400">Loading API documentation...</div>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
