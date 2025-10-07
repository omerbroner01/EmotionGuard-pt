import ws from "ws";
import * as schema from "@shared/schema";

// Prefer Neon (production) when DATABASE_URL is provided; otherwise expose
// a very small mock DB object so the server can start locally without
// requiring a provisioned database or additional native dependencies.
let db: any;

// Create a safe synchronous mock DB immediately so other modules can import
// `db` synchronously during module initialization. If a DATABASE_URL is
// provided we'll asynchronously initialize the real Neon/Drizzle client and
// replace the mock at runtime.
const createMockDb = () => {
  return {
    select: (..._args: any[]) => {
      return {
        from: (_: any) => ({
          where: (_: any) => ({
            limit: (_n: number) => Promise.resolve([]),
            orderBy: (_: any) => Promise.resolve([]),
            // allow direct await on where(...) in some callsites
            then: (resolve: any) => resolve([]),
          }),
          then: (resolve: any) => resolve([]),
        }),
        then: (resolve: any) => resolve([]),
      } as any;
    },
    insert: (_table: any) => ({
      values: (v: any) => ({
        returning: async () => [v],
      }),
    }),
    update: (_table: any) => ({
      set: (_v: any) => ({
        where: (_cond: any) => ({
          returning: async () => [ {} ],
        }),
      }),
    }),
    delete: (_table: any) => ({
      where: async (_cond: any) => {
        return;
      },
    }),
    // convenience methods used in some analytics paths
    run: async () => [],
    execute: async () => [],
  };
};

db = createMockDb();

if (process.env.DATABASE_URL) {
  // initialize real DB client asynchronously and replace `db` when ready
  import('@neondatabase/serverless')
    .then(({ Pool, neonConfig }) =>
      import('drizzle-orm/neon-serverless').then(({ drizzle }) => {
        try {
          neonConfig.webSocketConstructor = ws;
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          db = drizzle({ client: pool, schema });
          // eslint-disable-next-line no-console
          console.log('Neon database initialized');
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Failed to initialize Neon DB client:', e);
        }
      })
    )
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Error loading database client libraries:', err);
    });
}

export { db };