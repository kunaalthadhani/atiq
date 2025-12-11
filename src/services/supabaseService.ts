import { supabase } from '@/lib/supabase';
import { 
  Property, Unit, Tenant, Contract, Invoice, Payment, Reminder,
  ContractWithDetails, InvoiceWithDetails, DashboardStats
} from '@/types';

// Check if Supabase is configured
if (!supabase) {
  console.error('❌ Supabase is not configured. Please set up your .env file with Supabase credentials.');
}

// Helper to convert database row to TypeScript type
const mapProperty = (row: any): Property => ({
  id: row.id,
  name: row.name,
  address: row.address,
  addressLine2: row.address_line_2,
  city: row.city,
  country: row.country,
  images: row.images || [],
  createdAt: new Date(row.created_at),
  shortCode: row.short_code,
  state: row.state,
  postalCode: row.postal_code,
  notes: row.notes,
  isActive: row.is_active ?? true,
});

const mapUnit = (row: any): Unit => ({
  id: row.id,
  propertyId: row.property_id,
  unitNumber: row.unit_number,
  type: row.type,
  floor: row.floor,
  bedrooms: row.bedrooms,
  bathrooms: row.bathrooms,
  squareFeet: row.square_feet,
  monthlyRent: parseFloat(row.monthly_rent) || 0,
  isOccupied: row.is_occupied,
  images: row.images || [],
  notes: row.notes,
  createdAt: new Date(row.created_at),
});

const mapTenant = (row: any): Tenant => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  secondaryPhone: row.secondary_phone,
  whatsappNumber: row.whatsapp_number,
  secondaryWhatsappNumber: row.secondary_whatsapp_number,
  nationalId: row.national_id,
  emergencyContact: row.emergency_contact,
  emergencyPhone: row.emergency_phone,
  createdAt: new Date(row.created_at),
  idType: row.id_type,
  idNumber: row.id_number,
  idExpiryDate: row.id_expiry_date ? new Date(row.id_expiry_date) : undefined,
  billingAddress: row.billing_address,
  paymentMethod: row.payment_method,
  notificationPreference: row.notification_preference,
  notes: row.notes,
});

const mapContract = (row: any): Contract => ({
  id: row.id,
  tenantId: row.tenant_id,
  unitId: row.unit_id,
  startDate: new Date(row.start_date),
  endDate: new Date(row.end_date),
  monthlyRent: parseFloat(row.monthly_rent) || 0,
  securityDeposit: parseFloat(row.security_deposit) || 0,
  paymentFrequency: row.payment_frequency,
  numberOfInstallments: row.number_of_installments,
  status: row.status,
  reminderPeriod: row.reminder_period,
  notes: row.notes,
  createdAt: new Date(row.created_at),
  contractNumber: row.contract_number,
  dueDateDay: row.due_date_day,
});

const mapInvoice = (row: any): Invoice => ({
  id: row.id,
  contractId: row.contract_id,
  invoiceNumber: row.invoice_number,
  installmentNumber: row.installment_number,
  dueDate: new Date(row.due_date),
  amount: parseFloat(row.amount) || 0,
  paidAmount: parseFloat(row.paid_amount) || 0,
  remainingAmount: parseFloat(row.remaining_amount) || 0,
  status: row.status,
  sentDate: row.sent_date ? new Date(row.sent_date) : undefined,
  createdAt: new Date(row.created_at),
  notes: row.notes,
  adminStatus: row.admin_status,
  paymentType: row.payment_type,
});

const mapPayment = (row: any): Payment => ({
  id: row.id,
  invoiceId: row.invoice_id,
  amount: parseFloat(row.amount) || 0,
  paymentDate: new Date(row.payment_date),
  paymentMethod: row.payment_method,
  referenceNumber: row.reference_number,
  notes: row.notes,
  createdAt: new Date(row.created_at),
});

const mapReminder = (row: any): Reminder => ({
  id: row.id,
  contractId: row.contract_id,
  invoiceId: row.invoice_id,
  reminderDate: new Date(row.reminder_date),
  message: row.message,
  isDismissed: row.is_dismissed,
  createdAt: new Date(row.created_at),
});

// Helper to convert TypeScript type to database row
const toPropertyRow = (property: Omit<Property, 'id' | 'createdAt'>) => ({
  name: property.name,
  address: property.address,
  address_line_2: property.addressLine2,
  city: property.city,
  country: property.country,
  images: property.images || [],
  short_code: property.shortCode,
  state: property.state,
  postal_code: property.postalCode,
  notes: property.notes,
  is_active: property.isActive ?? true,
});

const toUnitRow = (unit: Omit<Unit, 'id' | 'createdAt'>) => ({
  property_id: unit.propertyId,
  unit_number: unit.unitNumber,
  type: unit.type,
  floor: unit.floor,
  bedrooms: unit.bedrooms,
  bathrooms: unit.bathrooms,
  square_feet: unit.squareFeet,
  monthly_rent: unit.monthlyRent,
  is_occupied: unit.isOccupied,
  images: unit.images || [],
  notes: unit.notes,
});

const toTenantRow = (tenant: Omit<Tenant, 'id' | 'createdAt'>) => ({
  first_name: tenant.firstName,
  last_name: tenant.lastName,
  email: tenant.email,
  phone: tenant.phone,
  secondary_phone: tenant.secondaryPhone,
  whatsapp_number: tenant.whatsappNumber,
  secondary_whatsapp_number: tenant.secondaryWhatsappNumber,
  national_id: tenant.nationalId,
  emergency_contact: tenant.emergencyContact,
  emergency_phone: tenant.emergencyPhone,
  id_type: tenant.idType,
  id_number: tenant.idNumber,
  id_expiry_date: tenant.idExpiryDate?.toISOString().split('T')[0],
  billing_address: tenant.billingAddress,
  payment_method: tenant.paymentMethod,
  notification_preference: tenant.notificationPreference,
  notes: tenant.notes,
});

const toContractRow = (contract: Omit<Contract, 'id' | 'createdAt'>) => ({
  tenant_id: contract.tenantId,
  unit_id: contract.unitId,
  contract_number: contract.contractNumber,
  start_date: contract.startDate.toISOString().split('T')[0],
  end_date: contract.endDate.toISOString().split('T')[0],
  monthly_rent: contract.monthlyRent,
  security_deposit: contract.securityDeposit,
  payment_frequency: contract.paymentFrequency,
  number_of_installments: contract.numberOfInstallments,
  status: contract.status,
  reminder_period: contract.reminderPeriod,
  due_date_day: contract.dueDateDay,
  notes: contract.notes,
});

const toPaymentRow = (payment: Omit<Payment, 'id' | 'createdAt'>) => ({
  invoice_id: payment.invoiceId,
  amount: payment.amount,
  payment_date: payment.paymentDate.toISOString().split('T')[0],
  payment_method: payment.paymentMethod,
  reference_number: payment.referenceNumber,
  notes: payment.notes,
});

class SupabaseService {
  // Helper to check if Supabase is available
  private checkSupabase(): boolean {
    if (!supabase) {
      console.warn('⚠️ Supabase is not configured. Please set up your .env file.');
      return false;
    }
    return true;
  }

  // ============================================
  // PROPERTIES
  // ============================================
  async getProperties(): Promise<Property[]> {
    if (!this.checkSupabase()) return [];

    const { data, error } = await supabase!
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
    
    return data ? data.map(mapProperty) : [];
  }

  async getPropertyById(id: string): Promise<Property | null> {
    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching property:', error);
      return null;
    }
    
    return mapProperty(data);
  }

  async createProperty(property: Omit<Property, 'id' | 'createdAt'>): Promise<Property> {
    if (!this.checkSupabase()) throw new Error('Supabase is not configured');
    const { data, error } = await supabase!
      .from('properties')
      .insert(toPropertyRow(property))
      .select()
      .single();
    
    if (error) {
      console.error('Error creating property:', error);
      throw error;
    }
    
    return mapProperty(data);
  }

  async updateProperty(id: string, updates: Partial<Omit<Property, 'id' | 'createdAt'>>): Promise<Property | null> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.addressLine2 !== undefined) updateData.address_line_2 = updates.addressLine2;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.shortCode !== undefined) updateData.short_code = updates.shortCode;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.postalCode !== undefined) updateData.postal_code = updates.postalCode;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating property:', error);
      return null;
    }
    
    return mapProperty(data);
  }

  async deleteProperty(id: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    const { error } = await supabase!
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting property:', error);
      return false;
    }
    
    return true;
  }

  // ============================================
  // UNITS
  // ============================================
  async getUnits(propertyId?: string): Promise<Unit[]> {
    if (!this.checkSupabase()) return [];
    let query = supabase!
      .from('units')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching units:', error);
      return [];
    }
    
    return data.map(mapUnit);
  }

  async getUnitById(id: string): Promise<Unit | null> {
    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching unit:', error);
      return null;
    }
    
    return mapUnit(data);
  }

  async createUnit(unit: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> {
    if (!this.checkSupabase()) throw new Error('Supabase is not configured');
    const { data, error } = await supabase!
      .from('units')
      .insert(toUnitRow(unit))
      .select()
      .single();
    
    if (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
    
    return mapUnit(data);
  }

  async updateUnit(id: string, updates: Partial<Omit<Unit, 'id' | 'createdAt'>>): Promise<Unit | null> {
    const updateData: any = {};
    if (updates.propertyId !== undefined) updateData.property_id = updates.propertyId;
    if (updates.unitNumber !== undefined) updateData.unit_number = updates.unitNumber;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.floor !== undefined) updateData.floor = updates.floor;
    if (updates.bedrooms !== undefined) updateData.bedrooms = updates.bedrooms;
    if (updates.bathrooms !== undefined) updateData.bathrooms = updates.bathrooms;
    if (updates.squareFeet !== undefined) updateData.square_feet = updates.squareFeet;
    if (updates.monthlyRent !== undefined) updateData.monthly_rent = updates.monthlyRent;
    if (updates.isOccupied !== undefined) updateData.is_occupied = updates.isOccupied;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('units')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating unit:', error);
      return null;
    }
    
    return mapUnit(data);
  }

  async deleteUnit(id: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    const { error } = await supabase!
      .from('units')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting unit:', error);
      return false;
    }
    
    return true;
  }

  // ============================================
  // TENANTS
  // ============================================
  async getTenants(range: { from: number; to: number } = { from: 0, to: 199 }): Promise<Tenant[]> {
    if (!this.checkSupabase()) return [];
    const { data, error } = await supabase!
      .from('tenants')
      .select(`
        id, first_name, last_name, email, phone, secondary_phone, whatsapp_number, secondary_whatsapp_number,
        national_id, emergency_contact, emergency_phone, created_at,
        id_type, id_number, id_expiry_date, billing_address, payment_method, notification_preference, notes
      `)
      .order('created_at', { ascending: false })
      .range(range.from, range.to);
    
    if (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
    
    return data.map(mapTenant);
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching tenant:', error);
      return null;
    }
    
    return mapTenant(data);
  }

  async createTenant(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
    if (!this.checkSupabase()) throw new Error('Supabase is not configured');
    const { data, error } = await supabase!
      .from('tenants')
      .insert(toTenantRow(tenant))
      .select()
      .single();
    
    if (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
    
    return mapTenant(data);
  }

  async updateTenant(id: string, updates: Partial<Omit<Tenant, 'id' | 'createdAt'>>): Promise<Tenant | null> {
    const updateData: any = {};
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.secondaryPhone !== undefined) updateData.secondary_phone = updates.secondaryPhone;
    if (updates.whatsappNumber !== undefined) updateData.whatsapp_number = updates.whatsappNumber;
    if (updates.secondaryWhatsappNumber !== undefined) updateData.secondary_whatsapp_number = updates.secondaryWhatsappNumber;
    if (updates.nationalId !== undefined) updateData.national_id = updates.nationalId;
    if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;
    if (updates.emergencyPhone !== undefined) updateData.emergency_phone = updates.emergencyPhone;
    if (updates.idType !== undefined) updateData.id_type = updates.idType;
    if (updates.idNumber !== undefined) updateData.id_number = updates.idNumber;
    if (updates.idExpiryDate !== undefined) updateData.id_expiry_date = updates.idExpiryDate?.toISOString().split('T')[0];
    if (updates.billingAddress !== undefined) updateData.billing_address = updates.billingAddress;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.notificationPreference !== undefined) updateData.notification_preference = updates.notificationPreference;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (!this.checkSupabase()) return null;
    const { data, error } = await supabase!
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating tenant:', error);
      return null;
    }
    
    return mapTenant(data);
  }

  async deleteTenant(id: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    // Check if tenant has contracts
    const { data: contracts } = await supabase!
      .from('contracts')
      .select('id')
      .eq('tenant_id', id)
      .limit(1);
    
    if (contracts && contracts.length > 0) {
      return false; // Cannot delete tenant with contracts
    }
    
    const { error } = await supabase!
      .from('tenants')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting tenant:', error);
      return false;
    }
    
    return true;
  }

  // ============================================
  // CONTRACTS
  // ============================================
  async getContracts(range: { from: number; to: number } = { from: 0, to: 199 }): Promise<ContractWithDetails[]> {
    if (!this.checkSupabase()) return [];
    const { data, error } = await supabase!
      .from('contracts')
      .select(`
        *,
        tenant:tenants(
          id, first_name, last_name, email, phone, secondary_phone, whatsapp_number, secondary_whatsapp_number,
          payment_method, notification_preference, national_id, id_type, id_number, id_expiry_date, billing_address
        ),
        unit:units(
          id, property_id, unit_number, type, floor, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, images, notes, created_at,
          property:properties(
            id, name, address, address_line_2, city, country, state, postal_code, short_code, notes, is_active, created_at
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(range.from, range.to);
    
    if (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
    
    return data
      .map((row: any) => {
        const contract = mapContract(row);
        const tenant = mapTenant(row.tenant);
        const unit = mapUnit(row.unit);
        const property = mapProperty(row.unit.property);
        
        return {
          ...contract,
          tenant,
          unit,
          property,
        } as ContractWithDetails;
      })
      .filter((c: ContractWithDetails) => c.tenant && c.unit && c.property);
  }

  async createContract(contract: Omit<Contract, 'id' | 'createdAt'>): Promise<{ success: boolean; message?: string; contract?: Contract }> {
    if (!this.checkSupabase()) throw new Error('Supabase is not configured');
    // Validate overlapping contracts for active status
    if (contract.status === 'active') {
      const { data: overlapping } = await supabase!
        .from('contracts')
        .select('id')
        .eq('unit_id', contract.unitId)
        .eq('status', 'active')
        .or(`and(start_date.lte.${contract.endDate.toISOString().split('T')[0]},end_date.gte.${contract.startDate.toISOString().split('T')[0]})`);
      
      if (overlapping && overlapping.length > 0) {
        return { success: false, message: 'This unit already has an active contract for the selected dates.' };
      }

      // Check if tenant has active contract
      const { data: tenantContracts } = await supabase!
        .from('contracts')
        .select('id')
        .eq('tenant_id', contract.tenantId)
        .eq('status', 'active')
        .limit(1);
      
      if (tenantContracts && tenantContracts.length > 0) {
        return { success: false, message: 'This tenant already has an active contract.' };
      }
    }

    const { data, error } = await supabase!
      .from('contracts')
      .insert(toContractRow(contract))
      .select()
      .single();
    
    if (error) {
      console.error('Error creating contract:', error);
      return { success: false, message: error.message };
    }
    
    const newContract = mapContract(data);
    
    // Generate invoices if contract is active
    if (contract.status === 'active') {
      await this.generateInvoicesForContract(newContract);
    }
    
    return { success: true, contract: newContract };
  }

  async terminateContract(id: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    // Update contract status to terminated
    const { error: contractError } = await supabase!
      .from('contracts')
      .update({ status: 'terminated' })
      .eq('id', id);
    
    if (contractError) {
      console.error('Error terminating contract:', contractError);
      return false;
    }

    // Get contract to find unit
    const { data: contractData } = await supabase!
      .from('contracts')
      .select('unit_id')
      .eq('id', id)
      .single();

    if (contractData) {
      // Mark unit as vacant
      await supabase!
        .from('units')
        .update({ is_occupied: false })
        .eq('id', contractData.unit_id);

      // Cancel unpaid invoices
      await supabase!
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('contract_id', id)
        .in('status', ['pending', 'partial', 'overdue']);
    }

    return true;
  }

  private async generateInvoicesForContract(contract: Contract) {
    // This will be handled by database triggers or can be done here
    // For now, we'll create invoices manually
    const { addMonths } = await import('date-fns');
    
    let intervalMonths = 1;
    if (contract.paymentFrequency === 'quarterly') intervalMonths = 3;
    else if (contract.paymentFrequency === 'semi-annual') intervalMonths = 6;
    else if (contract.paymentFrequency === 'annual') intervalMonths = 12;

    const amountPerInstallment = contract.monthlyRent * intervalMonths;
    const invoices = [];

    for (let i = 0; i < contract.numberOfInstallments; i++) {
      const dueDate = addMonths(contract.startDate, i * intervalMonths);
      if (contract.dueDateDay) {
        dueDate.setDate(contract.dueDateDay);
      }
      
      const invoiceNumber = `INV-${contract.id.slice(-4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
      
      invoices.push({
        contract_id: contract.id,
        invoice_number: invoiceNumber,
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount: amountPerInstallment,
        paid_amount: 0,
        remaining_amount: amountPerInstallment,
        status: 'pending',
      });
    }

    if (invoices.length > 0) {
      if (!this.checkSupabase()) return;
      const { error } = await supabase!
        .from('invoices')
        .insert(invoices);
      
      if (error) {
        console.error('Error generating invoices:', error);
      }
    }
  }

  // ============================================
  // INVOICES
  // ============================================
  async getInvoices(range: { from: number; to: number } = { from: 0, to: 199 }): Promise<InvoiceWithDetails[]> {
    if (!this.checkSupabase()) return [];
    const { data, error } = await supabase!
      .from('invoices')
      .select(`
        *,
        contract:contracts!inner(
          *,
          tenant:tenants(
            id, first_name, last_name, email, phone, secondary_phone, whatsapp_number, secondary_whatsapp_number,
            payment_method, notification_preference, national_id, id_type, id_number, id_expiry_date
          ),
          unit:units(
            id, property_id, unit_number, type, floor, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, images, notes, created_at,
            property:properties(
              id, name, address, address_line_2, city, country, state, postal_code, short_code, notes, is_active, created_at
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(range.from, range.to);
    
    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
    
    // Get payments for each invoice
    const invoiceIds = data.map((inv: any) => inv.id);
    const { data: paymentsData } = await supabase!
      .from('payments')
      .select('id, invoice_id, amount, payment_date, payment_method, reference_number, notes, created_at')
      .in('invoice_id', invoiceIds);
    
    const paymentsMap = new Map<string, Payment[]>();
    if (paymentsData) {
      paymentsData.forEach((p: any) => {
        if (!paymentsMap.has(p.invoice_id)) {
          paymentsMap.set(p.invoice_id, []);
        }
        paymentsMap.get(p.invoice_id)!.push(mapPayment(p));
      });
    }
    
    return data
      .map((row: any) => {
        if (!row.contract || !row.contract.tenant || !row.contract.unit || !row.contract.unit.property) {
          return null;
        }
        
        const invoice = mapInvoice(row);
        const contract = mapContract(row.contract);
        const tenant = mapTenant(row.contract.tenant);
        const unit = mapUnit(row.contract.unit);
        const property = mapProperty(row.contract.unit.property);
        const payments = paymentsMap.get(invoice.id) || [];
        
        return {
          ...invoice,
          contract,
          tenant,
          unit,
          property,
          payments,
        } as InvoiceWithDetails;
      })
      .filter((inv: InvoiceWithDetails | null) => inv !== null) as InvoiceWithDetails[];
  }

  async getInvoicesByDateRange(startDate: Date, endDate: Date, range: { from: number; to: number } = { from: 0, to: 199 }): Promise<InvoiceWithDetails[]> {
    if (!this.checkSupabase()) return [];
    const { data, error } = await supabase!
      .from('invoices')
      .select(`
        *,
        contract:contracts!inner(
          *,
          tenant:tenants(
            id, first_name, last_name, email, phone, secondary_phone, whatsapp_number, secondary_whatsapp_number,
            payment_method, notification_preference, national_id, id_type, id_number, id_expiry_date
          ),
          unit:units(
            id, property_id, unit_number, type, floor, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, images, notes, created_at,
            property:properties(
              id, name, address, address_line_2, city, country, state, postal_code, short_code, notes, is_active, created_at
            )
          )
        )
      `)
      .gte('due_date', startDate.toISOString().split('T')[0])
      .lte('due_date', endDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .range(range.from, range.to);
    
    if (error) {
      console.error('Error fetching invoices by date range:', error);
      return [];
    }
    
    // Get payments for each invoice
    const invoiceIds = data.map((inv: any) => inv.id);
    const { data: paymentsData } = await supabase!
      .from('payments')
      .select('id, invoice_id, amount, payment_date, payment_method, reference_number, notes, created_at')
      .in('invoice_id', invoiceIds);
    
    const paymentsMap = new Map<string, Payment[]>();
    if (paymentsData) {
      paymentsData.forEach((p: any) => {
        if (!paymentsMap.has(p.invoice_id)) {
          paymentsMap.set(p.invoice_id, []);
        }
        paymentsMap.get(p.invoice_id)!.push(mapPayment(p));
      });
    }
    
    return data
      .map((row: any) => {
        if (!row.contract || !row.contract.tenant || !row.contract.unit || !row.contract.unit.property) {
          return null;
        }
        
        const invoice = mapInvoice(row);
        const contract = mapContract(row.contract);
        const tenant = mapTenant(row.contract.tenant);
        const unit = mapUnit(row.contract.unit);
        const property = mapProperty(row.contract.unit.property);
        const payments = paymentsMap.get(invoice.id) || [];
        
        return {
          ...invoice,
          contract,
          tenant,
          unit,
          property,
          payments,
        } as InvoiceWithDetails;
      })
      .filter((inv: InvoiceWithDetails | null) => inv !== null) as InvoiceWithDetails[];
  }

  async updateInvoice(id: string, updates: Partial<Omit<Invoice, 'id' | 'createdAt' | 'contractId' | 'invoiceNumber' | 'installmentNumber' | 'dueDate' | 'amount'>>): Promise<Invoice | null> {
    if (!this.checkSupabase()) return null;
    const updateData: any = {};
    if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
    if (updates.remainingAmount !== undefined) updateData.remaining_amount = updates.remainingAmount;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.adminStatus !== undefined) updateData.admin_status = updates.adminStatus;
    if (updates.paymentType !== undefined) updateData.payment_type = updates.paymentType;
    if (updates.sentDate !== undefined) updateData.sent_date = updates.sentDate?.toISOString().split('T')[0];
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase!
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating invoice:', error);
      return null;
    }
    
    return mapInvoice(data);
  }

  // ============================================
  // PAYMENTS
  // ============================================
  async getPayments(invoiceId?: string, range: { from: number; to: number } = { from: 0, to: 199 }): Promise<Payment[]> {
    if (!this.checkSupabase()) return [];
    let query = supabase!
      .from('payments')
      .select('id, invoice_id, amount, payment_date, payment_method, reference_number, notes, created_at')
      .order('payment_date', { ascending: false })
      .range(range.from, range.to);
    
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching payments:', error);
      return [];
    }
    
    return data.map(mapPayment);
  }

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    if (!this.checkSupabase()) throw new Error('Supabase is not configured');
    const { data, error } = await supabase!
      .from('payments')
      .insert(toPaymentRow(payment))
      .select()
      .single();
    
    if (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
    
    // Update invoice amounts and status
    const { data: invoiceData } = await supabase!
      .from('invoices')
      .select('paid_amount, remaining_amount, amount')
      .eq('id', payment.invoiceId)
      .single();

    if (invoiceData) {
      const newPaidAmount = (invoiceData.paid_amount || 0) + payment.amount;
      const newRemainingAmount = invoiceData.amount - newPaidAmount;
      
      let newStatus = 'pending';
      if (newRemainingAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      await supabase!
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: newStatus,
        })
        .eq('id', payment.invoiceId);
    }
    
    return mapPayment(data);
  }

  async deletePayment(paymentId: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    const { error } = await supabase!
      .from('payments')
      .delete()
      .eq('id', paymentId);
    
    if (error) {
      console.error('Error deleting payment:', error);
      return false;
    }
    
    // The database trigger will update the invoice automatically
    return true;
  }

  // ============================================
  // REMINDERS
  // ============================================
  async getReminders(): Promise<Reminder[]> {
    if (!this.checkSupabase()) return [];
    const { data, error } = await supabase!
      .from('reminders')
      .select('*')
      .eq('is_dismissed', false)
      .order('reminder_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching reminders:', error);
      return [];
    }
    
    return data.map(mapReminder);
  }

  async getActiveReminders(): Promise<Reminder[]> {
    const reminders = await this.getReminders();
    const now = new Date();
    return reminders.filter(r => {
      if (!r.reminderDate) return false;
      return new Date(r.reminderDate) <= now;
    });
  }

  async dismissReminder(id: string): Promise<boolean> {
    if (!this.checkSupabase()) return false;
    const { error } = await supabase!
      .from('reminders')
      .update({ is_dismissed: true })
      .eq('id', id);
    
    if (error) {
      console.error('Error dismissing reminder:', error);
      return false;
    }
    
    return true;
  }

  // ============================================
  // DASHBOARD STATS
  // ============================================
  async getDashboardStats(): Promise<DashboardStats> {
    // Get all data in parallel
    const [properties, units, tenants, contracts, invoices] = await Promise.all([
      this.getProperties(),
      this.getUnits(),
      this.getTenants(),
      this.getContracts(),
      this.getInvoices(),
    ]);

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

  // ============================================
  // SEARCH METHODS (client-side filtering)
  // ============================================
  async searchProperties(query: string): Promise<Property[]> {
    const properties = await this.getProperties();
    const lowerQuery = query.toLowerCase();
    return properties.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.address.toLowerCase().includes(lowerQuery) ||
      p.city.toLowerCase().includes(lowerQuery) ||
      p.shortCode?.toLowerCase().includes(lowerQuery)
    );
  }

  async searchUnits(query: string): Promise<Unit[]> {
    const units = await this.getUnits();
    const lowerQuery = query.toLowerCase();
    return units.filter(u => 
      u.unitNumber.toLowerCase().includes(lowerQuery) ||
      u.type.toLowerCase().includes(lowerQuery)
    );
  }

  async searchTenants(query: string): Promise<Tenant[]> {
    const tenants = await this.getTenants();
    const lowerQuery = query.toLowerCase();
    return tenants.filter(t => 
      t.firstName.toLowerCase().includes(lowerQuery) ||
      t.lastName.toLowerCase().includes(lowerQuery) ||
      t.email.toLowerCase().includes(lowerQuery) ||
      t.phone.includes(query) ||
      t.whatsappNumber?.includes(query) ||
      t.nationalId.toLowerCase().includes(lowerQuery) ||
      t.idNumber?.toLowerCase().includes(lowerQuery) ||
      t.emergencyContact?.toLowerCase().includes(lowerQuery) ||
      t.emergencyPhone?.includes(query) ||
      t.billingAddress?.toLowerCase().includes(lowerQuery)
    );
  }

  async searchContracts(query: string): Promise<ContractWithDetails[]> {
    const contracts = await this.getContracts();
    const lowerQuery = query.toLowerCase();
    return contracts.filter(c => {
      const tenant = c.tenant;
      const property = c.property;
      const unit = c.unit;
      
      return (
        `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(lowerQuery) ||
        property.name.toLowerCase().includes(lowerQuery) ||
        unit.unitNumber.toLowerCase().includes(lowerQuery) ||
        c.contractNumber?.toLowerCase().includes(lowerQuery) ||
        tenant.email.toLowerCase().includes(lowerQuery) ||
        tenant.phone.includes(query) ||
        tenant.whatsappNumber?.includes(query) ||
        tenant.nationalId.toLowerCase().includes(lowerQuery)
      );
    });
  }

  async searchInvoices(query: string): Promise<InvoiceWithDetails[]> {
    const invoices = await this.getInvoices();
    const lowerQuery = query.toLowerCase();
    return invoices.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(lowerQuery) ||
      `${inv.tenant.firstName} ${inv.tenant.lastName}`.toLowerCase().includes(lowerQuery) ||
      inv.unit.unitNumber.toLowerCase().includes(lowerQuery) ||
      inv.property.name.toLowerCase().includes(lowerQuery) ||
      inv.tenant.email.toLowerCase().includes(lowerQuery) ||
      inv.tenant.phone.includes(query) ||
      inv.tenant.whatsappNumber?.includes(query)
    );
  }

  async searchPayments(query: string): Promise<Payment[]> {
    const payments = await this.getPayments();
    const lowerQuery = query.toLowerCase();
    // Note: This is a simplified search. For better results, we'd need to join with invoices/tenants
    return payments.filter(p => 
      p.referenceNumber?.toLowerCase().includes(lowerQuery) ||
      p.paymentMethod.toLowerCase().includes(lowerQuery)
    );
  }
}

export const supabaseService = new SupabaseService();

