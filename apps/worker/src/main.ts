import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker(
  'jovo-jobs',
  async (job) => {
    switch (job.name) {
      case 'scheduled-message':
        // Phase 2 wires this handler to the authoritative message service.
        console.info(`[worker] scheduled-message ${job.id} qabul qilindi`);
        return { accepted: true };
      case 'media-scan':
        // Phase 3 requires a configured scanner; fail closed until then.
        throw new Error('Media skaneri hali konfiguratsiya qilinmagan');
      default:
        throw new Error(`Noma'lum vazifa: ${job.name}`);
    }
  },
  { connection, concurrency: 4 },
);

worker.on('ready', () => console.info('[worker] Redis bilan ulandi'));
worker.on('failed', (job, error) => console.error(`[worker] ${job?.name ?? 'job'} bajarilmadi: ${error.message}`));

async function shutdown() {
  await worker.close();
  await connection.quit();
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
