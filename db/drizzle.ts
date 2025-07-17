// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';
// import * as schema from './schema';

// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// export const db = drizzle(pool, { schema });



import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema'; // Import all your schema

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema }); // Add schema here