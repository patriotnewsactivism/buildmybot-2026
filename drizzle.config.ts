import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config();

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Please create a .env file based on .env.example before running Drizzle commands.",
  );
}

export default defineConfig({
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
});
