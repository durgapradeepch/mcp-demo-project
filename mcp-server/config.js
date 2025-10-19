// Configuration file for API keys and settings
require('dotenv').config({ path: '../.env' });

module.exports = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Neo4j Configuration
  NEO4J_CONFIG: {
    "host": process.env.NEO4J_HOST || "127.0.0.1",
    "port": parseInt(process.env.NEO4J_BOLT_PORT) || 7687,
    "username": "neo4j",
    "password": process.env.NEO4J_AUTH ? process.env.NEO4J_AUTH.split('/')[1] : "testing@neo4j",
    "database": process.env.NEO4J_DATABASE || "neo4j",
    "import_dir": "/var/lib/neo4j/import",  // Neo4j import directory for LOAD CSV
    // Bulk upload configuration
    "bulk_upload": {
        "enabled": true,
        "batch_size": 1000,  // Larger batches for Neo4j LOAD CSV
        "temp_dir": "temp/write_through",
        "cleanup_temp_files": true,
        "use_load_csv": true,  // Use LOAD CSV method for bulk import
        "create_constraints": true  // Automatically create uniqueness constraints
    }
  },
  
  // PostgreSQL Configuration
  POSTGRES_CONFIG: {
    "host": process.env.POSTGRES_HOST || "localhost",
    "port": parseInt(process.env.POSTGRES_PORT) || 5433,
    "database": process.env.POSTGRES_DB || "dev",
    "user": process.env.POSTGRES_USER || "dbuser",
    "password": process.env.POSTGRES_PASSWORD || "i9vtRBbM0Y7dex7S",
    "connect_timeout": parseInt(process.env.POSTGRES_CONNECT_TIMEOUT) || 5,
    "statement_timeout": parseInt(process.env.POSTGRES_STATEMENT_TIMEOUT) || 30000,
    "idle_in_transaction_session_timeout": parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 300000,
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5
  },
  
  // Legacy Neo4j URLs for backward compatibility (will be deprecated)
  NEO4J_URL: `http://${process.env.NEO4J_HOST || 'localhost'}:${process.env.NEO4J_HTTP_PORT || 7474}`,
  NEO4J_USER: 'neo4j',
  NEO4J_PASS: process.env.NEO4J_AUTH ? process.env.NEO4J_AUTH.split('/')[1] : 'testing@neo4j',
  
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 3001,
  
  // VictoriaLogs configuration
  VICTORIA_METRICS_URL: process.env.VICTORIA_METRICS_URL || 'https://vlinsert.dev.manifestit.tech/select/vmui',
  VICTORIA_LOGS_API_URL: process.env.VICTORIA_LOGS_API_URL || 'https://vlinsert.dev.manifestit.tech/select/logsql'
};
