# Technical Setup - New Authentication System

## System Architecture

The refactored authentication system uses:

- **Supabase Auth**: Standard email/password authentication (no service role key)
- **Profiles Table**: Stores user metadata, role, and status
- **Audit Logs Table**: Records all permission changes for compliance
- **Row-Level Security (RLS)**: Enforces permission rules at the database level

---

## Database Schema

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  role user_role DEFAULT 'lab_admin', -- 'super_admin' | 'lab_admin'
  status user_status DEFAULT 'active'  -- 'active' | 'disabled'
);
```

**Columns:**
- `id`: Foreign key to Supabase auth users
- `username`: Unique display name (used for login fallback)
- `full_name`: User's full name
- `role`: Permission level (super_admin or lab_admin)
- `status`: Account status (active or disabled)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  target_user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'promote' | 'demote' | 'disable' | 'enable'
  old_value TEXT,       -- Previous role/status value
  new_value TEXT,       -- New role/status value
  reason TEXT,          -- Optional reason for change
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Columns:**
- `actor_id`: Super Admin who made the change
- `target_user_id`: User who was affected
- `action`: Type of change (promote/demote/disable/enable)
- `old_value`/`new_value`: Before and after values
- `reason`: Optional note about the change
- `created_at`: When the change was recorded

---

## API Functions

All admin functions are in `/src/lib/admin.functions.ts`

### createUser(email, password, full_name, username, role)
Creates a new user account with the specified role.

**Parameters:**
- `email`: User's email (required)
- `password`: Initial password, min 8 characters (required)
- `full_name`: User's full name (required)
- `username`: Unique username (required)
- `role`: 'super_admin' or 'lab_admin' (required)

**Returns:**
```typescript
{ ok: true, userId: string, email: string }
```

**Backend:**
1. Creates Supabase auth user
2. Creates profile with specified role and 'active' status
3. Records audit log entry for user creation

**Access:** Super Admin only

---

### promoteToSuperAdmin(user_id)
Promotes a Lab Admin to Super Admin.

**Parameters:**
- `user_id`: UUID of user to promote (required)

**Returns:**
```typescript
{ ok: true, changed: boolean }
```

**Backend:**
1. Verifies actor is Super Admin
2. Gets current user profile
3. Updates role to 'super_admin'
4. Records audit log

**Access:** Super Admin only

---

### demoteToLabAdmin(user_id)
Demotes a Super Admin to Lab Admin.

**Parameters:**
- `user_id`: UUID of user to demote (required)

**Returns:**
```typescript
{ ok: true, changed: boolean }
```

**Backend:**
1. Verifies actor is Super Admin
2. Prevents demotion of last active Super Admin
3. Updates role to 'lab_admin'
4. Records audit log

**Access:** Super Admin only
**Safeguards:** Cannot demote the last active Super Admin

---

### disableUser(user_id)
Disables a user account (prevents login).

**Parameters:**
- `user_id`: UUID of user to disable (required)

**Returns:**
```typescript
{ ok: true, changed: boolean }
```

**Backend:**
1. Verifies actor is Super Admin
2. Prevents disabling of last active Super Admin
3. Updates status to 'disabled'
4. Records audit log
5. User is signed out on next page load (via middleware)

**Access:** Super Admin only
**Safeguards:** Cannot disable the last active Super Admin

---

### enableUser(user_id)
Re-enables a disabled user account.

**Parameters:**
- `user_id`: UUID of user to enable (required)

**Returns:**
```typescript
{ ok: true, changed: boolean }
```

**Backend:**
1. Verifies actor is Super Admin
2. Updates status to 'active'
3. Records audit log
4. User can now log in again

**Access:** Super Admin only

---

### listAdmins()
Gets all user profiles with their role and status.

**Returns:**
```typescript
[
  {
    id: string,
    username: string,
    full_name: string,
    role: 'super_admin' | 'lab_admin',
    status: 'active' | 'disabled',
    created_at: string
  }
]
```

**Access:** Super Admin only

---

### getAuditLogs()
Gets audit log entries for all permission changes.

**Returns:**
```typescript
[
  {
    id: string,
    actor_id: string,
    actor_name: string,
    target_user_id: string,
    target_name: string,
    action: 'promote' | 'demote' | 'disable' | 'enable',
    old_value: string,
    new_value: string,
    reason: string | null,
    created_at: string
  }
]
```

**Access:** Super Admin only

---

## Frontend Components

### useCurrentUser Hook

Located: `/src/hooks/use-current-user.ts`

Returns current authenticated user with profile data.

```typescript
const { data: currentUser } = useCurrentUser();

// currentUser shape:
{
  user: User,                          // Supabase auth user
  profile: {
    id: string,
    username: string,
    full_name: string,
    role: 'super_admin' | 'lab_admin',
    status: 'active' | 'disabled'
  },
  isSuperAdmin: boolean,               // true if role === 'super_admin'
  isActive: boolean,                   // true if status === 'active'
  isLoading: boolean,
  error: Error | null
}
```

**Auto-Create Behavior:**
- On first login, if no profile exists, automatically creates profile with:
  - `role: 'lab_admin'`
  - `status: 'active'`

---

### Admin Panel Page

Located: `/src/routes/_authenticated/admins.tsx`

Super Admin interface for user management.

**Features:**
1. **Create User Modal**
   - Form to create new users
   - Email, username, full name, password, role selection
   - Validation for all fields

2. **User Management Table**
   - Lists all users with badges for role and status
   - Action buttons: Promote, Demote, Disable, Enable
   - Smart button disabling (prevents invalid actions)

3. **Audit Log Tab**
   - Shows all permission changes with timestamps
   - Displays who made each change and why
   - Ordered by most recent first

---

## Route Protection

### Authenticated Routes (`/_authenticated/*`)

Located: `/src/routes/_authenticated/route.tsx`

All routes under `/_authenticated/` are protected by:

1. **Session Check**: User must have valid session
2. **Status Check**: User must have `status === 'active'`
   - Disabled users are automatically signed out
   - Redirect to `/auth`

### Admin Routes (`/_authenticated/admins`)

Additional protection: User must have `role === 'super_admin'`
- Non-Super Admins redirected to `/dashboard`

---

## Authentication Flow

### Sign Up (Public)
1. User provides email, password, username, full name
2. Supabase creates auth user
3. `useCurrentUser` hook detects missing profile
4. Profile automatically created with `lab_admin` role
5. User can immediately log in

### Login
1. User enters email/password
2. Supabase verifies credentials
3. Session created
4. `useCurrentUser` hook fetches profile
5. Checks `status === 'active'`
6. If disabled, signs out and redirects to login

### Super Admin Creates User
1. Super Admin fills form in Admin Panel
2. Calls `createUser` server function
3. Supabase creates auth user with specified credentials
4. Profile created with specified role
5. Audit log recorded with 'promote' action
6. New user can log in immediately

---

## Security Considerations

### No Service Role Key
- Removed `client.server.ts` and `SUPABASE_SERVICE_ROLE_KEY`
- All operations use public client with RLS enforcement
- Server functions validated with `@tanstack/react-start` middleware

### Row-Level Security (RLS)
- Profiles table: Users can read their own; Super Admins can read/write all
- Audit logs: Super Admins can read all; restricted by RLS policies
- Disabled users cannot access protected routes

### Last Super Admin Protection
- Prevents demotion of last active Super Admin
- Prevents disabling of last active Super Admin
- Both frontend (button disabled) and backend (API validation)

### Audit Trail
- All permission changes recorded with actor, target, action, timestamp
- Immutable audit log for compliance
- Includes optional reason field for context

---

## Migration from Old System

The old system used:
- `user_roles` table (separate table)
- `auth.admin.*` calls (removed)
- Manual user creation with `createLabAdmin`

**Changes Made:**
1. ✅ Added `role` and `status` columns to `profiles`
2. ✅ Created `audit_logs` table
3. ✅ Rewrote admin functions to use public client only
4. ✅ Deleted `client.server.ts`
5. ✅ Updated `useCurrentUser` to auto-create profiles
6. ✅ Updated admin page UI with new workflows
7. ✅ Removed all references to `SERVICE_ROLE_KEY`

**No Data Loss:**
- Existing users preserved
- Roles migrated automatically by `useCurrentUser` hook
- Profiles created on first login if missing

---

## Environment Variables

**Required:**
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

**Removed:**
- `SUPABASE_SERVICE_ROLE_KEY` (no longer needed)

---

## Testing the System

### Test User Creation
```typescript
// In admin panel
1. Click "Create User"
2. Enter: email, password, username, full name
3. Select role: "Lab Admin"
4. Click "Create User"
5. Verify new user appears in list
```

### Test Promotion
```typescript
1. Find Lab Admin user in list
2. Click "Promote" button
3. Confirm dialog
4. Verify user now shows "Super Admin" badge
5. Check Audit Log for entry
```

### Test Disable/Enable
```typescript
1. Find user in list
2. Click "Disable" button
3. Confirm dialog
4. Verify user shows "Disabled" badge
5. Try to log in as that user (should fail)
6. Click "Enable" button
7. Verify user can log in again
```

---

## Troubleshooting

**Issue: "Cannot remove the last super admin"**
- Solution: Promote another user to Super Admin first, then try again

**Issue: Disabled user still can access app**
- Solution: User's session is checked on each route; clear browser cache and refresh

**Issue: New user can't log in**
- Solution: Verify status is 'active' in profiles table; check email/password credentials

**Issue: Missing audit log entries**
- Solution: Check that Super Admin made changes; audit logs only record admin actions

