# Testing the Property Approval Flow

This guide will help you test the complete approval workflow for property creation.

## Prerequisites

1. **Two user accounts:**
   - One admin user (role: 'admin')
   - One regular user (role: 'user' or any non-admin role)

2. **Database setup:**
   - Ensure you've run the `property_unit_approval_migration.sql` script in Supabase SQL Editor
   - Ensure the `approval_requests` table exists and has the correct constraints

## Test Steps

### Step 1: Create Property as Non-Admin User

1. **Log in as a non-admin user** (regular user account)
2. Navigate to the **Properties** page
3. Click **"Add Property"** button
4. Fill in the property form:
   - Name: "Test Property"
   - Address: "123 Test Street"
   - City: "Test City"
   - Country: "Test Country"
   - Upload at least one image (optional)
   - Set status to "Active"
5. Click **"Save"** or **"Create Property"**

**Expected Result:**
- You should see an alert message: "Property created and submitted for approval"
- The property form should close
- **Note:** Currently, non-admin users won't see the property in the list until it's approved (this is by design - pending properties are hidden)

### Step 2: Verify Property Shows "Pending Approval" (Admin View)

1. **Log out** and **log in as admin user**
2. Navigate to the **Properties** page
3. You should see the property "Test Property" in the list
4. Look for a **yellow "Pending Approval" badge** with a Clock icon next to the property name

**Expected Result:**
- Property should be visible to admin
- Property should display a yellow "Pending Approval" badge
- Badge should have a Clock icon

### Step 3: Review and Edit Property in Approvals

1. Navigate to the **Approvals** page (should be visible in sidebar for admin)
2. You should see a request with type "Create Property"
3. Click on the request to open the approval modal
4. Verify the property details are displayed:
   - Property name
   - Address
   - City, Country
   - Images (if uploaded)
   - Status
   - Notes (if any)
5. Click the **"Edit"** button in the Property Information section
6. Make some changes (e.g., change the name to "Test Property - Updated")
7. Click **"Cancel Edit"** or the changes should auto-save as you type

**Expected Result:**
- All property details should be visible
- Edit mode should allow changing all fields
- Changes should be saved to the approval request

### Step 4: Approve the Property

1. In the approval modal, review the property details
2. Click the **"Approve"** button
3. Confirm the approval

**Expected Result:**
- The approval request should move from "Pending" to "Approved"
- The property's `approval_status` should be updated to 'approved' in the database
- The approval modal should close

### Step 5: Verify Property is Visible to Non-Admin Users

1. **Log out** and **log in as the non-admin user** again
2. Navigate to the **Properties** page
3. Look for "Test Property" (or "Test Property - Updated" if you edited it)

**Expected Result:**
- The property should now be visible in the list
- The "Pending Approval" badge should NOT be visible (since it's now approved)
- The property should be fully accessible to non-admin users

## Troubleshooting

### Property Not Showing After Approval

1. Check the browser console for errors
2. Verify the property's `approval_status` in Supabase:
   ```sql
   SELECT id, name, approval_status FROM properties WHERE name = 'Test Property';
   ```
   - Should show `approval_status = 'approved'`

3. Verify the approval request status:
   ```sql
   SELECT id, request_type, status, entity_id FROM approval_requests 
   WHERE request_type = 'property_create' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   - Should show `status = 'approved'`

### "Pending Approval" Badge Not Showing

1. Verify the property has `approval_status = 'pending'`:
   ```sql
   SELECT id, name, approval_status FROM properties WHERE approval_status = 'pending';
   ```

2. Check that the badge code is in the Properties.tsx file (around line 300)

### Approval Request Not Showing in Admin View

1. Verify you're logged in as admin:
   - Check the user's role in the `users` table
   - Ensure `role = 'admin'` (with no extra whitespace)

2. Check the approval_requests table:
   ```sql
   SELECT * FROM approval_requests WHERE request_type = 'property_create' AND status = 'pending';
   ```

3. Verify RLS policies allow admin to see approval requests

## Database Queries for Verification

### Check Property Approval Status
```sql
SELECT 
  p.id,
  p.name,
  p.approval_status,
  ar.status as approval_request_status,
  ar.requested_by,
  u.email as requested_by_email
FROM properties p
LEFT JOIN approval_requests ar ON ar.entity_id = p.id::text
LEFT JOIN auth.users u ON u.id = ar.requested_by
WHERE p.name LIKE '%Test Property%'
ORDER BY p.created_at DESC;
```

### Check All Pending Properties
```sql
SELECT id, name, approval_status, created_at
FROM properties
WHERE approval_status = 'pending'
ORDER BY created_at DESC;
```

### Check All Pending Approval Requests
```sql
SELECT 
  ar.id,
  ar.request_type,
  ar.status,
  ar.created_at,
  u.email as requested_by_email
FROM approval_requests ar
LEFT JOIN auth.users u ON u.id = ar.requested_by
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;
```

## Notes

- **Current Behavior:** Non-admin users cannot see their own pending properties until they're approved. This is by design to prevent confusion.
- **Admin Behavior:** Admins can see all properties, including pending ones, and can see the "Pending Approval" badge.
- **After Approval:** Once approved, the property becomes visible to all users (non-admin and admin).


