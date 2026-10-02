export type UserRole = 'owner' | 'partner' | 'accountant' | 'project_manager' | 'employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  partnerId?: string; // If this user is tied to a partner
  assignedProjectIds?: string[];
}

export interface CompanySettings {
  companyName: string;
  companyNameAr: string;
  taxNumber: string;
  commercialRegister: string;
  phone: string;
  email: string;
  address: string;
  addressAr?: string;
  currency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  fiscalYear: string;
  defaultLanguage: 'en' | 'ar';
  defaultTheme: 'dark' | 'light';
  logoUrl?: string;
  overheadAllocationRate?: number; // e.g. 5% company overhead applied to projects
  updatedAt?: string;
}

export interface Partner {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  ownershipPercentage: number; // Equity % (e.g. 40%)
  profitSharePercentage: number; // Profit distribution % (can differ, e.g. 50%)
  lossSharePercentage: number;
  capitalContribution: number;
  currentBalance: number;
  totalWithdrawals: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PartnerTransactionType = 
  | 'capital_contribution' 
  | 'withdrawal' 
  | 'expense_paid_on_behalf' 
  | 'money_received' 
  | 'profit_distribution' 
  | 'other';

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName: string;
  type: PartnerTransactionType;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank';
  cashboxOrBankId?: string;
  description: string;
  reference?: string;
  createdAt: string;
}

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  clientId: string;
  clientName: string;
  contractValue: number;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  projectManager: string;
  status: ProjectStatus;
  progress: number; // 0 - 100
  expectedCost: number;
  actualCost: number;
  totalInvoiced: number;
  totalCollected: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  contractValue: number;
  retentionPercentage: number;
  retentionAmount: number;
  startDate: string;
  endDate: string;
  paymentTerms?: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Terminated';
  notes?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  currentBalance: number; // Positive = Customer owes us
  totalInvoiced: number;
  totalPaid: number;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  currentBalance: number; // Positive = We owe supplier
  totalPurchases: number;
  totalPaid: number;
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
}

export interface PurchaseItem {
  id: string;
  description: string;
  materialId?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export type PurchaseCategory = 'Materials' | 'Equipment' | 'Tools' | 'Services' | 'Other';

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  projectId?: string;
  projectName?: string;
  date: string;
  category: PurchaseCategory;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod: 'cash' | 'bank' | 'credit';
  sourceId?: string; // bank account or cashbox
  createdAt: string;
}

export type ExpenseType = 'project' | 'company';

export type ExpenseCategory = 
  | 'Materials' 
  | 'Labor' 
  | 'Transportation' 
  | 'Equipment' 
  | 'Rent' 
  | 'Utilities' 
  | 'Maintenance' 
  | 'Office' 
  | 'Government Fees' 
  | 'Marketing' 
  | 'Other';

export interface Expense {
  id: string;
  expenseType: ExpenseType;
  category: ExpenseCategory;
  amount: number;
  date: string;
  projectId?: string;
  projectName?: string;
  paymentMethod: 'cash' | 'bank';
  sourceId?: string; // bank account or cashbox
  description: string;
  receiptNumber?: string;
  createdBy: string;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  type: 'in' | 'out' | 'transfer';
  amount: number;
  date: string;
  description: string;
  reference?: string;
  category?: string;
  user: string;
  balanceAfter: number;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  bankId: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  date: string;
  description: string;
  reference?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minimumQuantity: number;
  averageCost: number;
  lastPurchasePrice: number;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  materialId: string;
  materialName: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  unitCost: number;
  totalCost: number;
  projectId?: string;
  projectName?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  phone: string;
  specialty: string;
  totalContracts: number;
  totalPaid: number;
  currentBalance: number;
  createdAt: string;
}

export interface SubcontractorContract {
  id: string;
  subcontractorId: string;
  subcontractorName: string;
  projectId: string;
  projectName: string;
  contractValue: number;
  paid: number;
  remaining: number;
  progress: number;
  startDate: string;
  endDate: string;
  notes?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  phone: string;
  type: 'monthly' | 'daily';
  rate: number;
  assignedProjectId?: string;
  assignedProjectName?: string;
  status: 'active' | 'inactive';
  totalPaid: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  remaining: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Overdue';
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface FinancialSummary {
  totalContractValue: number;
  totalRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  projectGrossProfit: number;
  netProfit: number;
  expectedProfit: number;
  cashBalance: number;
  bankBalance: number;
  customerReceivables: number;
  supplierPayables: number;
  activeProjects: number;
  completedProjects: number;
}
