export const version = 34;
export const name = 'add_table_number_to_orders';

export async function up(sql) {
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(20)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders (table_number) WHERE table_number IS NOT NULL`;
}
