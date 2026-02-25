/**
 * Migration 0015 — Add template_slug to virtual_brands for menu board template selection.
 */

export const version = 15;
export const name = '0015_menu_board_templates';

export async function up(sql) {
  await sql`
    ALTER TABLE virtual_brands
    ADD COLUMN IF NOT EXISTS template_slug TEXT DEFAULT NULL
  `;
}
