import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  properties: (role?: string, userId?: string) => ['properties', role, userId] as const,
  units: (propertyId?: string, role?: string, userId?: string) => ['units', propertyId, role, userId] as const,
  tenants: (role?: string, userId?: string) => ['tenants', role, userId] as const,
  contracts: () => ['contracts'] as const,
  invoices: () => ['invoices'] as const,
  invoicesByDateRange: (start: string, end: string) => ['invoices', 'dateRange', start, end] as const,
  payments: (invoiceId?: string) => ['payments', invoiceId] as const,
  approvalRequests: (status?: string, userId?: string) => ['approvalRequests', status, userId] as const,
  reminders: () => ['reminders'] as const,
};
