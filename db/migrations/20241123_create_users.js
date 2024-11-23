exports.up = function (knex) {
  return knex.schema.createTable("users", (table) => {
    table.increments("id").primary();
    table.string("email").notNullable().unique();
    table.string("password").notNullable();
    table.string("first_name");
    table.string("last_name");
    table.string("reset_token");
    table.timestamp("reset_token_expires");
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("users");
};
