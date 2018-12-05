const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/event_sourcing', max: 100 });

module.exports.pool = pool;
module.exports.runInTransaction = async cb => {
  // note: we don't try/catch this because if connecting throws an exception
  // we don't need to dispose of the client (it will be undefined)
  const client = await pool.connect();
  let value;
  try {
    await client.query('BEGIN');
    value = await cb(client);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return value;
};
