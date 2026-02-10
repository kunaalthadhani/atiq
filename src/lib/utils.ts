import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `AED ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    pending: 'bg-warning-100 text-warning-700',
    paid: 'bg-success-100 text-success-700',
    partial: 'bg-primary-100 text-primary-700',
    overdue: 'bg-danger-100 text-danger-700',
    expired: 'bg-gray-100 text-gray-700',
    terminated: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-gray-100 text-gray-700',
    draft: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}

export function generateWhatsAppLink(phone: string, message: string): string {
  // Remove all non-numeric characters except +
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  
  // If phone doesn't start with +, assume UAE country code (971)
  if (!cleanPhone.startsWith('+')) {
    // Remove leading zeros if any
    cleanPhone = cleanPhone.replace(/^0+/, '');
    // Add UAE country code if not present
    if (!cleanPhone.startsWith('971')) {
      cleanPhone = '971' + cleanPhone;
    }
    cleanPhone = '+' + cleanPhone;
  }
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodedMessage}`;
}

export function generateEmailLink(email: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}

