import mysql from 'mysql2/promise';

let pool;
let schemaInitialization;

export function getPool() {
  if (!pool) {
    const sslConfig = process.env.DB_CA_CERT
      ? {
          ca: Buffer.from(process.env.DB_CA_CERT, 'base64').toString('utf-8'),
          rejectUnauthorized: true,
        }
      : undefined;

    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 5,
      idleTimeout: 60000,
    });
  }
  return pool;
}

export function ensureSchema() {
  if (!schemaInitialization) {
    const database = getPool();
    schemaInitialization = (async () => {
      await database.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await database.query(`
        CREATE TABLE IF NOT EXISTS stocks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL UNIQUE,
          quantity INT NOT NULL DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )
      `);
    })().catch((error) => {
      schemaInitialization = undefined;
      throw error;
    });
  }

  return schemaInitialization;
}
