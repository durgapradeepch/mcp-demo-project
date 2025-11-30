// Configuration file for API keys and settings
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  // LLM Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LLAMA_API_ENDPOINT: process.env.LLAMA_API_ENDPOINT,
  LLAMA_API_KEY: process.env.LLAMA_API_KEY,
  LLM_CHOICE: process.env.LLM_CHOICE || 'llama',
  MODEL_NAME: process.env.MODEL_NAME || 'llama3',
  TOKENIZERS_PARALLELISM: process.env.TOKENIZERS_PARALLELISM || 'false',
  STREAM: process.env.STREAM || 'false',

  // Neo4j Configuration
  NEO4J_CONFIG: {
    "host": process.env.NEO4J_HOST || "127.0.0.1",
    "port": parseInt(process.env.NEO4J_BOLT_PORT) || 7687,
    "username": "neo4j",
    "password": process.env.NEO4J_AUTH ? process.env.NEO4J_AUTH.split('/')[1] : process.env.NEO4J_PASSWORD,
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

  // Legacy Neo4j URLs for backward compatibility (will be deprecated)
  NEO4J_URL: `http://${process.env.NEO4J_HOST || 'localhost'}:${process.env.NEO4J_HTTP_PORT || 7474}`,
  NEO4J_USER: 'neo4j',
  NEO4J_PASS: process.env.NEO4J_AUTH ? process.env.NEO4J_AUTH.split('/')[1] : process.env.NEO4J_PASSWORD,

  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 3001,

  // VictoriaLogs configuration
  VICTORIA_METRICS_URL: process.env.VICTORIA_METRICS_URL || 'https://vlinsert.dev.manifestit.tech/select/vmui',
  VICTORIA_LOGS_API_URL: process.env.VICTORIA_LOGS_API_URL || 'https://vlinsert.dev.manifestit.tech/select/logsql',

  // VictoriaMetrics configuration (for metrics queries)
  VICTORIA_METRICS_SELECT_URL: process.env.VICTORIA_METRICS_SELECT_URL || 'http://vmselect-victoriadb.mit-vm.svc.cluster.local:8481',
  VICTORIA_METRICS_INSERT_URL: process.env.VICTORIA_METRICS_INSERT_URL || 'http://vminsert-victoriadb.mit-vm.svc.cluster.local:8480',

  // Manifest API configuration
  MANIFEST_API_URL: process.env.MANIFEST_API_URL || 'https://api.dev.manifestit.tech',
  MANIFEST_API_KEY: process.env.MANIFEST_API_KEY,
  MANIFEST_ORG_KEY: process.env.MANIFEST_ORG_KEY || 'dev'
};
