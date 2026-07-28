# User Management System - Super Admin Guide

## Overview

The new authentication system allows Super Admins to create, manage, and control user accounts directly from the **Admin Panel** at `/admins`.

---

## How to Access Admin Panel

1. **Login** to the application with a Super Admin account
2. Click on **"Admin Panel"** or navigate to `/admins`
3. You'll see the **User Management** tab by default

---

## Creating New Users

### Step 1: Click "Create User" Button
- In the **User Management** tab, click the **"+ Create User"** button in the top right
- A dialog will open with a form

### Step 2: Fill in the Form
- **Email**: User's email address (used for login)
- **Username**: Display username (e.g., `john_doe`)
- **Full Name**: User's full name (e.g., `John Doe`)
- **Password**: Initial password (must be at least 8 characters)
  - Share this securely with the user
  - Users can change their password after first login
- **Role**: Select user's permission level
  - **Lab Admin**: Standard user with basic lab access
  - **Super Admin**: Full access to admin panel and user management

### Step 3: Confirm
- Click **"Create User"** button
- Success message appears
- New user is added to the user list
- User can now log in with their email and password

---

## Managing Existing Users

### User Roles

Each user has a **Role** and **Status**:

#### Roles:
- 🟢 **Super Admin** (shield icon)
  - Full access to admin panel
  - Can create, manage, and promote other users
  - Can demote other Super Admins (but not themselves)
- 👤 **Lab Admin** (user icon)
  - Standard user with lab access
  - Cannot access admin panel
  - Can be promoted to Super Admin by a Super Admin

#### Status:
- 🟢 **Active**: User can log in and access the app
- 🔴 **Disabled**: User cannot log in; automatically signed out

### User Actions

For each user in the list, you'll see action buttons:

#### Promote to Super Admin
- **Available for**: Lab Admin users
- **Effect**: Gives user full admin access
- **Audit log**: Recorded with promotion timestamp
- **Cannot be done for**: The user themselves

#### Demote to Lab Admin
- **Available for**: Super Admin users (except the last one)
- **Effect**: Removes admin access
- **Protection**: Cannot demote the last Super Admin (prevents lockout)
- **Audit log**: Recorded with demotion timestamp

#### Disable Account
- **Available for**: All users except the last active Super Admin
- **Effect**: 
  - User cannot log in
  - If currently logged in, user is signed out on next page interaction
  - All user data is preserved (not deleted)
- **Audit log**: Recorded with disable timestamp
- **Reversible**: Account can be re-enabled later

#### Enable Account
- **Available for**: Disabled users
- **Effect**: Restores user access
- **Audit log**: Recorded with enable timestamp

---

## Audit Log

The **Audit Log** tab shows a complete history of all permission changes:

**Information Displayed:**
- **Who**: The Super Admin who made the change
- **Action**: What was changed (promote/demote/disable/enable)
- **Target**: Which user was affected
- **When**: Timestamp of the change
- **Reason** (if provided): Note about why the change was made

**Uses:**
- Compliance tracking
- Understanding account changes
- Identifying who has access to what

---

## Important Safeguards

### Last Super Admin Protection
- **Cannot demote** the last active Super Admin
- **Cannot disable** the last active Super Admin
- **Why**: Prevents accidental system lockout

**To transfer admin rights:**
1. Promote another user to Super Admin first
2. Then you can safely demote yourself or the other user

### Data Preservation
- Disabling an account does **NOT** delete any data
- User's reports, settings, and history are all preserved
- Account can be re-enabled anytime

### Security
- Passwords are hashed and never visible
- All admin actions are logged with timestamps
- Only Super Admins can access the admin panel

---

## Common Workflows

### Add a New Team Member
1. Click **"Create User"**
2. Enter: email, username, full name, secure password
3. Select role: **Lab Admin** (default)
4. Click **"Create User"**
5. Share credentials securely with the new user

### Promote a Team Member to Super Admin
1. Find user in **User Management** list
2. Click **"Promote"** button
3. Confirm in the dialog
4. User now has full admin access
5. Change is recorded in **Audit Log**

### Temporarily Disable a User Account
1. Find user in **User Management** list
2. Click **"Disable"** button
3. Confirm in the dialog
4. User is immediately signed out
5. User cannot log in until re-enabled
6. Change is recorded in **Audit Log**

### Investigate Account Changes
1. Go to **Audit Log** tab
2. View all permission changes with timestamps
3. See who made each change and what was modified

---

## Frequently Asked Questions

**Q: Can I delete a user account?**
A: No, accounts are disabled instead of deleted. This preserves all user data (reports, settings) for audit purposes. Disable the account to prevent access.

**Q: What if I'm the only Super Admin and need to promote myself to test?**
A: You cannot demote yourself because you're the last Super Admin. First promote another user to Super Admin, then you can both manage accounts.

**Q: Can a Super Admin change their own password?**
A: Yes, users can always change their own password through the app's account settings. Super Admin password resets must be done through Supabase admin panel.

**Q: What happens if a Super Admin is disabled?**
A: The disabled Super Admin is immediately signed out and cannot log in. Their data is preserved. Only an active Super Admin can re-enable them.

**Q: Can I see who created each user?**
A: Yes, check the **Audit Log** tab. The first "promote" entry shows which Super Admin created the user and when.

**Q: How do I reset a user's password?**
A: Users can reset their own password using the login page's "Forgot Password" link. Super Admins cannot directly reset passwords through the app.

---

## Next Steps

- **Create your first Lab Admin user** and test their access
- **Promote a trusted team member to Super Admin** for redundancy
- **Check the Audit Log** regularly to track all changes
- **Review user statuses** monthly to disable inactive accounts

