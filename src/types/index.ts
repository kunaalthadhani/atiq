// Core data models

export interface Property {
  id: string;
  name: string;
  address: string;
  addressLine2?: string;
  city: string;
  country: string;
  images: string[];
  createdAt: Date;
  // Optional extended fields used mainly for UI / future Supabase mapping
  shortCode?: string;
  state?: string;
  postalCode?: string;
  notes?: string;
  isActive?: boolean;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  type: 'studio' | '1BR' | '2BR' | '3BR' | '4BR' | 'penthouse' | 'villa';
  floor?: number | string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  monthlyRent: number;
  isOccupied: boolean;
  images: string[];
  notes?: string;
  createdAt: Date;
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  whatsappNumber: string;
  secondaryWhatsappNumber?: string;
  nationalId: string;
  emergencyContact: string;
  emergencyPhone: string;
  createdAt: Date;
  // Extended fields
  idType?: 'passport' | 'emirates_id' | 'driver_license' | 'other';
  idNumber?: string;
  idExpiryDate?: Date;
  billingAddress?: string;
  paymentMethod?: 'bank_transfer' | 'card' | 'cash' | 'cheque';
  notificationPreference?: 'whatsapp' | 'email';
  notes?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Approval status for non-admin created tenants
}

export type ContractStatus = 'active' | 'expired' | 'terminated' | 'draft';
export type PaymentFrequency = '1_payment' | '2_payment' | '3_payment' | '4_payment';
export type ReminderPeriod = '3_days' | '1_week' | '2_weeks' | '1_month';

export interface Contract {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  paymentFrequency: PaymentFrequency;
  numberOfInstallments: number;
  status: ContractStatus;
  reminderPeriod?: ReminderPeriod;
  notes?: string;
  createdAt: Date;
  contractNumber?: string;
  dueDateDay?: number; // Day of month for invoice due dates (1-31)
  attachments?: string[]; // Array of file URLs or base64 strings
}

export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  contractId: string;
  invoiceNumber: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  sentDate?: Date;
  createdAt: Date;
  notes?: string;
  adminStatus?: 'pending' | 'reviewed' | 'approved';
  paymentType?: PaymentMethod;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'online';

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  createdAt: Date;
}

export interface Reminder {
  id: string;
  contractId: string;
  invoiceId: string;
  reminderDate: Date;
  message: string;
  isDismissed: boolean;
  createdAt: Date;
}

// View models with joined data
export interface ContractWithDetails extends Contract {
  tenant: Tenant;
  unit: Unit;
  property: Property;
}

export interface InvoiceWithDetails extends Invoice {
  contract: Contract;
  tenant: Tenant;
  unit: Unit;
  property: Property;
  payments: Payment[];
}

export interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  activeTenants: number;
  activeContracts: number;
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  overdueInvoices: number;
  upcomingInvoices: number;
  occupancyRate: number;
  collectionRate: number;
}

// Approval system types
export type ApprovalRequestType = 'contract_create' | 'contract_terminate' | 'contract_cancel' | 'payment_create' | 'payment_delete' | 'tenant_create';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  requestType: ApprovalRequestType;
  requestedBy: string; // User ID
  approvedBy?: string; // User ID
  status: ApprovalStatus;
  entityType: 'contract' | 'payment' | 'tenant';
  entityId?: string; // ID after creation
  requestData: any; // The full data for the request
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

export interface ApprovalRequestWithDetails extends ApprovalRequest {
  requesterName?: string;
  approverName?: string;
}

