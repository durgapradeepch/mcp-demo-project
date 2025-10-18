# Logs Display Interface Guide

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Group By: [Provider ▼]  Sort By: [Timestamp ▼]  Order: [Desc ▼] │
├─────────────────────────────────────────────────────────────────┤
│  Total Logs: 150          Groups: 3                             │
├─────────────────────────────────────────────────────────────────┤
│  📦 VictoriaLogs (95 logs)                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🕒 2025-10-16 12:30:45  [ERROR] 📦 VictoriaLogs 🏷️ App  ▶│ │
│  │   Database connection timeout occurred                     │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │ 🕒 2025-10-16 12:29:12  [WARN]  📦 VictoriaLogs 🏷️ API  ▶│ │
│  │   High response time detected on endpoint                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  📦 Neo4j Service (35 logs)                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🕒 2025-10-16 12:28:33  [INFO]  📦 Neo4j      🏷️ Query ▶│ │
│  │   Executed cypher query successfully                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  📦 System (20 logs)                                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🕒 2025-10-16 12:27:10  [DEBUG] 📦 System     🏷️ Core  ▶│ │
│  │   Component initialized with config                        │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Expanded Log Entry View

```
┌─────────────────────────────────────────────────────────────────┐
│ 🕒 2025-10-16 12:30:45  [ERROR] 📦 VictoriaLogs 🏷️ App 📋 DB ▼│
│   Database connection timeout occurred                          │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ {                                                         │  │
│ │   "_time": "2025-10-16T12:30:45.123Z",                  │  │
│ │   "_msg": "Database connection timeout occurred",        │  │
│ │   "level": "ERROR",                                      │  │
│ │   "provider": "VictoriaLogs",                           │  │
│ │   "type": "Application",                                 │  │
│ │   "subtype": "Database",                                 │  │
│ │   "connection_id": "conn_12345",                         │  │
│ │   "timeout_ms": 5000,                                    │  │
│ │   "retry_count": 3,                                      │  │
│ │   "host": "db.example.com:5432",                         │  │
│ │   "error_code": "ECONNREFUSED"                           │  │
│ │ }                                                         │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Severity Levels

- 🔴 **ERROR / FATAL / CRITICAL** - Red (#ff4444)
- 🟠 **WARN** - Orange (#ff9800)
- 🔵 **INFO** - Blue (#2196f3)
- ⚫ **DEBUG** - Gray (#9e9e9e)
- 🟢 **Other** - Green (#4caf50)

### Component Colors

- 📦 **Provider Badge** - Blue background
- 🏷️ **Type Badge** - Purple background
- 📋 **Subtype Badge** - Orange background

## Interactive Elements

### Controls (Top Bar)

```
Group By:  [Dropdown Menu]
  ├─ Provider
  ├─ Type
  ├─ Level
  └─ None

Sort By:   [Dropdown Menu]
  ├─ Timestamp
  ├─ Provider
  ├─ Type
  └─ Level

Order:     [Dropdown Menu]
  ├─ Ascending
  └─ Descending
```

### Log Entry Interactions

- **Click anywhere on entry** → Expand/Collapse JSON details
- **▶ Arrow** → Indicates collapsed state
- **▼ Arrow** → Indicates expanded state
- **Hover effect** → Subtle highlight

## Sample Queries

### Get All Logs

```
User: "Show me all the logs"
```

### Filter by Error Level

```
User: "Show me error logs"
User: "Get all logs with level ERROR"
```

### Search Text

```
User: "Find logs containing 'timeout'"
User: "Search for database errors"
```

### Time-based Queries

```
User: "Show logs from the last hour"
User: "Get recent error logs"
```

## Responsive Behavior

### Desktop (> 768px)

- Controls in horizontal row
- Full log summary on one line
- Wide JSON viewer

### Tablet (768px - 480px)

- Controls stack vertically
- Log summary wraps to multiple lines
- Medium JSON viewer

### Mobile (< 480px)

- All controls full width
- Log details stack vertically
- Compact JSON viewer with scroll

## Usage Tips

1. **Start with Grouping** - Choose how you want to organize logs
2. **Apply Sorting** - Select relevant sorting criteria
3. **Browse Groups** - Scroll through grouped sections
4. **Inspect Details** - Click entries to see full JSON
5. **Adjust View** - Change grouping/sorting as needed

## Keyboard Navigation

- **Tab** - Navigate between controls
- **Enter/Space** - Expand/collapse log entry (when focused)
- **Arrow Keys** - Navigate within dropdowns

## Performance

- Efficiently handles up to 1000 logs
- Smooth scrolling and animations
- Lazy rendering for large JSON objects
- Optimized re-renders on sort/group changes
