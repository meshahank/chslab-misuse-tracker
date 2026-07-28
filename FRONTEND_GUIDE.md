# Frontend Guide: Using the New Authentication System

## Quick Start: Common Patterns

### 1. Check if User is Super Admin

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";

export function AdminButton() {
  const { data: currentUser, isLoading } = useCurrentUser();
  
  if (isLoading) return <div>Loading...</div>;
  
  // Only show admin button if super admin
  if (!currentUser?.isSuperAdmin) {
    return null;
  }
  
  return <button onClick={() => navigate("/admins")}>Admin Panel</button>;
}
```

### 2. Protect a Page (Route Guards)

```tsx
// In your route component
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNavigate } from "@tanstack/react-router";

export function AdminPage() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  
  if (isLoading) return <LoadingSpinner />;
  
  // Redirect if not super admin
  if (!currentUser?.isSuperAdmin) {
    navigate({ to: "/" });
    return null;
  }
  
  return <AdminContent />;
}
```

### 3. Show Different UI Based on Role

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";

export function Dashboard() {
  const { data: currentUser } = useCurrentUser();
  
  return (
    <div>
      <h1>Welcome {currentUser?.profile?.full_name}</h1>
      
      {currentUser?.isSuperAdmin ? (
        <div>
          <p>You have admin access</p>
          <AdminTools />
        </div>
      ) : (
        <div>
          <p>You're a lab admin</p>
          <LabTools />
        </div>
      )}
    </div>
  );
}
```

---

## Admin Functions: Complete Usage

### Promote User to Super Admin

```tsx
import { useState } from "react";
import { promoteToSuperAdmin } from "@/lib/admin.functions";

export function PromoteButton({ userId, userName }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const handlePromote = async () => {
    setLoading(true);
    setError("");
    
    const result = await promoteToSuperAdmin(
      userId,
      `Promoted ${userName} to super admin` // Reason for audit log
    );
    
    if (result.error) {
      setError(result.error);
    } else {
      // Success - refresh user list or show confirmation
      alert(`${userName} promoted to Super Admin`);
      // Trigger refresh of admins list
    }
    
    setLoading(false);
  };
  
  return (
    <button onClick={handlePromote} disabled={loading}>
      {loading ? "Promoting..." : "Promote to Super Admin"}
    </button>
  );
}
```

### Demote User from Super Admin

```tsx
import { demoteToLabAdmin } from "@/lib/admin.functions";

export function DemoteButton({ userId, userName, isLastSuperAdmin }) {
  const [loading, setLoading] = useState(false);
  
  const handleDemote = async () => {
    const result = await demoteToLabAdmin(
      userId,
      `Demoted ${userName} back to lab admin`
    );
    
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert("User demoted successfully");
    }
  };
  
  // Disable button if this is the last super admin
  return (
    <button 
      onClick={handleDemote} 
      disabled={loading || isLastSuperAdmin}
      title={isLastSuperAdmin ? "Cannot demote last super admin" : ""}
    >
      {loading ? "Demoting..." : "Demote to Lab Admin"}
    </button>
  );
}
```

### Disable User Account

```tsx
import { disableUser } from "@/lib/admin.functions";

export function DisableButton({ userId, userName }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  
  const handleDisable = async () => {
    setLoading(true);
    
    const result = await disableUser(userId, reason || "Account disabled");
    
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert(`${userName} account has been disabled`);
      // User will be signed out on next page load
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      <input 
        type="text" 
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button onClick={handleDisable} disabled={loading}>
        {loading ? "Disabling..." : "Disable Account"}
      </button>
    </div>
  );
}
```

### Enable Disabled Account

```tsx
import { enableUser } from "@/lib/admin.functions";

export function EnableButton({ userId, userName }) {
  const [loading, setLoading] = useState(false);
  
  const handleEnable = async () => {
    setLoading(true);
    
    const result = await enableUser(userId, `Account re-enabled for ${userName}`);
    
    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert(`${userName} can now log in again`);
    }
    
    setLoading(false);
  };
  
  return (
    <button onClick={handleEnable} disabled={loading}>
      {loading ? "Enabling..." : "Enable Account"}
    </button>
  );
}
```

---

## Admin Panel: Complete Example

```tsx
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { listAdmins, getAuditLogs } from "@/lib/admin.functions";

export function AdminsPage() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users"); // "users" or "audit"
  
  // Redirect if not super admin
  useEffect(() => {
    if (!userLoading && !currentUser?.isSuperAdmin) {
      navigate({ to: "/" });
    }
  }, [currentUser, userLoading, navigate]);
  
  // Load admins list
  useEffect(() => {
    const loadAdmins = async () => {
      setLoading(true);
      const { data } = await listAdmins();
      setAdmins(data || []);
      setLoading(false);
    };
    
    if (currentUser?.isSuperAdmin) {
      loadAdmins();
    }
  }, [currentUser]);
  
  // Load audit logs
  const loadAuditLogs = async () => {
    const { data } = await getAuditLogs();
    setAuditLogs(data || []);
  };
  
  if (userLoading) return <div>Loading...</div>;
  if (!currentUser?.isSuperAdmin) return null;
  
  const lastSuperAdminCount = admins.filter(a => a.role === "super_admin").length;
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Management</h1>
      
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        <button 
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 ${activeTab === "users" ? "border-b-2 border-blue-500" : ""}`}
        >
          Users
        </button>
        <button 
          onClick={() => { setActiveTab("audit"); loadAuditLogs(); }}
          className={`px-4 py-2 ${activeTab === "audit" ? "border-b-2 border-blue-500" : ""}`}
        >
          Audit Log
        </button>
      </div>
      
      {/* Users Tab */}
      {activeTab === "users" && (
        <div>
          {loading ? (
            <div>Loading users...</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Username</th>
                  <th className="border p-2 text-left">Full Name</th>
                  <th className="border p-2 text-left">Role</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <AdminRow 
                    key={admin.id} 
                    admin={admin} 
                    currentUserId={currentUser.user.id}
                    isLastSuperAdmin={admin.role === "super_admin" && lastSuperAdminCount === 1}
                    onUpdate={() => location.reload()} // Refresh on update
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {/* Audit Log Tab */}
      {activeTab === "audit" && (
        <div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Date</th>
                <th className="border p-2 text-left">Actor</th>
                <th className="border p-2 text-left">Target User</th>
                <th className="border p-2 text-left">Action</th>
                <th className="border p-2 text-left">Change</th>
                <th className="border p-2 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} className="border">
                  <td className="border p-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="border p-2">{log.actor_id.slice(0, 8)}</td>
                  <td className="border p-2">{log.target_user_id.slice(0, 8)}</td>
                  <td className="border p-2 font-semibold">{log.action}</td>
                  <td className="border p-2">
                    {log.old_value} → {log.new_value}
                  </td>
                  <td className="border p-2">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Sub-component for each admin row
function AdminRow({ admin, currentUserId, isLastSuperAdmin, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const { promoteToSuperAdmin, demoteToLabAdmin, disableUser, enableUser } = require("@/lib/admin.functions");
  
  const canEditSelf = admin.id === currentUserId;
  const isSuperAdmin = admin.role === "super_admin";
  const isDisabled = admin.status === "disabled";
  
  const handlePromote = async () => {
    setLoading(true);
    await promoteToSuperAdmin(admin.id, `Promoted ${admin.username} to super admin`);
    onUpdate();
    setLoading(false);
  };
  
  const handleDemote = async () => {
    setLoading(true);
    await demoteToLabAdmin(admin.id, `Demoted ${admin.username} to lab admin`);
    onUpdate();
    setLoading(false);
  };
  
  const handleDisable = async () => {
    setLoading(true);
    await disableUser(admin.id, `Disabled account for ${admin.username}`);
    onUpdate();
    setLoading(false);
  };
  
  const handleEnable = async () => {
    setLoading(true);
    await enableUser(admin.id, `Enabled account for ${admin.username}`);
    onUpdate();
    setLoading(false);
  };
  
  return (
    <tr className="border">
      <td className="border p-2">{admin.username}</td>
      <td className="border p-2">{admin.full_name}</td>
      <td className="border p-2">
        <span className={`px-2 py-1 rounded ${isSuperAdmin ? "bg-purple-100" : "bg-blue-100"}`}>
          {isSuperAdmin ? "Super Admin" : "Lab Admin"}
        </span>
      </td>
      <td className="border p-2">
        <span className={`px-2 py-1 rounded ${isDisabled ? "bg-red-100" : "bg-green-100"}`}>
          {isDisabled ? "Disabled" : "Active"}
        </span>
      </td>
      <td className="border p-2 space-x-2">
        {!isSuperAdmin && (
          <button 
            onClick={handlePromote} 
            disabled={loading}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Promote
          </button>
        )}
        
        {isSuperAdmin && !canEditSelf && (
          <button 
            onClick={handleDemote} 
            disabled={loading || isLastSuperAdmin}
            title={isLastSuperAdmin ? "Cannot demote last super admin" : ""}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Demote
          </button>
        )}
        
        {!isDisabled && !canEditSelf && (
          <button 
            onClick={handleDisable} 
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Disable
          </button>
        )}
        
        {isDisabled && (
          <button 
            onClick={handleEnable} 
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Enable
          </button>
        )}
      </td>
    </tr>
  );
}
```

---

## Common UI Patterns

### Show Admin Badge Next to User Name

```tsx
export function UserBadge({ user }) {
  return (
    <div className="flex items-center gap-2">
      <span>{user.profile.full_name}</span>
      {user.isSuperAdmin && (
        <span className="bg-purple-500 text-white px-2 py-1 rounded text-xs">
          Super Admin
        </span>
      )}
    </div>
  );
}
```

### Conditional Menu Items

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";

export function NavMenu() {
  const { data: currentUser } = useCurrentUser();
  
  return (
    <nav>
      <a href="/dashboard">Dashboard</a>
      <a href="/reports">Reports</a>
      
      {currentUser?.isSuperAdmin && (
        <>
          <a href="/admins">Manage Admins</a>
          <a href="/settings">System Settings</a>
        </>
      )}
    </nav>
  );
}
```

### Handle Disabled Users Gracefully

```tsx
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedContent() {
  const { data: currentUser } = useCurrentUser();
  
  // This check is redundant (route already checks), but good for defensive UI
  if (!currentUser?.isActive) {
    return (
      <div className="p-6 bg-red-100 border border-red-400 rounded">
        <h2 className="font-bold text-red-800">Account Disabled</h2>
        <p>Your account has been disabled. Please contact support.</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Sign Out
        </button>
      </div>
    );
  }
  
  return <MainContent />;
}
```

---

## Full Page Example: Admin Dashboard

```tsx
// src/routes/_authenticated/admins.tsx
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNavigate } from "@tanstack/react-router";
import { AdminsPage } from "@/components/AdminsPage";

export default function AdminsRoute() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const navigate = useNavigate();
  
  // Protect route
  if (!isLoading && !currentUser?.isSuperAdmin) {
    navigate({ to: "/" });
    return null;
  }
  
  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }
  
  return <AdminsPage />;
}
```

---

## Quick Reference: useCurrentUser

The `useCurrentUser()` hook gives you:

```tsx
const { data: currentUser, isLoading, error } = useCurrentUser();

// currentUser properties:
currentUser.user           // Supabase auth user object
currentUser.profile        // { id, username, full_name, role, status }
currentUser.isSuperAdmin   // true if role === 'super_admin'
currentUser.isActive       // true if status === 'active'
```

---

## Error Handling Examples

```tsx
async function handleAction(action, userId) {
  try {
    const result = await action(userId, "User action");
    
    if (result.error) {
      // Specific error from function
      if (result.error.includes("last super admin")) {
        alert("Cannot modify the last super admin");
      } else {
        alert(`Error: ${result.error}`);
      }
      return;
    }
    
    // Success
    alert("Action completed");
    // Refresh data...
    
  } catch (err) {
    console.error("Unexpected error:", err);
    alert("Something went wrong");
  }
}
```

This should cover most frontend use cases!
