// Configuration file for API keys and settings
module.exports = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
  NEO4J_URL: process.env.NEO4J_URL || 'http://localhost:7474',
  NEO4J_USER: process.env.NEO4J_USER || 'neo4j',
  NEO4J_PASS: process.env.NEO4J_PASS || 'password',
  SERVER_PORT: process.env.SERVER_PORT || 3001,
  // VictoriaLogs configuration (corrected)
  VICTORIA_LOGS_URL: process.env.VICTORIA_LOGS_URL || 'https://vlinsert.dev.manifestit.tech/select/vmui',
  VICTORIA_LOGS_API_URL: process.env.VICTORIA_LOGS_API_URL || 'https://vlinsert.dev.manifestit.tech/select/logsql'
};
