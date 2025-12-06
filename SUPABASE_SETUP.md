# Supabase Setup Instructions

## ⚠️ Important: You Need Your Supabase Project URL

You provided:
- **API Key**: `sb_publishable_-Hx0pIaiyHa8qSlhl1lksw_zd5C4iNA`

You also need:
- **Supabase Project URL** (e.g., `https://xxxxx.supabase.co`)

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (this is your API key - you already have this)

## Step 2: Create .env File

Create a `.env` file in the root directory (same level as `package.json`) with:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_-Hx0pIaiyHa8qSlhl1lksw_zd5C4iNA
```

**Important**: 
- Replace `https://your-project-id.supabase.co` with your actual Supabase project URL
- The API key you provided is already included above

## Step 3: Run the SQL Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the SQL schema provided earlier (the one with CREATE TABLE statements)
4. Click **Run** to execute the SQL and create all tables

## Step 4: Switch to Supabase (Optional)

The application currently uses `localStorage` for data storage. To switch to Supabase:

1. Open `src/services/dataService.ts`
2. Find the line at the bottom:
   ```typescript
   export const dataService = new DataService();
   ```
3. Replace it with:
   ```typescript
   import { supabaseService } from './supabaseService';
   export const dataService = supabaseService;
   ```

## Current Status

- ✅ Supabase client library installed (`@supabase/supabase-js`)
- ✅ Supabase client configured (`src/lib/supabase.ts`)
- ✅ Supabase service created (`src/services/supabaseService.ts`)
- ✅ All CRUD operations implemented for Supabase
- ⚠️ **You need to**:
  1. Create `.env` file with your Supabase URL and key
  2. Run the SQL schema in Supabase SQL Editor
  3. (Optional) Switch `dataService` to use Supabase instead of localStorage

## Testing the Connection

After setting up:
1. Restart your dev server (`npm run dev`)
2. The app will use Supabase if you've switched the dataService
3. Check the browser console for any connection errors

## Note

The application will continue to work with `localStorage` until you switch to Supabase. This allows you to test the Supabase setup without breaking the existing functionality.
