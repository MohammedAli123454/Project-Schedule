// // drizzle.config.ts
// import type { Config } from 'drizzle-kit';

// export default {
//   schema: './db/schema.ts',   // ← path to the file that exports pgTable(...)
//   out:    './migrations',     // ← where SQL migration files will be written
//   driver: 'pg',               // ← using PostgreSQL
//   dbCredentials: {
//     connectionString: process.env.DATABASE_URL!,
//   },
// } satisfies Config;

export default {
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: "./drizzle",
  dbCredentials: {
    url: "postgresql://neondb_owner:npg_S7NOImbxhuL5@ep-green-cell-a1g0k2z1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  }
};


// import type { Config } from 'drizzle-kit';

// export default {
//   schema: './db/schema.ts',
//   out: './drizzle',
//   dialect: 'postgresql',
//   dbCredentials: {
//     url: process.env.DATABASE_URL!,
//   },
// } satisfies Config;