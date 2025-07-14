import { z } from 'zod';

const envSchema = z.object({
  ALCHEMY_API_KEY: z.string().min(1, 'ALCHEMY_API_KEY is required'),
  INFURA_API_KEY: z.string().optional(),
  AXOL_API_KEY: z.string().optional(),
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MERCHANT_ADDRESS: z.string().optional(),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>; 