import { registerAs } from '@nestjs/config';

export default registerAs('billing', () => ({
  omisePublicKey: process.env.OMISE_PUBLIC_KEY || '',
  omiseSecretKey: process.env.OMISE_SECRET_KEY || '',
}));
