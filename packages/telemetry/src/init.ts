import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

/**
 * Initialize OpenTelemetry tracing for a service.
 * Call once at process startup, before any other imports that should be instrumented.
 *
 * Auto-instruments: HTTP, postgres, ioredis, fetch, DNS.
 * Disables noisy filesystem and net instrumentation.
 */
export function initTelemetry(serviceName: string): NodeSDK {
  if (sdk) return sdk;

  const endpoint = process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4317';

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env['npm_package_version'] ?? '0.0.0',
      'deployment.environment.name': process.env['NODE_ENV'] ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations that create too many low-value spans
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown — flush pending spans before process exits
  const shutdown = async () => {
    await sdk?.shutdown();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return sdk;
}
