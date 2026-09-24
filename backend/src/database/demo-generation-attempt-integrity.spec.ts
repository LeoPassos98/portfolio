import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run DEMO generation attempt tests.',
  );
}

const pool = new Pool({ connectionString: databaseUrl });
let client: PoolClient;

describe('DemoGenerationAttempt database integrity', () => {
  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates the independent persistence table with its temporal columns', async () => {
    const table = await client.query<{ table_name: string | null }>(
      `SELECT to_regclass('public.demo_generation_attempt')::text AS table_name`,
    );
    const columns = await client.query<{
      column_name: string;
      data_type: string;
      datetime_precision: number | null;
      character_maximum_length: number | null;
      column_default: string | null;
    }>(
      `SELECT
         column_name,
         data_type,
         datetime_precision,
         character_maximum_length,
         column_default
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'demo_generation_attempt'
       ORDER BY ordinal_position`,
    );

    expect(table.rows[0]?.table_name).toBe('demo_generation_attempt');
    expect(columns.rows).toMatchObject([
      {
        column_name: 'id',
        data_type: 'uuid',
      },
      {
        column_name: 'origin_ip_hash',
        data_type: 'character varying',
        character_maximum_length: 64,
      },
      {
        column_name: 'created_at',
        data_type: 'timestamp with time zone',
        datetime_precision: 6,
        column_default: expect.stringContaining('CURRENT_TIMESTAMP'),
      },
    ]);
  });

  it('indexes origin_ip_hash followed by created_at', async () => {
    const index = await client.query<{ indexdef: string }>(
      `SELECT indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexname = 'demo_generation_attempt_origin_ip_hash_created_at_idx'`,
    );

    expect(index.rows).toHaveLength(1);
    expect(index.rows[0]?.indexdef).toContain('(origin_ip_hash, created_at)');
  });

  it.each(['a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64)])(
    'rejects an invalid origin hash: %s',
    async (originIpHash) => {
      await expect(
        client.query(
          `INSERT INTO "demo_generation_attempt"
             ("id", "origin_ip_hash")
           VALUES ($1, $2)`,
          [randomUUID(), originIpHash],
        ),
      ).rejects.toMatchObject({
        constraint: 'demo_generation_attempt_origin_ip_hash_check',
      });
    },
  );
});
