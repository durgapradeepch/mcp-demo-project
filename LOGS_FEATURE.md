# Grouped Logs Display Feature

## Overview

The logs results are now displayed in a comprehensive grouped and sortable view with expandable JSON details.

## Features

### 1. **Grouping Options**

Logs can be grouped by:

- **Provider** - Groups logs by their data source (e.g., VictoriaLogs, different services)
- **Type** - Groups logs by their type/category
- **Level** - Groups logs by severity level (ERROR, WARN, INFO, DEBUG, etc.)
- **None** - Shows all logs without grouping

### 2. **Sorting Options**

Logs can be sorted by:

- **Timestamp** - Sort by log creation time
- **Provider** - Sort alphabetically by provider name
- **Type** - Sort alphabetically by log type
- **Level** - Sort alphabetically by severity level

Sort order can be:

- **Ascending** - Oldest first / A-Z
- **Descending** - Newest first / Z-A

### 3. **Log Entry Display**

Each log entry shows:

- 🕒 **Timestamp** - When the log was created
- **Level Badge** - Color-coded severity level
  - Red: ERROR, FATAL, CRITICAL
  - Orange: WARN
  - Blue: INFO
  - Gray: DEBUG
  - Green: Other levels
- 📦 **Provider** - Source of the log
- 🏷️ **Type** - Log category/type
- 📋 **Subtype** - Additional categorization (if available)
- **Message Preview** - Truncated log message

### 4. **Expandable JSON Details**

- Click on any log entry to expand/collapse
- Shows the complete JSON object for that log entry
- Properly formatted and syntax-highlighted
- Scrollable for large JSON objects

### 5. **Summary Statistics**

At the top of the logs view:

- **Total Logs** - Count of all log entries
- **Groups** - Number of groups based on current grouping

## Usage

### Querying Logs

Ask the chatbot for logs:

- "Show me all the logs"
- "Get error logs"
- "Search logs containing 'timeout'"
- "Show logs from the last hour"

### Interacting with Results

1. **Group** - Select grouping method from the "Group By" dropdown
2. **Sort** - Select sorting field and order from dropdowns
3. **Expand** - Click any log entry to see full JSON details
4. **Navigate** - Scroll through grouped sections

## Technical Details

### Data Structure

Logs are expected to have these fields (all optional):

```javascript
{
  _time: "2025-10-16T12:00:00Z",     // Timestamp
  _msg: "Error message here",         // Message
  level: "ERROR",                     // Severity level
  provider: "VictoriaLogs",          // Source
  type: "Application",               // Type
  subtype: "Database",               // Subtype
  // ... additional fields
}
```

### Component Hierarchy

- `GroupedLogsDisplay` - Main container with controls
  - `LogEntry` - Individual log entry with expand/collapse
    - Log summary view
    - Expandable JSON details

### Styling

- Dark theme consistent with the rest of the application
- Color-coded severity levels
- Responsive design for mobile devices
- Smooth animations and transitions
- Custom scrollbars for JSON viewer

## Examples

### Example 1: Error Logs Grouped by Provider

```
Group By: Provider
Sort By: Timestamp
Order: Descending

📦 VictoriaLogs (15 logs)
  🕒 2025-10-16 12:30:45  [ERROR]  📦 VictoriaLogs  🏷️ Application  Connection timeout...
  🕒 2025-10-16 12:29:12  [ERROR]  📦 VictoriaLogs  🏷️ Database     Query failed...
  ...

📦 Neo4j Service (8 logs)
  🕒 2025-10-16 12:28:33  [ERROR]  📦 Neo4j Service  🏷️ Graph      Node not found...
  ...
```

### Example 2: All Logs Grouped by Level

```
Group By: Level
Sort By: Timestamp
Order: Ascending

ERROR (23 logs)
  🕒 2025-10-16 10:00:01  [ERROR]  📦 VictoriaLogs  🏷️ Application  ...
  ...

WARN (45 logs)
  🕒 2025-10-16 10:15:22  [WARN]   📦 VictoriaLogs  🏷️ System       ...
  ...

INFO (156 logs)
  ...
```

## Benefits

1. **Better Organization** - Group related logs together
2. **Quick Filtering** - Sort by different criteria
3. **Detailed Inspection** - Expandable JSON for deep dive
4. **Visual Clarity** - Color-coded levels and icons
5. **Responsive Design** - Works on all screen sizes
6. **Performance** - Efficient rendering of large log sets

## Future Enhancements

Potential improvements:

- Time range filtering
- Text search within displayed logs
- Export logs to file
- Custom color schemes
- Multi-field sorting
- Saved filter presets
