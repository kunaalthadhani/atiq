# Supabase Authentication Setup Guide

This guide will help you set up user authentication in Supabase for the PropTrack application.

## Step 1: Enable Supabase Auth

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Authentication** → **Providers**
3. Enable **Email** provider (it should be enabled by default)
4. Configure email settings if needed

## Step 2: Create Users Table

Run this SQL in the Supabase SQL Editor:

```sql
-- Create users table to store additional user information
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Create a function to automatically create a user record when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

## Step 3: Create Your First User

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users** in your Supabase dashboard
2. Click **"Add user"** → **"Create new user"**
3. Fill in:
   - **Email**: user@example.com
   - **Password**: (choose a strong password)
   - **Auto Confirm User**: ✅ (check this box)
4. Click **"Create user"**
5. The user will be automatically created in the `users` table via the trigger

### Option B: Using SQL (Alternative)

```sql
-- First, create the auth user (you'll need to use Supabase Auth API or Dashboard for this)
-- Then manually insert into users table if trigger didn't work:

INSERT INTO public.users (id, email, name, role)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'user@example.com',
  'John Doe',
  'admin'  -- or 'user'
);
```

## Step 4: Create Additional Users

### Method 1: Via Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter email and password
4. Check **"Auto Confirm User"** to skip email verification
5. Click **"Create user"**

### Method 2: Via SQL (For Bulk Creation)

You can't directly create auth users via SQL, but you can:

1. Create users via Dashboard or API
2. Update their details in the `users` table:

```sql
-- Update user details
UPDATE users
SET name = 'Jane Smith',
    role = 'admin'
WHERE email = 'jane@example.com';
```

## Step 5: Share Credentials

Once users are created, share:
- **Email**: The email address used during creation
- **Password**: The password you set (or they set if using signup)

## Step 6: Test Login

1. Open your application
2. Navigate to `/login`
3. Enter the email and password
4. You should be redirected to the dashboard

## Important Notes

### Password Requirements
- Minimum 6 characters (Supabase default)
- You can change this in **Authentication** → **Settings** → **Password**

### Email Verification
- If **Auto Confirm User** is checked, users can login immediately
- If not checked, users must verify their email first
- You can resend verification emails from the dashboard

### User Roles
- Default role is `'user'`
- You can set role to `'admin'` for administrators
- Roles can be used for permission checks in your app

### Security
- Never share passwords in plain text
- Use a password manager or secure sharing method
- Consider implementing password reset functionality
- Enable 2FA for admin accounts (if needed)

## Troubleshooting

### User can't login
1. Check if user exists in **Authentication** → **Users**
2. Verify email is correct
3. Check if user is confirmed (not pending verification)
4. Verify password is correct

### User created but not in users table
1. Check if the trigger `on_auth_user_created` exists
2. Manually insert user into `users` table if needed
3. Check Supabase logs for errors

### RLS Policy Issues
- If users can't see their data, check RLS policies
- Ensure policies allow users to read their own records

## Next Steps

1. ✅ Users can now login with email/password
2. Consider adding:
   - Password reset functionality
   - User profile page
   - Role-based access control
   - Session management
   - Activity logging

