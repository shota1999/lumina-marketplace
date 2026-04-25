export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    // Initialize OpenTelemetry tracing before anything else
    if (process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || process.env['NODE_ENV'] === 'production') {
      const { initTelemetry } = await import('@lumina/telemetry/init');
      initTelemetry('lumina-web');
    }

    if (process.env['NODE_ENV'] === 'production') {
      // Validate env vars at startup — fail fast if misconfigured
      const { validateServerEnv } = await import('@lumina/shared');
      validateServerEnv(process.env as Record<string, string | undefined>);
    }
  }
}
