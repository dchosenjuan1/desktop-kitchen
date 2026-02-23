export const version = 4;
export const name = 'inventory_sku_barcode';

export async function up(sql) {
  await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku TEXT`;
  await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode TEXT`;
  await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date DATE`;
  await sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lot_number TEXT`;

  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode
    ON inventory_items(tenant_id, barcode) WHERE barcode IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_inventory_items_sku
    ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL`;
}
