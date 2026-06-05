import { registerAs } from '@nestjs/config';

export default registerAs('media', () => ({
  muxTokenId: process.env.MUX_TOKEN_ID || '',
  muxTokenSecret: process.env.MUX_TOKEN_SECRET || '',
}));
