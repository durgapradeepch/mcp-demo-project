#!/usr/bin/env python3
"""
Import Neo4j CSV files (nodes.csv and relationships.csv) into Neo4j database
These files contain JSON-encoded Neo4j export data
"""

import csv
import json
import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Neo4j Connection from environment variables
URI = f"bolt://{os.getenv('NEO4J_HOST', 'localhost')}:{os.getenv('NEO4J_BOLT_PORT', '7687')}"
USERNAME = os.getenv('NEO4J_USER', 'neo4j')
PASSWORD = os.getenv('NEO4J_PASSWORD', 'testing@neo4j')
DATABASE = os.getenv('NEO4J_DATABASE', 'neo4j')

def parse_json_property(json_str):
    """Parse the JSON property string"""
    try:
        return json.loads(json_str)
    except:
        return {}

def import_nodes(driver, csv_file="/Users/pradeep/mcp-demo-project/nodes.csv"):
    """Import nodes from CSV file"""
    print(f"📥 Importing nodes from {csv_file}...")
    
    with driver.session(database=DATABASE) as session:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                node_id = int(row['_id'])
                labels_str = row['_labels'].strip('"')
                labels = json.loads(labels_str)
                node_data = parse_json_property(row['n'])
                
                properties = node_data.get('properties', {})
                properties['original_id'] = node_id
                
                # Create node with dynamic labels
                label_str = ':'.join(labels) if labels else 'Node'
                
                query = f"""
                CREATE (n:{label_str})
                SET n = $properties
                """
                
                session.run(query, properties=properties)
                count += 1
                
                if count % 100 == 0:
                    print(f"  ✓ Imported {count} nodes...")
    
    print(f"✅ Total nodes imported: {count}")
    return count

def import_relationships(driver, csv_file="/Users/pradeep/mcp-demo-project/relationships.csv"):
    """Import relationships from CSV file"""
    print(f"📥 Importing relationships from {csv_file}...")
    
    with driver.session(database=DATABASE) as session:
        # First create index for faster lookups
        print("  Creating index on original_id...")
        try:
            session.run("CREATE INDEX IF NOT EXISTS FOR (n) ON (n.original_id)")
        except:
            # Index might already exist, continue
            pass
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            
            for row in reader:
                rel_id = int(row['_rid'])
                rel_type = row['_type']
                start_id = int(row['_start'])
                end_id = int(row['_end'])
                rel_data = parse_json_property(row['r'])
                
                properties = rel_data.get('properties', {})
                properties['original_id'] = rel_id
                
                query = f"""
                MATCH (start {{original_id: $start_id}})
                MATCH (end {{original_id: $end_id}})
                CREATE (start)-[r:{rel_type}]->(end)
                SET r = $properties
                """
                
                session.run(query, 
                          start_id=start_id, 
                          end_id=end_id, 
                          properties=properties)
                count += 1
                
                if count % 100 == 0:
                    print(f"  ✓ Imported {count} relationships...")
    
    print(f"✅ Total relationships imported: {count}")
    return count

def verify_import(driver):
    """Verify the import was successful"""
    print("\n📊 Verifying import...")
    
    with driver.session(database=DATABASE) as session:
        # Count nodes
        result = session.run("MATCH (n) RETURN count(n) as count")
        node_count = result.single()['count']
        print(f"  Total nodes: {node_count}")
        
        # Count relationships
        result = session.run("MATCH ()-[r]->() RETURN count(r) as count")
        rel_count = result.single()['count']
        print(f"  Total relationships: {rel_count}")
        
        # Get node labels
        result = session.run("CALL db.labels()")
        labels = [record['label'] for record in result]
        print(f"  Node labels: {', '.join(labels)}")
        
        # Get relationship types
        result = session.run("CALL db.relationshipTypes()")
        rel_types = [record['relationshipType'] for record in result]
        print(f"  Relationship types: {', '.join(rel_types[:10])}{'...' if len(rel_types) > 10 else ''}")

def main():
    print("🚀 Starting Neo4j CSV Import...")
    print(f"📡 Connecting to {URI}...")
    
    try:
        driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
        driver.verify_connectivity()
        print("✅ Connected to Neo4j\n")
        
        # Import nodes
        import_nodes(driver)
        
        # Import relationships
        import_relationships(driver)
        
        # Verify
        verify_import(driver)
        
        print("\n✅ Import completed successfully!")
        print("\n💡 You can now:")
        print("   - View data in Neo4j Browser: http://localhost:7474")
        print("   - Query via MCP Server: http://localhost:3001")
        print("   - Use the chatbox: http://localhost:5173")
        
        driver.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
