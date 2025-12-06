# Tenant Payments Tracking System

A comprehensive web application for managing rental properties, tenants, contracts, invoices, and payments. Built with React, TypeScript, and Vite.

## 🚀 Features

### Core Functionality
- **Properties Management**: Add, edit, and manage multiple properties with images
- **Units Management**: Track individual rental units with details (bedrooms, bathrooms, size, rent)
- **Tenants Management**: Store tenant information including contact details and emergency contacts
- **Contracts Management**: Create and manage rental agreements with automatic invoice generation
- **Invoices Tracking**: Track all payment invoices with status monitoring
- **Payments Recording**: Record and track all payment transactions

### Advanced Features
- **Calendar View**: Visual calendar showing invoice due dates
- **Dashboard**: Comprehensive insights with graphs and statistics
- **Search Functionality**: Search across all entities (properties, units, tenants, contracts, invoices)
- **Email & WhatsApp Sharing**: Share invoice details directly via email or WhatsApp
- **Payment Reminders**: Automatic reminder notifications for upcoming payments
- **Overdue Tracking**: Separate tracking and highlighting of overdue invoices
- **Business Logic Validation**:
  - Prevents overlapping contracts for the same unit
  - Prevents tenants from having multiple active contracts
  - Automatic unit occupancy status updates
  - Automatic invoice status updates based on payments

### UI/UX Features
- **Beautiful Color Scheme**: Modern gradient design with blue, green, orange, and red accents
- **Responsive Design**: Works seamlessly on all device sizes with scrollable modals
- **Status Indicators**: Color-coded status badges for easy identification
- **Real-time Updates**: All changes reflect immediately across the application
- **Persistent Notifications**: Payment reminders stay visible until dismissed

## 🎯 Current Status

✅ **The application is now running!**

Access your application at:
- **Local**: http://localhost:3000/
- **Network**: http://192.168.1.17:3000/

You can open either URL in Google Chrome to use the application.

## 📊 Dummy Data Included

The application comes pre-loaded with comprehensive dummy data including:
- 3 Properties (Marina Heights, Palm Residences, Downtown Tower)
- 10 Units across properties
- 7 Tenants
- 7 Active Contracts with various payment scenarios
- Multiple Invoices with different statuses (paid, pending, partial, overdue)
- Payment history for testing

This allows you to thoroughly test all features and workflows immediately.

## 💰 Currency

All amounts are displayed in **AED (Arab Emirates Dirham)**.

## 🔧 Technical Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Data Storage**: LocalStorage (ready for Supabase integration)

## 📝 Business Rules Implemented

1. **Contracts**: 
   - Cannot create overlapping contracts for the same unit
   - Tenants cannot have multiple active contracts simultaneously
   - Start/end dates validate against existing contracts

2. **Invoices**:
   - Auto-generated based on contract payment frequency
   - Status automatically updates based on payments and due dates
   - Overdue detection and tracking

3. **Payments**:
   - Only unpaid/partially paid invoices can receive payments
   - Invoice status updates automatically after payment recording
   - Partial payments are tracked and reflected in remaining balance

4. **Units**:
   - Automatically marked as occupied when contract is created
   - Automatically marked as vacant when contract is terminated

5. **Reminders**:
   - Generated automatically based on contract reminder period settings
   - Shown as persistent notifications until dismissed
   - Multiple reminder period options (3 days, 1 week, 2 weeks, 1 month)

## 🎨 Key Workflows

### 1. Setup
- Add properties
- Add units to properties

### 2. Tenant Onboarding
- Add new tenant
- Create contract (automatically generates invoices)
- Unit becomes occupied

### 3. Payment Processing
- View pending/overdue invoices on dashboard
- Record payment against invoice
- Invoice status updates automatically
- Share payment reminders via WhatsApp/Email

### 4. Contract Management
- View all contracts with status
- Terminate contracts (marks unit vacant, cancels unpaid invoices)
- View contract details and invoice summary

### 5. Calendar Management
- View all invoice due dates in calendar format
- Click dates to see invoice details
- Monthly summary of paid/pending/overdue invoices

## 🔍 Search Capabilities

Search is available on all main pages:
- **Properties**: Search by name, address, or city
- **Units**: Search by unit number or type
- **Tenants**: Search by name, email, phone, or national ID
- **Contracts**: Search by tenant name or unit number
- **Invoices**: Search by invoice number or tenant name
- **Payments**: Search by invoice, tenant, or reference number

## 🔔 Notifications

The system includes a persistent notification system that:
- Displays active payment reminders at the top-right of the screen
- Reminders pulse to draw attention
- Can be dismissed individually
- Shows comprehensive payment details

## 🎯 Next Steps (Supabase Integration)

The application is currently using LocalStorage for data persistence. When ready to integrate with Supabase:

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Update `src/services/dataService.ts` to use Supabase instead of LocalStorage
3. Create corresponding tables in Supabase matching the TypeScript interfaces
4. Update CRUD operations to use Supabase queries

The data models are already structured to work seamlessly with Supabase.

## 📱 Screenshots

The application features:
- Modern gradient cards and buttons
- Color-coded status indicators
- Responsive grid layouts
- Interactive charts and graphs
- Clean, professional design

## 🎉 Ready to Use!

Open http://localhost:3000/ in your browser and start exploring all the features. The application is fully functional with comprehensive dummy data for testing!



