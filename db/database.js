const knex = require("knex");
const config = require("../knexfile");

const environment = process.env.NODE_ENV || "development";
const connectionConfig = config[environment];

const db = knex(connectionConfig);

module.exports = db;
