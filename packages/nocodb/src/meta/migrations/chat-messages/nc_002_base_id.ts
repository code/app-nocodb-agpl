import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  // Drop all messages — existing ones lack fk_base_id.
  // The v0 migration (nc_202603110001) already drops sessions too.
  await knex(MetaTable.CHAT_MESSAGES).del();

  await knex.schema.alterTable(MetaTable.CHAT_MESSAGES, (table) => {
    table.string('fk_base_id', 20);
  });
};

const down = async (knex: Knex) => {
  await knex.schema.alterTable(MetaTable.CHAT_MESSAGES, (table) => {
    table.dropColumn('fk_base_id');
  });
};

export { up, down };
