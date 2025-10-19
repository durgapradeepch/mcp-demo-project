const { Pool } = require('pg');
const config = require('./config');

// Create PostgreSQL connection pool
const pool = new Pool({
  host: config.POSTGRES_CONFIG.host,
  port: config.POSTGRES_CONFIG.port,
  database: config.POSTGRES_CONFIG.database,
  user: config.POSTGRES_CONFIG.user,
  password: config.POSTGRES_CONFIG.password,
  connectionTimeoutMillis: config.POSTGRES_CONFIG.connect_timeout * 1000,
  idleTimeoutMillis: config.POSTGRES_CONFIG.idle_in_transaction_session_timeout,
  max: 20, // Maximum number of clients in the pool
  allowExitOnIdle: true,
  options: `-c statement_timeout=${config.POSTGRES_CONFIG.statement_timeout} -c idle_in_transaction_session_timeout=${config.POSTGRES_CONFIG.idle_in_transaction_session_timeout}`
});

// PostgreSQL utility functions
const postgresUtils = {
  // Test connection
  async testConnection() {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      return {
        success: true,
        timestamp: result.rows[0].current_time,
        version: result.rows[0].version
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get database schema information
  async getSchema() {
    try {
      const client = await pool.connect();
      
      // Get tables
      const tablesQuery = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `;
      const tablesResult = await client.query(tablesQuery);
      
      // Get columns for each table
      const tables = {};
      for (const table of tablesResult.rows) {
        const columnsQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `;
        const columnsResult = await client.query(columnsQuery, [table.table_name]);
        tables[table.table_name] = {
          type: table.table_type,
          columns: columnsResult.rows
        };
      }
      
      client.release();
      return { success: true, tables };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get table list
  async getTables() {
    try {
      const client = await pool.connect();
      const query = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `;
      const result = await client.query(query);
      client.release();
      return { success: true, tables: result.rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Query table data
  async queryTable(tableName, limit = 50, offset = 0, whereClause = '') {
    try {
      const client = await pool.connect();
      
      // Validate table name to prevent SQL injection
      const tablesResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
        [tableName]
      );
      
      if (tablesResult.rows.length === 0) {
        throw new Error(`Table '${tableName}' not found`);
      }
      
      let query = `SELECT * FROM "${tableName}"`;
      const params = [];
      
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const result = await client.query(query, params);
      
      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM "${tableName}"`;
      if (whereClause) {
        countQuery += ` WHERE ${whereClause}`;
      }
      const countResult = await client.query(countQuery);
      
      client.release();
      return {
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Execute custom SQL query
  async executeQuery(query, params = []) {
    try {
      const client = await pool.connect();
      const result = await client.query(query, params);
      client.release();
      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        command: result.command
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get database statistics
  async getDatabaseStats() {
    try {
      const client = await pool.connect();
      
      // Get table count and row counts
      const statsQuery = `
        SELECT 
          schemaname,
          relname as tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC;
      `;
      const statsResult = await client.query(statsQuery);
      
      // Get database size
      const sizeQuery = `
        SELECT pg_size_pretty(pg_database_size($1)) as database_size;
      `;
      const sizeResult = await client.query(sizeQuery, [config.POSTGRES_CONFIG.database]);
      
      // Get total tables and total rows
      const totalsQuery = `
        SELECT 
          COUNT(*) as total_tables,
          SUM(n_live_tup) as total_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public';
      `;
      const totalsResult = await client.query(totalsQuery);
      
      client.release();
      return {
        success: true,
        database_size: sizeResult.rows[0].database_size,
        total_tables: parseInt(totalsResult.rows[0].total_tables) || 0,
        total_rows: parseInt(totalsResult.rows[0].total_rows) || 0,
        table_stats: statsResult.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

module.exports = postgresUtils;