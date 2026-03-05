const { Client } = require('pg');

const adminUser = process.env.PG_ADMIN_USER || 'postgres';
const adminPassword = process.env.PG_ADMIN_PASSWORD || 'postgres';
const host = process.env.PG_HOST || 'localhost';
const port = Number(process.env.PG_PORT || '6432');

const appUser = process.env.APP_DB_USER || 'jkpay';
const appPassword = process.env.APP_DB_PASSWORD || 'change_me_to_a_strong_psw';
const appDb = process.env.APP_DB_NAME || 'jkpay';

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function run() {
  const client = new Client({
    host,
    port,
    user: adminUser,
    password: adminPassword,
    database: 'postgres',
  });

  await client.connect();
  console.log(`Connected as ${adminUser} to ${host}:${port}`);

  const roleExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
  if (roleExists.rowCount === 0) {
    await client.query(`CREATE ROLE ${quoteIdent(appUser)} WITH LOGIN PASSWORD ${quoteLiteral(appPassword)}`);
    console.log(`Created role ${appUser}`);
  } else {
    await client.query(`ALTER ROLE ${quoteIdent(appUser)} WITH LOGIN PASSWORD ${quoteLiteral(appPassword)}`);
    console.log(`Role ${appUser} exists; password updated`);
  }

  const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [appDb]);
  if (dbExists.rowCount === 0) {
    await client.query(`CREATE DATABASE ${quoteIdent(appDb)} OWNER ${quoteIdent(appUser)}`);
    console.log(`Created database ${appDb}`);
  } else {
    console.log(`Database ${appDb} already exists`);
  }

  await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${quoteIdent(appDb)} TO ${quoteIdent(appUser)}`);
  console.log(`Granted privileges on ${appDb} to ${appUser}`);

  await client.end();
}

run().catch((error) => {
  console.error('init-db failed:', error.message);
  process.exit(1);
});
