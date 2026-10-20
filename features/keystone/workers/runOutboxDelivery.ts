import { configuredOutboxDispatcher } from './outboxDispatchers';
import { OUTBOX_DEFAULT_BATCH, runOutboxDelivery } from './outboxDelivery';

// Usage: tsx features/keystone/workers/runOutboxDelivery.ts [--limit=25] [--watch] [--interval=30]
const WATCH_INTERVAL_SECONDS = 30;

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function pause(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

async function main() {
  const [{ getContext }, PrismaModule, { default: config }] = await Promise.all([
    import('@keystone-6/core/context'), import('@prisma/client'), import('../../../keystone'),
  ]);
  const context = getContext(config, PrismaModule);
  const watch = process.argv.includes('--watch');
  const limit = Number(argument('limit')) || OUTBOX_DEFAULT_BATCH;
  const intervalMs = Math.max(5, Number(argument('interval')) || WATCH_INTERVAL_SECONDS) * 1000;
  const shutdown = new AbortController();
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => shutdown.abort());
  try {
    while (!shutdown.signal.aborted) {
      const run = await runOutboxDelivery(context.prisma, { dispatcher: configuredOutboxDispatcher(), limit, signal: shutdown.signal });
      console.log(JSON.stringify({ at: new Date().toISOString(), ...run }));
      // With no delivery target nothing can change until one is installed, so watching would only repeat this report.
      if (!watch || run.status === 'no_dispatcher') break;
      if (run.claimed < limit) await pause(intervalMs, shutdown.signal);
    }
  } finally {
    await context.prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Outbox delivery stopped: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
