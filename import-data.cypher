// Neo4j Import Script for nodes.csv and relationships.csv
// These files contain Neo4j export data with JSON-encoded properties

// ====================================
// STEP 1: Import Nodes
// ====================================

// The nodes.csv has columns: _id, _labels, n (JSON properties)
LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row._id IS NOT NULL
CALL apoc.load.json('data:application/json;charset=utf-8;base64,' + apoc.text.base64Encode(row.n)) YIELD value
WITH row, value, apoc.convert.fromJsonList(row._labels) AS labels
CALL apoc.create.node(labels, value.properties) YIELD node
RETURN count(node) as nodes_created;

// Alternative simpler version if APOC is not available:
// This creates nodes with the raw JSON as a property
LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
WITH row WHERE row._id IS NOT NULL
CREATE (n:ImportedNode {
  original_id: toInteger(row._id),
  labels: row._labels,
  data: row.n
})
RETURN count(n) as nodes_imported;

// ====================================
// STEP 2: Create Index for faster relationship creation
// ====================================

CREATE INDEX imported_node_id IF NOT EXISTS FOR (n:ImportedNode) ON (n.original_id);

// ====================================
// STEP 3: Import Relationships
// ====================================

// The relationships.csv has columns: _rid, _type, _start, _end, r (JSON properties)
LOAD CSV WITH HEADERS FROM 'file:///relationships.csv' AS row
WITH row WHERE row._rid IS NOT NULL
MATCH (start:ImportedNode {original_id: toInteger(row._start)})
MATCH (end:ImportedNode {original_id: toInteger(row._end)})
CALL apoc.create.relationship(start, row._type, {
  original_id: toInteger(row._rid),
  data: row.r
}, end) YIELD rel
RETURN count(rel) as relationships_created;

// ====================================
// STEP 4: Verify Import
// ====================================

// Count nodes
MATCH (n:ImportedNode) RETURN count(n) as total_nodes;

// Count relationships
MATCH ()-[r]->() RETURN count(r) as total_relationships;

// Show sample nodes
MATCH (n:ImportedNode) RETURN n LIMIT 25;

// Show sample relationships
MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 25;
