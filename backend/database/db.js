const { Pool } = require('pg');
require('dotenv').config();

// ✅ Hardcoded password (للـ development)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '2255', // غيّر ده لو الباسورد مختلف
  database: 'salmabehery'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect()
};