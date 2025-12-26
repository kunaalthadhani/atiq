// Hybrid service: Uses Supabase if configured, otherwise falls back to localStorage
import { supabase } from '@/lib/supabase';
import { supabaseService } from './supabaseService';

// Check if we should use Supabase or localStorage
const useSupabase = supabase !== null;

if (useSupabase) {
  console.log('✅ Using Supabase for data storage');
} else {
  console.warn('⚠️ Supabase not configured, using localStorage fallback');
}

// For now, let's use a localStorage-based service as fallback
// Import the old localStorage-based service logic
import { 
  Property, Unit, Tenant, Contract, Invoice, Payment, Reminder,
  ContractWithDetails, InvoiceWithDetails, DashboardStats,
  ApprovalRequestWithDetails, ApprovalStatus
} from '@/types';

// Simple localStorage-based service as fallback
class LocalStorageService {
  private getStorageKey(key: string): string {
    return `tenant_tracking_${key}`;
  }

  private loadFromStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(this.getStorageKey(key));
      if (!data) return [];
      return JSON.parse(data).map((item: any) => {
        // Convert date strings back to Date objects
        const dateFields = ['createdAt', 'startDate', 'endDate', 'dueDate', 'paymentDate', 'reminderDate', 'sentDate', 'idExpiryDate'];
        dateFields.forEach(field => {
          if (item[field]) item[field] = new Date(item[field]);
        });
        return item;
      });
    } catch {
      return [];
    }
  }

  private saveToStorage<T>(key: string, data: T[]): void {
    localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
  }

  async getProperties(userRole?: string): Promise<Property[]> {
    return this.loadFromStorage<Property>('properties');
  }

  async getUnits(): Promise<Unit[]> {
    return this.loadFromStorage<Unit>('units');
  }

  async getTenants(range?: { from: number; to: number }, userRole?: string, userId?: string): Promise<Tenant[]> {
    return this.loadFromStorage<Tenant>('tenants');
  }

  async getContracts(): Promise<ContractWithDetails[]> {
    const contracts = this.loadFromStorage<Contract>('contracts');
    const tenants = this.loadFromStorage<Tenant>('tenants');
    const units = this.loadFromStorage<Unit>('units');
    const properties = this.loadFromStorage<Property>('properties');

    return contracts.map(contract => {
      const tenant = tenants.find(t => t.id === contract.tenantId);
      const unit = units.find(u => u.id === contract.unitId);
      const property = properties.find(p => p.id === unit?.propertyId);
      
      if (!tenant || !unit || !property) return null;
      
      return {
        ...contract,
        tenant,
        unit,
        property
      } as ContractWithDetails;
    }).filter((c): c is ContractWithDetails => c !== null);
  }

  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const invoices = this.loadFromStorage<Invoice>('invoices');
    const contracts = this.loadFromStorage<Contract>('contracts');
    const tenants = this.loadFromStorage<Tenant>('tenants');
    const units = this.loadFromStorage<Unit>('units');
    const properties = this.loadFromStorage<Property>('properties');
    const payments = this.loadFromStorage<Payment>('payments');

    return invoices.map(invoice => {
      const contract = contracts.find(c => c.id === invoice.contractId);
      if (!contract) return null;
      
      const tenant = tenants.find(t => t.id === contract.tenantId);
      const unit = units.find(u => u.id === contract.unitId);
      const property = properties.find(p => p.id === unit?.propertyId);
      const invoicePayments = payments.filter(p => p.invoiceId === invoice.id);
      
      if (!tenant || !unit || !property) return null;
      
      return {
        ...invoice,
        contract,
        tenant,
        unit,
        property,
        payments: invoicePayments
      } as InvoiceWithDetails;
    }).filter((inv): inv is InvoiceWithDetails => inv !== null);
  }

  async getPayments(): Promise<Payment[]> {
    return this.loadFromStorage<Payment>('payments');
  }

  async getInvoicesByDateRange(startDate: Date, endDate: Date): Promise<InvoiceWithDetails[]> {
    const invoices = await this.getInvoices();
    return invoices.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      return dueDate >= startDate && dueDate <= endDate;
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const properties = await this.getProperties();
    const units = await this.getUnits();
    const tenants = await this.getTenants();
    const contracts = await this.getContracts();
    const invoices = await this.getInvoices();

    const activeContracts = contracts.filter(c => c.status === 'active');
    const activeTenants = new Set(activeContracts.map(c => c.tenantId)).size;
    
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const collectedRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pendingRevenue = invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'partial')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const overdueRevenue = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0);

    const overdueInvoices = invoices.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      return inv.status !== 'paid' && inv.status !== 'cancelled' && dueDate < new Date();
    });

    const upcomingInvoices = invoices.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return inv.status === 'pending' && dueDate >= today && dueDate <= nextWeek;
    });

    const occupiedUnits = units.filter(u => u.isOccupied).length;
    const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;
    const collectionRate = totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0;

    return {
      totalProperties: properties.length,
      totalUnits: units.length,
      occupiedUnits,
      vacantUnits: units.length - occupiedUnits,
      totalTenants: tenants.length,
      activeTenants,
      activeContracts: activeContracts.length,
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      overdueRevenue,
      overdueInvoices: overdueInvoices.length,
      upcomingInvoices: upcomingInvoices.length,
      occupancyRate,
      collectionRate,
    };
  }

  async getOverdueInvoices(): Promise<InvoiceWithDetails[]> {
    const invoices = await this.getInvoices();
    const now = new Date();
    return invoices.filter(inv => {
      const dueDate = new Date(inv.dueDate);
      return inv.status !== 'paid' && inv.status !== 'cancelled' && dueDate < now;
    });
  }

  getActiveReminders(): Reminder[] {
    const reminders = this.loadFromStorage<Reminder>('reminders');
    const now = new Date();
    return reminders.filter(r => {
      if (r.isDismissed) return false;
      if (!r.reminderDate) return false;
      const reminderDate = new Date(r.reminderDate);
      return reminderDate <= now;
    });
  }

  async dismissReminder(id: string): Promise<boolean> {
    const reminders = this.loadFromStorage<Reminder>('reminders');
    const updated = reminders.map(r => 
      r.id === id ? { ...r, dismissed: true } : r
    );
    this.saveToStorage('reminders', updated);
    return true;
  }

  async createContract(
    contract: Omit<Contract, 'id' | 'createdAt'>,
    _userId?: string,
    _userRole?: string
  ): Promise<{ success: boolean; message?: string; contract?: Contract; requiresApproval?: boolean; approvalRequestId?: string }> {
    const contracts = this.loadFromStorage<Contract>('contracts');
    const newContract: Contract = {
      ...contract,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    contracts.push(newContract);
    this.saveToStorage('contracts', contracts);
    return { success: true, contract: newContract };
  }

  async terminateContract(
    id: string,
    _userId?: string,
    _userRole?: string
  ): Promise<boolean | { requiresApproval: boolean; approvalRequestId: string; message: string }> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _userId, _userRole };
    void _unused;
    const contracts = this.loadFromStorage<Contract>('contracts');
    const contract = contracts.find(c => c.id === id);
    if (!contract) return false;

    contract.status = 'terminated';
    this.saveToStorage('contracts', contracts);

    // Mark unit as vacant
    const units = this.loadFromStorage<Unit>('units');
    const unit = units.find(u => u.id === contract.unitId);
    if (unit) {
      unit.isOccupied = false;
      this.saveToStorage('units', units);
    }

    // Cancel unpaid invoices
    const invoices = this.loadFromStorage<Invoice>('invoices');
    invoices.forEach(inv => {
      if (inv.contractId === id && ['pending', 'partial', 'overdue'].includes(inv.status)) {
        inv.status = 'cancelled';
      }
    });
    this.saveToStorage('invoices', invoices);

    return true;
  }

  async updateContract(
    id: string, 
    updates: Partial<Omit<Contract, 'id' | 'createdAt'>>,
    _userId?: string,
    _userRole?: string
  ): Promise<Contract | null> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _userId, _userRole };
    void _unused;
    const contracts = this.loadFromStorage<Contract>('contracts');
    const contract = contracts.find(c => c.id === id);
    if (!contract) return null;

    // Prevent editing active contracts
    if (contract.status === 'active' && updates.status !== 'terminated') {
      const allowedFields = ['status'];
      const updateKeys = Object.keys(updates);
      const hasDisallowedFields = updateKeys.some(key => !allowedFields.includes(key));
      if (hasDisallowedFields) {
        throw new Error('Active contracts cannot be edited. Only termination is allowed.');
      }
    }

    Object.assign(contract, updates);
    this.saveToStorage('contracts', contracts);
    return contract;
  }

  async createPayment(
    payment: Omit<Payment, 'id' | 'createdAt'>,
    _userId?: string,
    _userRole?: string
  ): Promise<Payment | { requiresApproval: boolean; approvalRequestId: string; message: string }> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _userId, _userRole };
    void _unused;
    const payments = this.loadFromStorage<Payment>('payments');
    const newPayment: Payment = {
      ...payment,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    payments.push(newPayment);
    this.saveToStorage('payments', payments);

    // Update invoice amounts
    const invoices = this.loadFromStorage<Invoice>('invoices');
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    if (invoice) {
      // Round amounts to 2 decimal places to avoid floating-point precision issues
      const newPaidAmount = Math.round(((invoice.paidAmount || 0) + payment.amount) * 100) / 100;
      const newRemainingAmount = Math.round((invoice.amount - newPaidAmount) * 100) / 100;
      
      invoice.paidAmount = newPaidAmount;
      invoice.remainingAmount = newRemainingAmount;
      
      // Update status
      if (newRemainingAmount <= 0.01) {
        invoice.status = 'paid';
        // Ensure remaining amount is exactly 0 when paid
        invoice.remainingAmount = 0;
        invoice.paidAmount = invoice.amount;
      } else if (newPaidAmount > 0) {
        invoice.status = invoice.status === 'pending' ? 'partial' : invoice.status;
      }
      
      this.saveToStorage('invoices', invoices);
    }

    return newPayment;
  }

  async deletePayment(
    paymentId: string,
    _userId?: string,
    _userRole?: string
  ): Promise<boolean | { requiresApproval: boolean; approvalRequestId: string; message: string }> {
    const payments = this.loadFromStorage<Payment>('payments');
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return false;

    // Approval system requires Supabase
    // For localStorage, we'll just allow deletion (no approval system)
    // Note: In production with Supabase, approval would be handled by supabaseService

    const filtered = payments.filter(p => p.id !== paymentId);
    this.saveToStorage('payments', filtered);

    // Update invoice amounts
    const invoices = this.loadFromStorage<Invoice>('invoices');
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    if (invoice) {
      invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
      invoice.remainingAmount = invoice.amount - invoice.paidAmount;
      
      // Update status
      if (invoice.remainingAmount <= 0) {
        invoice.status = 'paid';
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partial';
      } else {
        invoice.status = 'pending';
      }
      
      this.saveToStorage('invoices', invoices);
    }

    return true;
  }

  async updateInvoice(id: string, updates: Partial<Omit<Invoice, 'id' | 'createdAt' | 'contractId' | 'invoiceNumber' | 'installmentNumber' | 'dueDate' | 'amount'>>): Promise<Invoice | null> {
    const invoices = this.loadFromStorage<Invoice>('invoices');
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return null;
    
    Object.assign(invoice, updates);
    this.saveToStorage('invoices', invoices);
    return invoice;
  }

  async createTenant(
    tenant: Omit<Tenant, 'id' | 'createdAt'>,
    userId?: string,
    userRole?: string
  ): Promise<Tenant | { requiresApproval: boolean; approvalRequestId: string; message: string }> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _userId: userId, _userRole: userRole };
    void _unused;
    
    const tenants = this.loadFromStorage<Tenant>('tenants');
    const newTenant: Tenant = {
      ...tenant,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    tenants.push(newTenant);
    this.saveToStorage('tenants', tenants);
    return newTenant;
  }

  // Stub methods for compatibility (these would need full implementation)
  async createProperty(property: Omit<Property, 'id' | 'createdAt'>): Promise<Property> {
    const properties = this.loadFromStorage<Property>('properties');
    const newProperty: Property = {
      ...property,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    properties.push(newProperty);
    this.saveToStorage('properties', properties);
    return newProperty;
  }

  async updateProperty(id: string, updates: Partial<Omit<Property, 'id' | 'createdAt'>>): Promise<Property | null> {
    const properties = this.loadFromStorage<Property>('properties');
    const property = properties.find(p => p.id === id);
    if (!property) return null;
    
    Object.assign(property, updates);
    this.saveToStorage('properties', properties);
    return property;
  }

  async deleteProperty(id: string): Promise<boolean> {
    // Check if property has units
    const units = this.loadFromStorage<Unit>('units');
    const hasUnits = units.some(u => u.propertyId === id);
    if (hasUnits) return false;

    const properties = this.loadFromStorage<Property>('properties');
    const filtered = properties.filter(p => p.id !== id);
    this.saveToStorage('properties', filtered);
    return true;
  }

  async createUnit(
    unit: Omit<Unit, 'id' | 'createdAt'>,
    userId?: string,
    userRole?: string
  ): Promise<Unit | { requiresApproval: boolean; approvalRequestId: string; message: string }> {
    const units = this.loadFromStorage<Unit>('units');
    const newUnit: Unit = {
      ...unit,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    units.push(newUnit);
    this.saveToStorage('units', units);
    return newUnit;
  }

  async updateUnit(id: string, updates: Partial<Omit<Unit, 'id' | 'createdAt'>>): Promise<Unit | null> {
    const units = this.loadFromStorage<Unit>('units');
    const unit = units.find(u => u.id === id);
    if (!unit) return null;
    
    Object.assign(unit, updates);
    this.saveToStorage('units', units);
    return unit;
  }

  async deleteUnit(id: string): Promise<boolean> {
    // Check if unit has contracts
    const contracts = this.loadFromStorage<Contract>('contracts');
    const hasContracts = contracts.some(c => c.unitId === id);
    if (hasContracts) return false;

    const units = this.loadFromStorage<Unit>('units');
    const filtered = units.filter(u => u.id !== id);
    this.saveToStorage('units', filtered);
    return true;
  }

  async updateTenant(id: string, updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>): Promise<Tenant | null> {
    const tenants = this.loadFromStorage<Tenant>('tenants');
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return null;
    
    Object.assign(tenant, updates);
    this.saveToStorage('tenants', tenants);
    return tenant;
  }

  async deleteTenant(id: string): Promise<boolean> {
    // Check if tenant has contracts
    const contracts = this.loadFromStorage<Contract>('contracts');
    const hasContracts = contracts.some(c => c.tenantId === id);
    if (hasContracts) return false;

    const tenants = this.loadFromStorage<Tenant>('tenants');
    const filtered = tenants.filter(t => t.id !== id);
    this.saveToStorage('tenants', filtered);
    return true;
  }

  // Add other stub methods as needed...

  // Approval methods (only work with Supabase)
  async getApprovalRequests(
    _status?: ApprovalStatus,
    _userId?: string
  ): Promise<ApprovalRequestWithDetails[]> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _status, _userId };
    void _unused;
    // Approval system requires Supabase
    return [];
  }

  async approveRequest(
    _requestId: string,
    _approverId: string
  ): Promise<{ success: boolean; message?: string }> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _requestId, _approverId };
    void _unused;
    return { success: false, message: 'Approval system requires Supabase' };
  }

  async updateApprovalRequestData(
    _requestId: string,
    _updatedData: any
  ): Promise<void> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _requestId, _updatedData };
    void _unused;
  }

  async rejectRequest(
    _requestId: string,
    _approverId: string,
    _reason: string
  ): Promise<{ success: boolean; message?: string }> {
    // Parameters required for interface compatibility with supabaseService
    const _unused = { _requestId, _approverId, _reason };
    void _unused;
    return { success: false, message: 'Approval system requires Supabase' };
  }
}

// Export the appropriate service
export const dataService = useSupabase ? supabaseService : new LocalStorageService();

// Add approval methods to dataService if using Supabase
if (useSupabase) {
  // These methods are already in supabaseService, so they'll be available
  // We just need to ensure the types are correct
}
