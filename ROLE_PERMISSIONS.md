# Role Permissions System

## Database Structure

### Roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Permissions Structure

Permissions are stored as JSONB in the following format:

```json
{
  "dashboard": {
    "view": true,
    "create": false,
    "edit": false,
    "delete": false,
    "import": false,
    "export": true
  },
  "prospect_subscriber": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": false,
    "import": false,
    "export": true
  },
  ...
}
```

## Available Menus (Matching Sidebar)

### Main Navigation
1. **dashboard** - Dashboard
2. **achievement** - Achievement
3. **prospect_subscriber** - Prospect Subscriber
4. **coverage** - Coverage
5. **omniflow** - Omniflow

### Master Data
6. **person_incharge** - Person Incharge
7. **targets** - Targets
8. **coverage_management** - Coverage Management
9. **product_management** - Product Management
10. **promo** - Promo
11. **hot_news** - Hot News
12. **user_management** - User Management (Admin only)

## Available Actions

For each menu, the following actions can be controlled:

- **view** - Can view/read data
- **create** - Can create new records
- **edit** - Can modify existing records
- **delete** - Can delete records
- **import** - Can import data from files
- **export** - Can export data to files

## Default Roles

### Admin
- **Access**: All menus
- **Permissions**: Full access to all actions
- **Special**: Only role that can access User Management

### Leader
- **Access**: All menus except User Management
- **Permissions**: Full access to all actions on accessible menus
- **Use Case**: Team leaders who manage operations

### Manager
- **Access**: Most operational menus (no User Management, no Coverage Management)
- **Permissions**: 
  - Full access on most menus
  - Limited delete on Person Incharge and Targets
- **Use Case**: Department managers with operational focus

### Sales
- **Access**: Dashboard, Achievement, Prospect Subscriber, Coverage
- **Permissions**:
  - View + Export only for Dashboard and Achievement
  - Full CRUD on Prospect Subscriber (except delete)
  - View only for Coverage
- **Use Case**: Sales staff focused on prospects and performance

### User
- **Access**: Dashboard, Achievement only
- **Permissions**: View only
- **Use Case**: Basic users who need to see reports

## API Endpoints

### Get All Roles
```
GET /api/roles
```

Response:
```json
[
  {
    "id": 1,
    "name": "admin",
    "description": "Full system access with all permissions",
    "is_active": true,
    "permissions": { ... },
    "created_at": "2026-02-05T...",
    "updated_at": "2026-02-05T..."
  }
]
```

### Update Role Status
```
PUT /api/roles/:id
Body: { "isActive": true/false }
```

### Update Role Permissions
```
PUT /api/roles/:id
Body: { 
  "permissions": {
    "dashboard": {
      "view": true,
      "create": false,
      "edit": false,
      "delete": false,
      "import": false,
      "export": true
    },
    ...
  }
}
```

## Frontend Usage

### Role Management UI

The Role Management section in User Management displays:

1. **Role Header**: Name, description, and Active/Inactive toggle
2. **Permission Matrix Table**: 
   - Rows: All 12 menus from sidebar
   - Columns: 6 actions (View, Create, Edit, Delete, Import, Export)
   - Checkboxes: Toggle individual permissions

### Features

- ✅ Real-time updates to database
- ✅ Visual permission matrix
- ✅ Menu names match sidebar exactly
- ✅ Expandable cards per role
- ✅ Active/Inactive status toggle
- ✅ Individual permission checkboxes

### User Experience

1. Navigate to **Master Data → User Management**
2. Scroll to **Role Management & Permissions** section
3. Each role is displayed in a separate card
4. Click checkboxes to enable/disable specific permissions
5. Changes are saved immediately to NeonDB
6. Toggle Active/Inactive status with radio buttons

## Migration

To reset and seed the roles table with default permissions:

```bash
node server/migrate-role-permissions.js
```

This will:
1. Drop existing roles table
2. Create new roles table with JSONB permissions column
3. Seed 5 default roles with predefined permissions
4. Display menu structure matching sidebar

## Implementation Notes

### Menu Key Mapping

The system uses snake_case keys in the database but displays user-friendly labels:

```javascript
const menuLabels = {
  'dashboard': 'Dashboard',
  'achievement': 'Achievement',
  'prospect_subscriber': 'Prospect Subscriber',
  'coverage': 'Coverage',
  'omniflow': 'Omniflow',
  'person_incharge': 'Person Incharge',
  'targets': 'Targets',
  'coverage_management': 'Coverage Management',
  'product_management': 'Product Management',
  'promo': 'Promo',
  'hot_news': 'Hot News',
  'user_management': 'User Management'
};
```

### Permission Updates

When a checkbox is toggled:
1. Frontend finds the role in state
2. Creates updated permissions object
3. Sends PUT request to `/api/roles/:id` with new permissions
4. Backend updates JSONB column in database
5. Frontend refreshes roles from database

### Database Storage

Permissions are stored as JSONB for:
- ✅ Flexible schema
- ✅ Fast queries with GIN indexes
- ✅ Easy to add new menus/actions
- ✅ Atomic updates
- ✅ JSON validation

## Future Enhancements

Potential improvements:
- [ ] Bulk permission updates
- [ ] Permission templates
- [ ] Permission inheritance
- [ ] Audit log for permission changes
- [ ] Role cloning
- [ ] Custom roles creation
