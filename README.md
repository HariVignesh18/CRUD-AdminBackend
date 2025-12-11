# Sample Admin Backend

A flexible Express.js backend that provides dynamic CRUD APIs for any MySQL database table with automatic metadata introspection.

## 🚀 Features

- **Dynamic CRUD APIs** - Auto-generated REST endpoints for any table
- **Metadata Introspection** - Automatic schema detection from MySQL
- **Table Configuration** - Store and manage table-specific settings
- **Advanced Filtering** - Support for search, filters, sorting, and pagination
- **Unique Constraint Validation** - Configurable unique field checking
- **Type-Safe** - Written in TypeScript for better reliability
- **Production-Ready** - Clean code without debug statements

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe backend development
- **Sequelize** - ORM for MySQL database operations
- **MySQL** - Relational database (5.7+ or 8.0+)
- **CORS** - Cross-origin resource sharing enabled

## 📋 Prerequisites

- Node.js 16+ and npm
- MySQL 5.7+ or 8.0+
- MySQL database with appropriate permissions

## 🚦 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=sample_admin_poc
PORT=5081
```

### 3. Initialize Database

Connect to MySQL and run the following SQL:

```sql
-- Create database
CREATE DATABASE sample_admin_poc;
USE sample_admin_poc;

-- Create table_configurations table
CREATE TABLE IF NOT EXISTS table_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL UNIQUE,
    column_order JSON DEFAULT NULL COMMENT 'Array of column names in display order',
    filterable_columns JSON DEFAULT NULL COMMENT 'Array of column names that can be filtered',
    searchable_columns JSON DEFAULT NULL COMMENT 'Array of column names that can be searched',
    sortable_columns JSON DEFAULT NULL COMMENT 'Array of column names that can be sorted',
    unique_constraints JSON DEFAULT NULL COMMENT 'Array of column names that should be unique',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT NULL,
    INDEX idx_table_name (table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Example: Create a sample table (students)
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    reg_no VARCHAR(50) NOT NULL UNIQUE,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample configuration for students table
INSERT INTO table_configurations (table_name, column_order, sortable_columns, searchable_columns, filterable_columns)
VALUES (
    'students',
    '["name", "reg_no", "department"]',
    '["name", "reg_no", "created_at"]',
    '["name", "reg_no"]',
    '["department"]'
);
```

### 4. Start the Server

**Development mode:**
```bash
npm start
```

**Production mode:**
```bash
npm run build
npm run serve
```

The server will start on `http://localhost:5081`

## 📁 Project Structure

```
src/
├── connection/
│   └── db.ts                 # Database connection
├── controllers/
│   ├── genericController.ts  # CRUD endpoints
│   └── tableConfigController.ts  # Configuration endpoints
├── services/
│   ├── genericService.ts     # CRUD business logic
│   └── tableConfigService.ts # Configuration logic
├── utility/
│   └── introspection.ts      # Metadata extraction
├── middleware/
│   └── logger.ts             # Request logging
├── routes/
│   └── index.ts              # API routes
└── index.ts                  # Application entry point
```

## 🔌 API Endpoints

### Metadata Endpoints

#### Get All Tables
```http
GET /metadata/tables
```

Returns list of all tables in the database.

#### Get Table Metadata
```http
GET /metadata/:table
```

Returns schema information for a specific table:
- Column names, types, nullability
- Primary key
- Auto-increment fields
- Max lengths
- UI widget suggestions

#### Refresh Metadata Cache
```http
POST /metadata/refresh
```

Clears the metadata cache, forcing fresh data on next request.

### CRUD Endpoints

#### List Records
```http
GET /api/:table?page=1&per_page=30&sortBy=name&sortOrder=ASC&_search=query
```

Query parameters:
- `page` - Page number (default: 1)
- `per_page` - Records per page (default: 30)
- `sortBy` - Column to sort by
- `sortOrder` - `ASC` or `DESC`
- `_search` - Search query (searches across searchable_columns)
- `filter[column]` - Filter by specific column value

#### Get Single Record
```http
GET /api/:table/:id
```

#### Create Record
```http
POST /api/:table
Content-Type: application/json

{
  "name": "John Doe",
  "reg_no": "12345"
}
```

#### Update Record
```http
PUT /api/:table/:id
Content-Type: application/json

{
  "name": "Jane Doe"
}
```

#### Delete Record
```http
DELETE /api/:table/:id
```

### Table Configuration Endpoints

#### Get Table Configuration
```http
GET /table-config/:table
```

Returns configuration for a table:
- `column_order` - Display order of columns
- `sortable_columns` - Which columns can be sorted
- `searchable_columns` - Which columns are searchable
- `filterable_columns` - Which columns can be filtered
- `unique_constraints` - Which columns must be unique

#### Save Table Configuration
```http
POST /table-config
Content-Type: application/json

{
  "table_name": "students",
  "column_order": ["name", "reg_no", "department"],
  "sortable_columns": ["name", "reg_no"],
  "searchable_columns": ["name", "reg_no"],
  "filterable_columns": ["department"],
  "unique_constraints": ["reg_no"]
}
```

#### Get All Configured Tables
```http
GET /table-config
```

## 🔍 How It Works

### 1. Metadata Introspection
The system queries MySQL's `INFORMATION_SCHEMA` to:
- Discover all tables in the database
- Extract column definitions (type, nullable, max length, etc.)
- Identify primary keys and auto-increment fields
- Map SQL types to UI widgets

### 2. Dynamic CRUD Operations
For any table:
- Raw SQL queries are constructed dynamically
- Sequelize handles parameterization for security
- Validation checks nullable fields and max lengths
- Unique constraint validation based on configuration

### 3. Search Functionality
When `_search` parameter is provided:
1. Backend loads `searchable_columns` from configuration
2. Builds `OR` query across all searchable columns using `LIKE`
3. Returns matching records

### 4. Filtering & Sorting
- **Filters**: `WHERE` clauses built dynamically from query params
- **Sorting**: `ORDER BY` clause added based on `sortBy` and `sortOrder`
- **Pagination**: `LIMIT` and `OFFSET` calculated from page and per_page

## 🔒 Data Validation

### Auto-Validation
- **Required fields**: Non-nullable columns must have values
- **Max length**: String fields checked against MySQL max length
- **Data types**: Type checking before database insertion

### Custom Validation
Unique constraints from `table_configurations`:
```javascript
// On CREATE
SELECT COUNT(*) FROM table WHERE column = value

// On UPDATE
SELECT COUNT(*) FROM table WHERE column = value AND id != current_id
```

## 🎯 Configuration Storage

Table configurations are stored as JSON in the `table_configurations` table:

```json
{
  "column_order": ["name", "email", "phone"],
  "sortable_columns": ["name", "created_at"],
  "searchable_columns": ["name", "email"],
  "filterable_columns": ["status"],
  "unique_constraints": ["email"]
}
```

### Why JSON?
- **Flexible**: No schema changes needed for new configurations
- **Production-ready**: Native MySQL JSON support (5.7+)
- **Simple**: Easy to query and update
- **Performant**: Indexed lookups on `table_name`

## 🐛 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Server Error

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Environment Variables
Ensure all production environment variables are set:
- Database credentials
- Server port
- Any additional secrets

### Run Production Server
```bash
NODE_ENV=production node dist/index.js
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly with different tables
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

---

**Built with ❤️ using Node.js, Express, and MySQL**
