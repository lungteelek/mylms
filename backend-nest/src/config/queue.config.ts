import { registerAs } from '@nestjs/config';

export default registerAs('queue', () => ({
  driver: process.env.QUEUE_DRIVER || 'inline',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
}));
