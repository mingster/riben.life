# System Admin User Management

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.0

## Overview

This document describes the system administrator user management features, including the editable user fields and administrative capabilities available to `sysAdmin` users.

## User Management Interface

System administrators can manage users through the `/sysAdmin/users` interface, which provides a comprehensive user management system.

## Editable User Fields

System administrators can edit the following user fields directly without restrictions:

### Basic Information

- **Name** (`name`): User's full name (required, minimum 5 characters)
- **Email** (`email`): User's email address (optional)
- **Password** (`password`): User's password (only editable when creating new users)

### Profile Settings

- **Locale** (`locale`): User's preferred language/locale (required)
- **Timezone** (`timezone`): User's timezone setting (required, default: "America/New_York")
- **Profile Image** (`image`): URL to user's profile image (optional)

### Phone Number

- **Phone Number** (`phoneNumber`): User's phone number in E.164 format (e.g., `+886912345678` or `+14155551212`)
  - **Direct Edit:** System administrators can edit phone numbers directly without OTP verification
  - **Format:** Must be in E.164 international format
  - **Example formats:**
    - Taiwan: `+886912345678`
    - US/Canada: `+14155551212`
- **Phone Number Verified** (`phoneNumberVerified`): Boolean flag indicating if phone number has been verified

### Authentication & Security

- **Two Factor Enabled** (`twoFactorEnabled`): Boolean flag indicating if two-factor authentication is enabled for the user
- **Role** (`role`): User's role in the system (required)
  - Available roles: `user`, `owner`, `staff`, `storeAdmin`, `sysAdmin`

### Account Status

- **Banned** (`banned`): Boolean flag indicating if the user account is banned
- **Ban Reason** (`banReason`): Text description of why the user was banned (shown only when `banned` is true)
- **Ban Expires** (`banExpires`): DateTime when the ban expires (shown only when `banned` is true)

### Payment Integration

- **Stripe Customer ID** (`stripeCustomerId`): Stripe customer identifier (optional)

## User Management Actions

### Create New User

System administrators can create new users with the following fields:

1. **Required fields:**
   - Name (minimum 5 characters)
   - Email
   - Password
   - Locale
   - Timezone
   - Role

2. **Optional fields:**
   - Phone Number
   - Phone Number Verified
   - Profile Image
   - Two Factor Enabled
   - Banned status
   - Ban Reason
   - Ban Expires
   - Stripe Customer ID

### Edit Existing User

System administrators can edit all user fields listed above. Changes are saved directly to the database without additional verification steps.

**Note:** Unlike regular user account settings (accessible at `/account`), system administrators can:
- Edit phone numbers directly without OTP verification
- Modify any user field without restrictions
- Change user roles
- Ban/unban users
- Set verification flags directly

### Delete User

System administrators can delete users through the user management interface. The deletion process:

1. Deletes all related data (API keys, passkeys, sessions, accounts, two-factor auth, subscriptions, invitations, members)
2. Removes the user from Better Auth
3. Returns a success response

**API Endpoint:** `DELETE /api/sysAdmin/user/[userId]`

Where `userId` is the user's email address.

## Technical Implementation

### Validation Schema

The user update validation schema is defined in `web/src/actions/sysAdmin/user/user.validation.ts`:

```typescript
export const updateUserSettingsSchema = z.object({
  id: z.string(),
  name: z.string().min(5),
  email: z.email().optional(),
  password: z.string().optional(),
  locale: z.string().min(1),
  timezone: z.string(),
  role: z.string(),
  stripeCustomerId: z.string().optional(),
  phoneNumber: z.string().optional(),
  phoneNumberVerified: z.boolean().optional(),
  image: z.string().url().optional().or(z.literal("")),
  twoFactorEnabled: z.boolean().optional(),
  banned: z.boolean().optional(),
  banReason: z.string().optional(),
  banExpires: z.string().optional(), // ISO date string
});
```

### Server Action

User updates are handled by `updateUserAction` in `web/src/actions/sysAdmin/user/update-user.ts`:

- Uses `adminActionClient` to ensure only system administrators can access
- Updates all provided fields in the database
- Converts `banExpires` ISO string to DateTime format
- Returns the updated user object with all relations

### UI Component

The user edit form is implemented in `web/src/app/sysAdmin/users/components/edit-user.tsx`:

- Uses React Hook Form with Zod validation
- Displays all editable fields in a dialog
- Conditional rendering for ban-related fields (only shown when `banned` is true)
- Phone number field allows direct text input (no OTP verification required)

## Differences from User Account Settings

The system admin user edit form differs from regular user account settings (`/account`) in several ways:

| Feature | User Account Settings | System Admin User Edit |
|---------|----------------------|----------------------|
| Phone Number Edit | Requires OTP verification via dialog | Direct text input |
| Role Management | Not editable | Editable |
| Ban Management | Not available | Available |
| Two-Factor Status | Not editable | Editable |
| Verification Flags | Not editable | Editable |
| Profile Image | Editable | Editable |
| Locale/Timezone | Editable | Editable |

## Security Considerations

1. **Access Control:** All user management actions require `sysAdmin` role
2. **Phone Number Updates:** System administrators can bypass OTP verification for phone number updates (trusted administrator privilege)
3. **Role Changes:** System administrators can change user roles, which affects access permissions
4. **Ban Management:** Only system administrators can ban/unban users
5. **Data Deletion:** User deletion is a destructive operation that removes all related data

## API Endpoints

### Update User

**Endpoint:** `PATCH /api/sysAdmin/user/[userId]`  
**Status:** Deprecated (use server action instead)

### Delete User

**Endpoint:** `DELETE /api/sysAdmin/user/[userId]`  
**Parameters:**
- `userId`: User's email address

**Response:**
```json
{
  "success": true,
  "message": "user deleted"
}
```

## Related Documentation

- [Role-Based Access Control](./ROLE-BASED-ACCESS-CONTROL.md) - Overview of user roles and access control
- [Phone Login Documentation](../FOUNDATION/PHONE-LOGIN-KNOCK.md) - Phone number authentication implementation
- [Functional Requirements - Ordering](../ORDERING/FUNCTIONAL-REQUIREMENTS-ORDERING.md) - System administration features overview

