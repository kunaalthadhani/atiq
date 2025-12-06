# Clear LocalStorage Instructions

To clear all localStorage data and start fresh with Supabase:

## Method 1: Browser Console (Recommended)

1. Open your application in the browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Type and press Enter:
   ```javascript
   localStorage.clear()
   ```
5. Refresh the page (F5)

## Method 2: Application Storage Tab

1. Open your application in the browser
2. Press `F12` to open Developer Tools
3. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Expand **Local Storage** in the left sidebar
5. Right-click on your domain and select **Clear**
6. Refresh the page (F5)

## Method 3: Clear All Browser Data

1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select "Cached images and files" and "Cookies and other site data"
3. Click "Clear data"

---

**Note**: After clearing localStorage, the app will now use Supabase for all data storage. Make sure you have:
1. Created the `.env` file with your Supabase credentials
2. Run the SQL schema in Supabase
3. Restarted your dev server (`npm run dev`)



