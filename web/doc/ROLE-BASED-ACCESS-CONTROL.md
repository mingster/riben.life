# Role-Based Access Control

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.0

## Overview

This document describes the role-based access control (RBAC) system used throughout the application. The system uses Prisma enums for type safety and enforces access control at multiple levels.

## User Roles

The application supports five distinct user roles defined in the Prisma schema:

```prisma
enum Role {
  user
  owner
  staff
  storeAdmin
  sysAdmin
}
```

### Role Definitions

#### `user`

- **Description:** Regular customers
- **Access:** Customer-facing features only
- **Routes:** Store pages, checkout, account management
- **Permissions:** View products, create orders, manage own account

#### `owner`

- **Description:** Store owners
- **Access:** Full access to their own stores
- **Routes:** `/storeAdmin/[storeId]/*`
- **Permissions:**
  - Full store management
  - Can create, edit, and delete store content
  - Can manage staff
  - Can access all store admin features

#### `staff`

- **Description:** Store staff members
- **Access:** Operational access to assigned stores
- **Routes:** `/storeAdmin/[storeId]/*`
- **Permissions:**
  - View and manage reservations/orders
  - Create and edit reservations
  - Mark orders as completed
  - Limited settings access (as configured by store owner)

#### `storeAdmin`

- **Description:** Store administrators (multi-store management)
- **Access:** Administrative access to stores they manage
- **Routes:** `/storeAdmin/[storeId]/*`
- **Permissions:**
  - Similar to `owner` but may manage multiple stores
  - Store access validated per-store
  - Can access store admin features for assigned stores

#### `sysAdmin`

- **Description:** System administrators
- **Access:** Platform-wide administration
- **Routes:** `/sysAdmin/*`
- **Permissions:**
  - Manage all stores and users
  - Access system-wide settings
  - View system logs and analytics
  - Platform configuration

## Route Access Control

### `/sysAdmin/*` Routes

**Allowed Roles:** Only `sysAdmin`

**Implementation:**

- Layout: `src/app/sysAdmin/layout.tsx`
- Access Check: `src/app/sysAdmin/admin-utils.ts` → `checkAdminAccess()`
- Enforces: `Role.sysAdmin` only

**Example:**

```typescript
import { checkAdminAccess } from "@/app/sysAdmin/admin-utils";

// In layout.tsx
const isAdmin = await checkAdminAccess();
if (!isAdmin) {
  redirect("/signIn/?callbackUrl=/sysAdmin");
}
```

### `/storeAdmin/*` Routes

**Allowed Roles:** `owner`, `staff`, or `storeAdmin`

**Implementation:**

- Root Layout: `src/app/storeAdmin/(root)/layout.tsx`
- Store Layout: `src/app/storeAdmin/(dashboard)/[storeId]/(routes)/layout.tsx`
- Access Check: `src/lib/store-admin-utils.ts` → `checkStoreStaffAccess()`
- Enforces: `Role.owner`, `Role.staff`, or `Role.storeAdmin`

**Example:**

```typescript
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

// In layout.tsx
const store = await checkStoreStaffAccess(params.storeId);
// Validates role AND store access
```

**Note:** `sysAdmin` users **cannot** access store admin routes. System admins have separate routes at `/sysAdmin/*`.

## Access Control Functions

### Server Action Clients

**Location:** `src/utils/actions/safe-action.ts`

#### `storeActionClient`

Server action client for store admin actions. Requires user to be a member of the specific store's organization.

**Requirements:**

- Action input schema must include `storeId`
- User must be authenticated
- User must be a member of the store's organization with one of these roles: `owner`, `storeAdmin`, or `staff`

**Implementation:**

```typescript
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";

const updateProductSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  // ... other fields
});

export const updateProductAction = storeActionClient
  .metadata({ name: "updateProduct" })
  .schema(updateProductSchema)
  .action(async ({ parsedInput }) => {
    // Action logic here
    // storeActionClient already validated:
    // 1. User is authenticated
    // 2. storeId exists
    // 3. Store exists
    // 4. User is a member of the store's organization with allowed role
  });
```

**Access Logic:**

1. Extracts `storeId` from client input (before schema validation)
2. Validates `storeId` is provided
3. Finds the store and retrieves its `organizationId`
4. Checks if user is a member of that specific organization with role `owner`, `storeAdmin`, or `staff`
5. Throws `SafeError("Unauthorized")` if access denied

**Important:** All store actions using `storeActionClient` must include `storeId` in their validation schema.

### Authentication & Authorization Utilities

**Location:** `src/lib/auth-utils.ts`

#### `requireAuth()`

Ensures user is authenticated:

```typescript
import { requireAuth } from "@/lib/auth-utils";

const session = await requireAuth();
// Redirects to signin if not authenticated
```

#### `requireAuthWithRole(allowedRoles)`

Requires authentication with specific roles:

```typescript
import { requireAuthWithRole } from "@/lib/auth-utils";
import { Role } from "@prisma/client";

// Only owner, staff, or storeAdmin can access
const session = await requireAuthWithRole([
  Role.owner,
  Role.staff,
  Role.storeAdmin,
]);
// Redirects to signin if not authenticated
// Redirects to 403 if role not allowed
```

#### `requireRole(session, allowedRoles)`

Checks role for authenticated session:

```typescript
import { requireRole } from "@/lib/auth-utils";

requireRole(session, [Role.owner, Role.staff]);
// Redirects to 403 if role not allowed
```

### Store Access Utilities

**Location:** `src/lib/store-access.ts`

#### `checkStoreOwnership(storeId, userId, userRole?)`

Checks if user has access to a specific store:

```typescript
import { checkStoreOwnership } from "@/lib/store-access";

const store = await checkStoreOwnership(
  storeId,
  userId,
  userRole // Optional: allows role-based access
);
```

**Access Logic:**

- `sysAdmin`: Can access any store
- `storeAdmin`, `staff`: Can access stores where `ownerId === userId` (may need expansion for staff assignment)
- `owner`: Can access stores where `ownerId === userId`

#### `requireStoreAccess(storeId, userId, userRole?)`

Requires store access (redirects if denied):

```typescript
import { requireStoreAccess } from "@/lib/store-access";

const store = await requireStoreAccess(
  storeId,
  userId,
  userRole
);
// Redirects to /storeAdmin if access denied
```

### High-Level Utilities

**Location:** `src/lib/store-admin-utils.ts`

#### `checkStoreStaffAccess(storeId)`

All-in-one check for store admin routes:

```typescript
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

const store = await checkStoreStaffAccess(params.storeId);
// 1. Checks authentication
// 2. Validates role (owner, staff, or storeAdmin)
// 3. Validates store access
// 4. Returns minimal store data
```

**Usage:**

- Recommended for most store admin pages
- Returns minimal store data (optimal performance)
- Handles all access checks in one call

## Access Control Patterns

### Pattern 1: Simple Page with Role Check

```typescript
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";

export default async function MyPage(props: { params: Params }) {
  const params = await props.params;
  
  // Checks auth, role, and store access
  const store = await checkStoreStaffAccess(params.storeId);
  
  // Fetch page-specific data
  const items = await sqlClient.item.findMany({
    where: { storeId: params.storeId },
  });
  
  return <MyClient data={items} store={store} />;
}
```

### Pattern 2: System Admin Page

```typescript
import { checkAdminAccess } from "@/app/sysAdmin/admin-utils";

export default async function AdminPage() {
  const isAdmin = await checkAdminAccess();
  if (!isAdmin) {
    redirect("/signIn/?callbackUrl=/sysAdmin");
  }
  
  // System admin content
  return <AdminContent />;
}
```

### Pattern 3: Custom Role Check

```typescript
import { requireAuthWithRole } from "@/lib/auth-utils";
import { Role } from "@prisma/client";

export default async function CustomPage() {
  // Only allow specific roles
  const session = await requireAuthWithRole([
    Role.owner,
    Role.storeAdmin,
  ]);
  
  // Page content
  return <CustomContent />;
}
```

### Pattern 4: Role-Based Feature Access

```typescript
import { Role } from "@prisma/client";

// In component or page
{session.user.role === Role.sysAdmin && (
  <SysAdminFeature />
)}

{(session.user.role === Role.owner || 
  session.user.role === Role.storeAdmin) && (
  <StoreAdminFeature />
)}

{session.user.role === Role.staff && (
  <StaffFeature />
)}
```

### Pattern 5: Store Admin Server Action

```typescript
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";

// Validation schema MUST include storeId
const createProductSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  name: z.string().min(1, "Product name is required"),
  // ... other fields
});

export const createProductAction = storeActionClient
  .metadata({ name: "createProduct" })
  .schema(createProductSchema)
  .action(async ({ parsedInput }) => {
    const { storeId, name, ... } = parsedInput;
    
    // storeActionClient already validated:
    // - User is authenticated
    // - storeId is provided and valid
    // - Store exists
    // - User is a member of the store's organization with allowed role
    
    // Action logic here
    const product = await sqlClient.product.create({
      data: { storeId, name, ... },
    });
    
    return { product };
  });
```

**Key Points:**

- `storeActionClient` automatically validates store membership
- Must include `storeId` in action schema
- Checks membership in the specific store's organization
- Only allows `owner`, `storeAdmin`, or `staff` roles

## Role Assignment

### Setting User Roles

Roles are managed through the Prisma database and can be updated via:

1. **Better Auth Admin API:**

```typescript
import { authClient } from "@/lib/auth-client";

await authClient.admin.setRole({
  userId: user.id,
  role: Role.storeAdmin,
});
```

2. **Direct Database Update:**

```typescript
import { sqlClient } from "@/lib/prismadb";
import { Role } from "@prisma/client";

await sqlClient.user.update({
  where: { id: userId },
  data: { role: Role.staff },
});
```

### Default Roles

- New users: `Role.user` (default)
- Store creation: User creating store gets `Role.owner` (implicit)

## Security Considerations

### Access Control Enforcement

1. **Always check roles in server components** - Never rely on client-side checks alone
2. **Use layout-level checks** - Enforce access at the route level
3. **Validate store access** - Even with correct role, verify store ownership
4. **Log access denials** - Track unauthorized access attempts

### Best Practices

1. **Use Prisma enums** - Import `Role` from `@prisma/client` for type safety
2. **Centralize access logic** - Use utility functions rather than inline checks
3. **Minimize role checks** - Cache results when possible (React `cache()`)
4. **Fail securely** - Default to denying access if unsure

### Common Pitfalls

❌ **Don't:** Check roles only in client components

```typescript
// ❌ BAD - Client-side only check
if (session.user.role === Role.admin) {
  // This can be bypassed!
}
```

✅ **Do:** Check roles in server components

```typescript
// ✅ GOOD - Server-side check
const session = await requireAuthWithRole([Role.admin]);
// Enforced on server
```

❌ **Don't:** Use string literals for roles

```typescript
// ❌ BAD - No type safety
if (session.user.role === "admin") {
}
```

✅ **Do:** Use Prisma enum

```typescript
// ✅ GOOD - Type safe
import { Role } from "@prisma/client";
if (session.user.role === Role.storeAdmin) {
}
```

## Migration Notes

### From `admin` to `storeAdmin`

The `admin` role was renamed to `storeAdmin` to better reflect its purpose and distinguish it from `sysAdmin`.

**Changes:**

- Prisma schema: `admin` → `storeAdmin`
- All code references updated
- Type imports: Use `Role` from `@prisma/client`

**Access Rules:**

- `/sysAdmin/*`: Only `sysAdmin` can access (changed from `admin`)
- `/storeAdmin/*`: `owner`, `staff`, or `storeAdmin` can access

## Testing Access Control

### Manual Testing Checklist

- [ ] User with `user` role cannot access `/storeAdmin/*`
- [ ] User with `user` role cannot access `/sysAdmin/*`
- [ ] User with `owner` role can access own store at `/storeAdmin/[storeId]/*`
- [ ] User with `owner` role cannot access other stores
- [ ] User with `owner` role cannot access `/sysAdmin/*`
- [ ] User with `staff` role can access assigned stores
- [ ] User with `staff` role cannot access `/sysAdmin/*`
- [ ] User with `storeAdmin` role can access managed stores
- [ ] User with `storeAdmin` role cannot access `/sysAdmin/*`
- [ ] User with `sysAdmin` role can access `/sysAdmin/*`
- [ ] User with `sysAdmin` role cannot access `/storeAdmin/*`

## Summary

### Key Points

1. **Five distinct roles:** `user`, `owner`, `staff`, `storeAdmin`, `sysAdmin`
2. **Strict route separation:** `/sysAdmin/*` vs `/storeAdmin/*`
3. **Role-based access:** Enforced at layout and page levels
4. **Type safety:** Use Prisma `Role` enum throughout
5. **Centralized utilities:** Reusable access control functions

### Quick Reference

| Role | Can Access `/sysAdmin/*` | Can Access `/storeAdmin/*` |
|------|-------------------------|---------------------------|
| `user` | ❌ | ❌ |
| `owner` | ❌ | ✅ (own stores) |
| `staff` | ❌ | ✅ (assigned stores) |
| `storeAdmin` | ❌ | ✅ (managed stores) |
| `sysAdmin` | ✅ | ❌ |

---

**Related Documentation:**

- [Store Access Refactor](./STORE-ACCESS-REFACTOR.md) - Store access optimization
- [Security Policy](./SECURITY.md) - Security guidelines
- [Authentication & Authorization](../.cursor/rules/auth.mdc) - Auth implementation details
