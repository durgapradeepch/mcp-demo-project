#!/bin/bash
# Neo4j Initialization Script
# This script runs when Neo4j container starts for the first time

echo "Starting Neo4j initialization..."

# Wait for Neo4j to be fully ready
sleep 10

# Create some sample constraints (optional - remove if not needed)
cypher-shell -u neo4j -p testing@neo4j "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Person) REQUIRE n.id IS UNIQUE;"
cypher-shell -u neo4j -p testing@neo4j "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Company) REQUIRE n.id IS UNIQUE;"

# Create indexes for better query performance
cypher-shell -u neo4j -p testing@neo4j "CREATE INDEX IF NOT EXISTS FOR (n:Person) ON (n.name);"
cypher-shell -u neo4j -p testing@neo4j "CREATE INDEX IF NOT EXISTS FOR (n:Company) ON (n.name);"

echo "Neo4j initialization complete!"
echo "You can now connect to Neo4j at:"
echo "  - Browser UI: http://localhost:7474"
echo "  - Bolt: bolt://localhost:7687"
echo "  - Username: neo4j"
echo "  - Password: testing@neo4j"
