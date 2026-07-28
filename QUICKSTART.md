# Quick Start - Admin User Management

## TL;DR - The Simplest Path

### Step 1: Create Your First Admin User
Navigate to `/admins` (you need to be logged in as Super Admin)

Click the **"+ Create User"** button

Fill in:
- Email: `admin@example.com`
- Username: `admin`
- Full Name: `Admin User`
- Password: `SecurePassword123`
- Role: `Super Admin`

Click **"Create User"**

The user is created and ready to log in.

---

### Step 2: Create Lab Users
Same process, but select `Lab Admin` role instead:

Click **"+ Create User"** → Fill form with `Lab Admin` role → Click **"Create User"**

Lab Admins can use the app but cannot access the Admin Panel.

---

### Step 3: Manage Users
In the user list, you'll see action buttons:

| Button | Does What |
|--------|-----------|
| **Promote** | Lab Admin → Super Admin (gives admin access) |
| **Demote** | Super Admin → Lab Admin (removes admin access) |
| **Disable** | Block user from logging in (preserves data) |
| **Enable** | Unblock disabled user (restores access) |

---

### Step 4: Check Who Did What
Click the **"Audit Log"** tab to see:
- Who created/modified each user
- When the change happened
- What changed

---

## Common Questions

**Q: How do I sign up new users?**
A: Super Admins create them in the Admin Panel (no public signup). Click "Create User" and provide credentials.

**Q: Can users create their own password?**
A: You set their initial password. Users can change it after first login via account settings.

**Q: What if I disable a user?**
A: They can't log in, but their data stays. You can re-enable them anytime.

**Q: Can I delete a user?**
A: No, only disable (which preserves all their data). Disable is reversible; delete is permanent.

**Q: Can a Super Admin demote themselves?**
A: Only if there's another Super Admin. The system prevents the last Super Admin from losing access.

**Q: Where's the logout button?**
A: Click your profile avatar in the top right → Logout

---

## That's It!

You now know how to:
- ✅ Create users
- ✅ Promote/demote users
- ✅ Disable/enable users
- ✅ Check the audit log

For more detailed info, see:
- **Super Admin Guide**: `USER_MANAGEMENT_GUIDE.md`
- **Developer Info**: `TECHNICAL_SETUP.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
