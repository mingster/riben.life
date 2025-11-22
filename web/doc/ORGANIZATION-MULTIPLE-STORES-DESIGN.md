# Organization & Multiple Stores Design

**Date:** 2025-01-27  
**Status:** Active  
**Related:** [STORE-ACCESS-REFACTOR.md](./STORE-ACCESS-REFACTOR.md)

## Overview

This document describes the design and implementation of the organization-based multi-store system. The system allows users to own multiple stores, with each store belonging to an organization. Organizations enable better access control, team collaboration, and store management at scale.

## Design Principles

1. **One Organization Per User**: Each user has one organization that can contain multiple stores
2. **Automatic Organization Creation**: Organizations are created automatically when a user creates their first store
3. **Reuse Existing Organization**: When creating additional stores, the user's existing organization is reused (not creating new organizations)
4. **User Membership**: Users become members of organizations when they create their first store
5. **Active Organization Context**: The system maintains an active organization context for better UX
6. **Store Isolation**: Each store operates independently within the same organization

## Database Schema

### Core Models

#### Organization

```prisma
model Organization {
  id        String   @id
  name      String
  slug      String   @unique
  logo      String?
  metadata  String?
  createdAt DateTime

  members     Member[]
  invitations Invitation[]
  stores      Store[]
}
```

**Key Points:**

- Unique `slug` for URL-friendly identifiers
- One-to-many relationship with `Store`
- Many-to-many relationship with `User` through `Member`

#### Member

```prisma
model Member {
  id             String   @id
  userId         String
  organizationId String
  role           String
  createdAt      DateTime

  organization Organization @relation(...)
  user         User         @relation(...)
}
```

**Key Points:**

- Links users to organizations
- Supports role-based access with roles: `owner`, `storeAdmin`, `staff`, `customer`
- Enables team collaboration within organizations

#### Store

```prisma
model Store {
  id             String @id @default(uuid())
  organizationId String  // Required - every store belongs to an organization
  name           String
  ownerId        String
  // ... other fields
}
```

**Key Points:**

- **Required** `organizationId` - every store must belong to an organization
- `ownerId` identifies the primary owner (who created the store)
- Multiple stores can belong to the same organization

### Relationship Diagram

```
User
  ├── Member[] (many-to-many with Organization)
  └── Store[] (as owner)

Organization
  ├── Member[] (many-to-many with User)
  ├── Store[] (one-to-many)
  └── Invitation[] (for team invites)

Store
  ├── Organization (required, one-to-one)
  └── Owner (User, one-to-one)
```

## Organization Creation Flow

### When Creating a New Store

The system automatically handles organization creation:

1. **Check User's Existing Organizations**

   ```typescript
   const userOrganizations = await sqlClient.member.findMany({
     where: { userId: ownerId },
     include: { organization: true },
   });
   ```

2. **Create or Reuse Organization**
   - If user has no organizations → Create new organization
   - If user has organizations → Reuse the first existing organization (do NOT create new one)
   - Generate unique slug from store name (only for first organization)
   - Handle slug conflicts with random suffix (only for first organization)

3. **Link Store to Organization**
   - Store is created with `organizationId`
   - User becomes a member of the organization automatically

### Implementation

**Location:** `web/src/actions/storeAdmin/store/create-store.ts`

```typescript
// Check if user has organizations
const userOrganizations = await sqlClient.member.findMany({
  where: { userId: ownerId },
  include: { organization: true },
});

// Create organization if user has none, otherwise reuse existing
if (userOrganizations.length === 0) {
  organization = await auth.api.createOrganization({
    headers: headersList,
    body: {
      name: name,
      slug: storeSlug,
      keepCurrentActiveOrganization: true,
    },
  });
} else {
  // Reuse the first existing organization (user has one org for all stores)
  organization = userOrganizations[0].organization;
}

// Create store with organizationId
const store = await sqlClient.store.create({
  data: {
    name,
    ownerId,
    organizationId: organization.id, // Required
    // ... other fields
  },
});
```

## Store Switching

### Store Switcher Component

**Location:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/components/store-switcher.tsx`

The store switcher allows users to:

1. View all their stores
2. Switch between stores
3. Automatically set active organization context

### Switching Flow

1. **User Selects Store**
   - User clicks on a store in the switcher dropdown

2. **Set Active Organization**

   ```typescript
   // Fetch organization details
   const organization = await fetch(`/api/common/get-organization?id=${store.organizationId}`);
   
   // Set active organization
   await authClient.organization.setActive({
     organizationId: organization.id,
     organizationSlug: organization.slug,
   });
   ```

3. **Remember Selection**
   - Store selected `storeId` in cookie (`lastSelectedStoreId`)
   - Persists for future visits

4. **Redirect**
   - Navigate to selected store's dashboard
   - Refresh page to load new organization context

### Preference Persistence

The system remembers the user's last selected store:

- **Cookie Name:** `lastSelectedStoreId`
- **Storage:** Client-side cookie (persists across sessions)
- **Usage:** Can be used to redirect users to their last active store on login

## Active Organization Management

### Setting Active Organization

The system maintains an "active organization" context for better UX:

**Server-Side (Page Load):**

```typescript
// In page.tsx
if (organization?.id) {
  await auth.api.setActiveOrganization({
    headers: headersList,
    body: {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    },
  });
}
```

**Client-Side (Store Switch):**

```typescript
// In store-switcher.tsx
await authClient.organization.setActive({
  organizationId: organization.id,
  organizationSlug: organization.slug,
});
```

### Why Active Organization?

- Better Auth Context: Better-auth uses active organization for access control
- Session Management: Tracks which organization the user is currently working with
- UI State: Can be used to filter data, show organization-specific settings
- Team Collaboration: Enables multi-user access to organization resources

## Legacy Store Migration

### Automatic Organization Linking

For existing stores without `organizationId`, the system automatically creates/links organizations:

**Location:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/page.tsx`

```typescript
// If store doesn't have organizationId
if (!store.organizationId) {
  // Try to find existing organization by slug
  organization = await sqlClient.organization.findFirst({
    where: { slug: store.name.toLowerCase().replace(/ /g, "-") },
  });

  // If not found, create new one
  if (!organization) {
    organization = await auth.api.createOrganization({
      headers: headersList,
      body: {
        name: store.name,
        slug: store.name.toLowerCase().replace(/ /g, "-"),
        keepCurrentActiveOrganization: true,
      },
    });
  }

  // Link store to organization
  await sqlClient.store.update({
    where: { id: store.id },
    data: { organizationId: organization.id },
  });
}
```

## API Endpoints

### Get Organization

**Endpoint:** `GET /api/common/get-organization?id={organizationId}`

**Purpose:** Fetch organization details by ID

**Response:**

```json
{
  "id": "org-id",
  "name": "Organization Name",
  "slug": "organization-slug"
}
```

**Location:** `web/src/app/api/common/get-organization/route.ts`

### Check Organization Slug

**Endpoint:** `GET /api/common/check-organization-slug?slug={slug}`

**Purpose:** Check if an organization slug is available

**Response:**

```json
{
  "status": true  // true = taken, false = available
}
```

**Location:** `web/src/app/api/common/check-organization-slug/route.ts`

### Get User's Stores

**Endpoint:** `GET /api/store/owner/{ownerId}/getStores`

**Purpose:** Get all stores owned by a user

**Response:** Array of stores with `organizationId` included

**Location:** `web/src/app/api/store/owner/[ownerId]/getStores/route.ts`

## Slug Generation

### Rules

1. **Convert to Lowercase**: `"My Store"` → `"my-store"`
2. **Replace Spaces**: Spaces become hyphens
3. **Uniqueness Check**: Query database for existing slug
4. **Conflict Resolution**: Append random suffix if slug exists

   ```typescript
   if (slugExists) {
     slug = slug + "-" + Math.random().toString(36).substring(2, 15);
   }
   ```

### Examples

- `"Coffee Shop"` → `"coffee-shop"`
- `"My Store"` → `"my-store"` (if available)
- `"My Store"` → `"my-store-k3j9x2"` (if `"my-store"` is taken)

## Client-Side Validation

### Store Name Availability Check

**Location:** `web/src/app/storeAdmin/(root)/store-modal.tsx`

The store creation form includes real-time slug availability checking:

1. **Debounced Validation** (500ms delay)
2. **API Call** to check slug availability
3. **Visual Feedback** - shows "Checking availability..." message
4. **Error Display** - shows error if name is taken
5. **Form Blocking** - prevents submission if name is unavailable

```typescript
// Debounced check
useEffect(() => {
  const slug = storeName.toLowerCase().replace(/ /g, "-");
  
  const timer = setTimeout(async () => {
    const response = await fetch(
      `/api/common/check-organization-slug?slug=${encodeURIComponent(slug)}`
    );
    const data = await response.json();
    
    if (data.status === true) {
      form.setError("name", {
        type: "manual",
        message: "Store name is already taken.",
      });
    }
  }, 500);
  
  return () => clearTimeout(timer);
}, [storeName]);
```

## Design Decisions

### 1. Automatic Organization Creation

**Decision:** Organizations are created automatically when needed.

**Rationale:**

- Reduces friction when creating a new store
- Ensures all stores have organizations
- No manual organization setup required

**Trade-offs:**

- Users may not understand organizations exist
- **Mitigation:** Organizations are created automatically, users don't need to manage them
- **Mitigation:** One organization per user prevents organization proliferation

### 3. Required organizationId

**Decision:** `organizationId` is required for all stores.

**Rationale:**

- Enforces data integrity
- Simplifies queries (no null checks)
- Better for access control

**Migration:**

- Legacy stores without `organizationId` are automatically migrated
- Migration happens on first page load

### 4. Active Organization Context

**Decision:** System maintains active organization in session.

**Rationale:**

- Better UX (user sees relevant data)
- Enables organization-scoped features
- Supports team collaboration

**Implementation:**

- Set on page load (server-side)
- Updated on store switch (client-side)
- Stored in session via better-auth

## Access Control

### Store Ownership

- **Primary Owner:** User who created the store (`ownerId`)
- **Organization Members:** Users who are members of the store's organization
- **Role-Based:** Member roles determine access level

### Current Implementation

- Store access is primarily based on `ownerId`
- Organization membership is tracked but not yet used for access control
- **Future:** Organization roles will enable team access

## Error Handling

### Organization Creation Failures

```typescript
try {
  organization = await auth.api.createOrganization({...});
} catch (error) {
  logger.error("Failed to create organization", {
    metadata: { error, name, ownerId },
    tags: ["store", "organization", "error"],
  });
  throw new SafeError("Failed to create organization. Please try again.");
}
```

### Store Creation Without Organization

- **Prevented:** Store creation requires `organizationId`
- **Validation:** Server action validates organization exists before creating store
- **Fallback:** If organization creation fails, store creation is aborted

## Performance Considerations

### Organization Lookups

- **Indexed:** `organizationId` is indexed on `Store` table
- **Cached:** Organization data can be cached (rarely changes)
- **Eager Loading:** Include organization when fetching stores if needed

### Store Switching

- **Client-Side:** Store switching uses client-side API calls
- **Debouncing:** Slug validation is debounced to reduce API calls
- **Caching:** Store list is cached via SWR (1 hour deduplication)

## Future Enhancements

### Planned Features

1. **Organization Settings**
   - Organization-level configuration
   - Shared settings across stores in same org

2. **Team Management**
   - Invite users to organizations
   - Role-based permissions: `owner`, `storeAdmin`, `staff`, `customer`
   - Organization-level access control

3. **Organization Dashboard**
   - View all stores in organization
   - Organization-level analytics
   - Cross-store reporting

4. **Store Transfer**
   - Transfer stores between organizations
   - Change store ownership
   - Organization merge/split

### Potential Improvements

- **Organization Selection:** Allow users to choose existing organization when creating store
- **Organization Templates:** Pre-configured organization settings
- **Organization Billing:** Organization-level subscription management

## Code Examples

### Creating a Store with Organization

```typescript
// 1. Check if user has organizations
const userOrgs = await sqlClient.member.findMany({
  where: { userId: ownerId },
});

// 2. Create organization if needed
let organization;
if (userOrgs.length === 0) {
  organization = await auth.api.createOrganization({
    headers: await headers(),
    body: {
      name: storeName,
      slug: generateSlug(storeName),
      keepCurrentActiveOrganization: true,
    },
  });
}

// 3. Create store with organizationId
const store = await sqlClient.store.create({
  data: {
    name: storeName,
    ownerId,
    organizationId: organization.id, // Required
    // ... other fields
  },
});
```

### Switching Stores

```typescript
// 1. Get organization for selected store
const org = await fetch(`/api/common/get-organization?id=${store.organizationId}`);
const organization = await org.json();

// 2. Set active organization
await authClient.organization.setActive({
  organizationId: organization.id,
  organizationSlug: organization.slug,
});

// 3. Remember selection
cookies.set("lastSelectedStoreId", storeId, { path: "/" });

// 4. Navigate
router.push(`/storeAdmin/${storeId}`);
router.refresh();
```

### Checking Slug Availability

```typescript
// Client-side validation
const response = await fetch(
  `/api/common/check-organization-slug?slug=${slug}`
);
const { status } = await response.json();

if (status === true) {
  // Slug is taken
  form.setError("name", {
    type: "manual",
    message: "Store name is already taken.",
  });
}
```

## Testing Considerations

### Test Scenarios

1. **New User Creates First Store**
   - Verify organization is created
   - Verify user becomes member
   - Verify store is linked

2. **Existing User Creates Additional Store**
   - Verify new organization is created
   - Verify existing organizations remain
   - Verify store is linked to new org

3. **Store Switching**
   - Verify active organization changes
   - Verify cookie is set
   - Verify redirect works

4. **Slug Conflicts**
   - Verify slug uniqueness check
   - Verify random suffix is added
   - Verify no duplicate slugs

5. **Legacy Store Migration**
   - Verify organization is created/linked
   - Verify store is updated
   - Verify no data loss

## Summary

The organization-based multi-store system provides:

- ✅ **Automatic Organization Management**: Organizations created automatically when user creates first store
- ✅ **One Organization Per User**: All user's stores belong to the same organization
- ✅ **Organization Reuse**: Existing organization is reused when creating additional stores (no duplicate orgs)
- ✅ **Easy Store Switching**: Seamless switching with active organization context
- ✅ **Preference Persistence**: Remembers user's last selected store
- ✅ **Slug Uniqueness**: Ensures unique organization slugs
- ✅ **Legacy Support**: Automatic migration for existing stores
- ✅ **Scalability**: Supports unlimited stores per user within one organization
- ✅ **Future-Ready**: Foundation for team collaboration features

This design balances simplicity (automatic creation, one org per user) with efficiency (reusing existing organizations) while maintaining data integrity and supporting future enhancements.
