require("dotenv").config();

module.exports = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || "persona_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "your_password",
    },
    migrations: {
      directory: "./db/migrations",
    },
    seeds: {
      directory: "./db/seeds",
    },
  },
};
