// Utility to clear all localStorage data
export function clearLocalStorage() {
  localStorage.removeItem('properties');
  localStorage.removeItem('units');
  localStorage.removeItem('tenants');
  localStorage.removeItem('contracts');
  localStorage.removeItem('invoices');
  localStorage.removeItem('payments');
  localStorage.removeItem('reminders');
  console.log('All localStorage data cleared!');
}



