import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import type {
  CompanySettings,
  Partner,
  PartnerTransaction,
  Project,
  Contract,
  Client,
  Supplier,
  Purchase,
  Expense,
  CashTransaction,
  BankAccount,
  BankTransaction,
  Material,
  InventoryTransaction,
  Subcontractor,
  SubcontractorContract,
  Employee,
  Invoice,
  AuditLog,
  AppNotification,
  FinancialSummary
} from '../types/index.ts';

// Default initial settings
export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: 'Al-Rowad Contracting & Construction',
  companyNameAr: 'شركة الرواد للمقاولات العامة والإنشاءات',
  taxNumber: '482-913-720',
  commercialRegister: '109283-Cairo',
  phone: '+20 2 2456 7890',
  email: 'contact@alrowad-construction.eg',
  address: 'Building 14, Sector 1, Fifth Settlement, New Cairo, Egypt',
  addressAr: 'مبنى ١٤، الحي الأول، التجمع الخامس، القاهرة الجديدة، مصر',
  currency: 'EGP',
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1001,
  fiscalYear: '2026',
  defaultLanguage: 'ar',
  defaultTheme: 'dark',
  overheadAllocationRate: 5
};

// In-memory fallback cache in case offline or initial load
const memoryStore: Record<string, any[]> = {};
let cachedSettings: CompanySettings | null = null;

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// ==========================================
// AUDIT LOGGING
// ==========================================
export async function logAudit(user: string, action: string, entity: string, entityId: string, details: string) {
  const log: AuditLog = {
    id: generateId(),
    user: user || 'System User',
    action,
    entity,
    entityId,
    details,
    timestamp: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'audit_logs', log.id), log);
  } catch (e) {
    console.warn('Audit log write error, caching locally:', e);
    if (!memoryStore['audit_logs']) memoryStore['audit_logs'] = [];
    memoryStore['audit_logs'].unshift(log);
  }
}

// ==========================================
// COMPANY SETTINGS
// ==========================================
export async function getCompanySettings(): Promise<CompanySettings> {
  try {
    const docRef = doc(db, 'settings', 'company');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedSettings = snap.data() as CompanySettings;
      return cachedSettings;
    }
    // Initialize if absent
    await setDoc(docRef, DEFAULT_SETTINGS);
    cachedSettings = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.warn('Using default settings fallback:', error);
    return cachedSettings || DEFAULT_SETTINGS;
  }
}

export async function updateCompanySettings(settings: Partial<CompanySettings>, user = 'Admin'): Promise<CompanySettings> {
  const current = await getCompanySettings();
  const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
  try {
    await setDoc(doc(db, 'settings', 'company'), updated);
    cachedSettings = updated;
    await logAudit(user, 'UPDATE_SETTINGS', 'Settings', 'company', 'Updated company profile & financial settings');
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/company');
  }
}

// ==========================================
// PARTNERS
// ==========================================
export async function getPartners(): Promise<Partner[]> {
  try {
    const snap = await getDocs(collection(db, 'partners'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
    memoryStore['partners'] = list;
    return list;
  } catch (error) {
    console.warn('Fallback to local partner cache:', error);
    return memoryStore['partners'] || [];
  }
}

export async function createPartner(partner: Omit<Partner, 'id' | 'createdAt'>, user = 'Admin'): Promise<Partner> {
  const id = generateId();
  const newPartner: Partner = {
    ...partner,
    id,
    currentBalance: partner.capitalContribution || 0,
    totalWithdrawals: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'partners', id), newPartner);
    await logAudit(user, 'CREATE_PARTNER', 'Partner', id, `Added partner ${partner.name} with ${partner.ownershipPercentage}% equity`);
    return newPartner;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `partners/${id}`);
  }
}

export async function updatePartner(id: string, updates: Partial<Partner>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'partners', id), { ...updates, updatedAt: new Date().toISOString() });
    await logAudit(user, 'UPDATE_PARTNER', 'Partner', id, `Updated partner details: ${JSON.stringify(updates)}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `partners/${id}`);
  }
}

export async function deletePartner(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'partners', id));
    await logAudit(user, 'DELETE_PARTNER', 'Partner', id, `Deleted partner ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `partners/${id}`);
  }
}

// ==========================================
// PARTNER TRANSACTIONS & LEDGER
// ==========================================
export async function getPartnerTransactions(partnerId?: string): Promise<PartnerTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'partner_transactions'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PartnerTransaction));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (partnerId) {
      list = list.filter(t => t.partnerId === partnerId);
    }
    return list;
  } catch (error) {
    console.warn('Using local partner transactions cache:', error);
    const list = (memoryStore['partner_transactions'] || []) as PartnerTransaction[];
    return partnerId ? list.filter(t => t.partnerId === partnerId) : list;
  }
}

export async function createPartnerTransaction(
  trans: Omit<PartnerTransaction, 'id' | 'createdAt'>, 
  user = 'Admin'
): Promise<PartnerTransaction> {
  const id = generateId();
  const record: PartnerTransaction = {
    ...trans,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'partner_transactions', id), record);

    // Update Partner Balance
    const partnerSnap = await getDoc(doc(db, 'partners', trans.partnerId));
    if (partnerSnap.exists()) {
      const p = partnerSnap.data() as Partner;
      let newBalance = p.currentBalance || 0;
      let newWithdrawals = p.totalWithdrawals || 0;

      if (trans.type === 'capital_contribution' || trans.type === 'expense_paid_on_behalf' || trans.type === 'profit_distribution') {
        newBalance += trans.amount;
      } else if (trans.type === 'withdrawal' || trans.type === 'money_received') {
        newBalance -= trans.amount;
        newWithdrawals += trans.amount;
      }
      await updateDoc(doc(db, 'partners', trans.partnerId), {
        currentBalance: newBalance,
        totalWithdrawals: newWithdrawals,
        updatedAt: new Date().toISOString()
      });
    }

    // Update Cashbox or Bank
    if (trans.paymentMethod === 'cash') {
      const isCashIn = trans.type === 'capital_contribution';
      await recordCashTransactionInternal({
        type: isCashIn ? 'in' : 'out',
        amount: trans.amount,
        date: trans.date,
        description: `Partner ${trans.partnerName}: ${trans.description || trans.type}`,
        reference: `PTR-${id.substring(0, 6)}`,
        category: 'Partner Transaction',
        user
      });
    } else if (trans.paymentMethod === 'bank' && trans.cashboxOrBankId) {
      const isDeposit = trans.type === 'capital_contribution';
      await recordBankTransactionInternal({
        bankId: trans.cashboxOrBankId,
        type: isDeposit ? 'deposit' : 'withdrawal',
        amount: trans.amount,
        date: trans.date,
        description: `Partner ${trans.partnerName}: ${trans.description || trans.type}`,
        reference: `PTR-${id.substring(0, 6)}`
      });
    }

    await logAudit(user, 'RECORD_PARTNER_TRANSACTION', 'PartnerTransaction', id, `${trans.type} of ${trans.amount} for partner ${trans.partnerName}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `partner_transactions/${id}`);
  }
}

// ==========================================
// PROJECTS
// ==========================================
export async function getProjects(): Promise<Project[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
    memoryStore['projects'] = list;
    return list;
  } catch (error) {
    return memoryStore['projects'] || [];
  }
}

export async function createProject(project: Omit<Project, 'id' | 'createdAt'>, user = 'Admin'): Promise<Project> {
  const id = generateId();
  const newProj: Project = {
    ...project,
    id,
    actualCost: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'projects', id), newProj);
    await logAudit(user, 'CREATE_PROJECT', 'Project', id, `Created project [${project.code}] ${project.name}`);
    return newProj;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `projects/${id}`);
  }
}

export async function updateProject(id: string, updates: Partial<Project>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'projects', id), { ...updates, updatedAt: new Date().toISOString() });
    await logAudit(user, 'UPDATE_PROJECT', 'Project', id, `Updated project ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
  }
}

export async function deleteProject(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'projects', id));
    await logAudit(user, 'DELETE_PROJECT', 'Project', id, `Deleted project ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `projects/${id}`);
  }
}

// ==========================================
// CONTRACTS
// ==========================================
export async function getContracts(): Promise<Contract[]> {
  try {
    const snap = await getDocs(collection(db, 'contracts'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Contract));
  } catch (error) {
    return memoryStore['contracts'] || [];
  }
}

export async function createContract(contract: Omit<Contract, 'id' | 'createdAt'>, user = 'Admin'): Promise<Contract> {
  const id = generateId();
  const record: Contract = {
    ...contract,
    id,
    retentionAmount: (contract.contractValue * (contract.retentionPercentage || 0)) / 100,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'contracts', id), record);
    await logAudit(user, 'CREATE_CONTRACT', 'Contract', id, `Contract ${contract.contractNumber} created for project ${contract.projectName}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `contracts/${id}`);
  }
}

export async function updateContract(id: string, updates: Partial<Contract>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'contracts', id), updates);
    await logAudit(user, 'UPDATE_CONTRACT', 'Contract', id, `Updated contract ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `contracts/${id}`);
  }
}

export async function deleteContract(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'contracts', id));
    await logAudit(user, 'DELETE_CONTRACT', 'Contract', id, `Deleted contract ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `contracts/${id}`);
  }
}

// ==========================================
// CLIENTS
// ==========================================
export async function getClients(): Promise<Client[]> {
  try {
    const snap = await getDocs(collection(db, 'clients'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
  } catch (error) {
    return memoryStore['clients'] || [];
  }
}

export async function createClient(client: Omit<Client, 'id' | 'createdAt'>, user = 'Admin'): Promise<Client> {
  const id = generateId();
  const record: Client = {
    ...client,
    id,
    currentBalance: 0,
    totalInvoiced: 0,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'clients', id), record);
    await logAudit(user, 'CREATE_CLIENT', 'Client', id, `Created client ${client.name}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `clients/${id}`);
  }
}

export async function updateClient(id: string, updates: Partial<Client>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'clients', id), updates);
    await logAudit(user, 'UPDATE_CLIENT', 'Client', id, `Updated client ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
  }
}

export async function deleteClient(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'clients', id));
    await logAudit(user, 'DELETE_CLIENT', 'Client', id, `Deleted client ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
  }
}

// ==========================================
// SUPPLIERS
// ==========================================
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const snap = await getDocs(collection(db, 'suppliers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
  } catch (error) {
    return memoryStore['suppliers'] || [];
  }
}

export async function createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>, user = 'Admin'): Promise<Supplier> {
  const id = generateId();
  const record: Supplier = {
    ...supplier,
    id,
    currentBalance: 0,
    totalPurchases: 0,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'suppliers', id), record);
    await logAudit(user, 'CREATE_SUPPLIER', 'Supplier', id, `Created supplier ${supplier.name}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `suppliers/${id}`);
  }
}

export async function updateSupplier(id: string, updates: Partial<Supplier>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'suppliers', id), updates);
    await logAudit(user, 'UPDATE_SUPPLIER', 'Supplier', id, `Updated supplier ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `suppliers/${id}`);
  }
}

export async function deleteSupplier(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'suppliers', id));
    await logAudit(user, 'DELETE_SUPPLIER', 'Supplier', id, `Deleted supplier ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`);
  }
}

// ==========================================
// PURCHASES & PROCUREMENT
// ==========================================
export async function getPurchases(projectId?: string): Promise<Purchase[]> {
  try {
    const snap = await getDocs(collection(db, 'purchases'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (projectId) list = list.filter(p => p.projectId === projectId);
    return list;
  } catch (error) {
    const list = (memoryStore['purchases'] || []) as Purchase[];
    return projectId ? list.filter(p => p.projectId === projectId) : list;
  }
}

export async function createPurchase(purchase: Omit<Purchase, 'id' | 'createdAt'>, user = 'Admin'): Promise<Purchase> {
  const id = generateId();
  const record: Purchase = {
    ...purchase,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'purchases', id), record);

    // 1. Update Supplier Balance
    const supplierSnap = await getDoc(doc(db, 'suppliers', purchase.supplierId));
    if (supplierSnap.exists()) {
      const s = supplierSnap.data() as Supplier;
      await updateDoc(doc(db, 'suppliers', purchase.supplierId), {
        totalPurchases: (s.totalPurchases || 0) + purchase.total,
        totalPaid: (s.totalPaid || 0) + purchase.paid,
        currentBalance: (s.currentBalance || 0) + purchase.remaining
      });
    }

    // 2. Update Project Cost if linked
    if (purchase.projectId) {
      const projSnap = await getDoc(doc(db, 'projects', purchase.projectId));
      if (projSnap.exists()) {
        const p = projSnap.data() as Project;
        await updateDoc(doc(db, 'projects', purchase.projectId), {
          actualCost: (p.actualCost || 0) + purchase.total
        });
      }
    }

    // 3. Deduct from Cashbox or Bank if paid > 0
    if (purchase.paid > 0) {
      if (purchase.paymentMethod === 'cash') {
        await recordCashTransactionInternal({
          type: 'out',
          amount: purchase.paid,
          date: purchase.date,
          description: `Purchase #${purchase.invoiceNumber} - ${purchase.supplierName}`,
          reference: `PUR-${id.substring(0, 6)}`,
          category: 'Purchase Payment',
          user
        });
      } else if (purchase.paymentMethod === 'bank' && purchase.sourceId) {
        await recordBankTransactionInternal({
          bankId: purchase.sourceId,
          type: 'withdrawal',
          amount: purchase.paid,
          date: purchase.date,
          description: `Purchase #${purchase.invoiceNumber} - ${purchase.supplierName}`,
          reference: `PUR-${id.substring(0, 6)}`
        });
      }
    }

    await logAudit(user, 'CREATE_PURCHASE', 'Purchase', id, `Purchase #${purchase.invoiceNumber} from ${purchase.supplierName} total ${purchase.total}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `purchases/${id}`);
  }
}

export async function deletePurchase(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'purchases', id));
    await logAudit(user, 'DELETE_PURCHASE', 'Purchase', id, `Deleted purchase invoice ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `purchases/${id}`);
  }
}

// ==========================================
// EXPENSES
// ==========================================
export async function getExpenses(projectId?: string): Promise<Expense[]> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (projectId) list = list.filter(e => e.projectId === projectId);
    return list;
  } catch (error) {
    const list = (memoryStore['expenses'] || []) as Expense[];
    return projectId ? list.filter(e => e.projectId === projectId) : list;
  }
}

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>, user = 'Admin'): Promise<Expense> {
  const id = generateId();
  const record: Expense = {
    ...expense,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'expenses', id), record);

    // 1. If project expense, add to project actual cost
    if (expense.expenseType === 'project' && expense.projectId) {
      const projSnap = await getDoc(doc(db, 'projects', expense.projectId));
      if (projSnap.exists()) {
        const p = projSnap.data() as Project;
        await updateDoc(doc(db, 'projects', expense.projectId), {
          actualCost: (p.actualCost || 0) + expense.amount
        });
      }
    }

    // 2. Deduct from Cashbox or Bank
    if (expense.paymentMethod === 'cash') {
      await recordCashTransactionInternal({
        type: 'out',
        amount: expense.amount,
        date: expense.date,
        description: `Expense: ${expense.category} - ${expense.description}`,
        reference: expense.receiptNumber || `EXP-${id.substring(0, 6)}`,
        category: expense.category,
        user
      });
    } else if (expense.paymentMethod === 'bank' && expense.sourceId) {
      await recordBankTransactionInternal({
        bankId: expense.sourceId,
        type: 'withdrawal',
        amount: expense.amount,
        date: expense.date,
        description: `Expense: ${expense.category} - ${expense.description}`,
        reference: expense.receiptNumber || `EXP-${id.substring(0, 6)}`
      });
    }

    await logAudit(user, 'CREATE_EXPENSE', 'Expense', id, `${expense.expenseType} expense: ${expense.category} amount ${expense.amount}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `expenses/${id}`);
  }
}

export async function deleteExpense(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', id));
    await logAudit(user, 'DELETE_EXPENSE', 'Expense', id, `Deleted expense ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
  }
}

// ==========================================
// CASHBOX ACCOUNTING
// ==========================================
export async function getCashTransactions(): Promise<CashTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'cashbox_transactions'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CashTransaction));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  } catch (error) {
    return memoryStore['cashbox_transactions'] || [];
  }
}

async function recordCashTransactionInternal(data: Omit<CashTransaction, 'id' | 'balanceAfter' | 'createdAt'>): Promise<CashTransaction> {
  const all = await getCashTransactions();
  const currentBal = all.length > 0 ? all[0].balanceAfter : 0;
  const newBal = data.type === 'in' ? currentBal + data.amount : currentBal - data.amount;

  const id = generateId();
  const record: CashTransaction = {
    ...data,
    id,
    balanceAfter: newBal,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'cashbox_transactions', id), record);
  return record;
}

export async function createCashTransaction(
  data: Omit<CashTransaction, 'id' | 'balanceAfter' | 'createdAt'>, 
  user = 'Admin'
): Promise<CashTransaction> {
  try {
    const record = await recordCashTransactionInternal(data);
    await logAudit(user, 'CASH_TRANSACTION', 'Cashbox', record.id, `Cash ${data.type}: ${data.amount} (${data.description})`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'cashbox_transactions');
  }
}

// ==========================================
// BANK ACCOUNTS & TRANSACTIONS
// ==========================================
export async function getBankAccounts(): Promise<BankAccount[]> {
  try {
    const snap = await getDocs(collection(db, 'bank_accounts'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount));
  } catch (error) {
    return memoryStore['bank_accounts'] || [];
  }
}

export async function createBankAccount(bank: Omit<BankAccount, 'id' | 'createdAt'>, user = 'Admin'): Promise<BankAccount> {
  const id = generateId();
  const record: BankAccount = {
    ...bank,
    id,
    currentBalance: bank.openingBalance || 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'bank_accounts', id), record);
    await logAudit(user, 'CREATE_BANK', 'BankAccount', id, `Added bank account: ${bank.bankName} - ${bank.accountNumber}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `bank_accounts/${id}`);
  }
}

export async function updateBankAccount(id: string, updates: Partial<BankAccount>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'bank_accounts', id), updates);
    await logAudit(user, 'UPDATE_BANK', 'BankAccount', id, `Updated bank account ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bank_accounts/${id}`);
  }
}

export async function getBankTransactions(bankId?: string): Promise<BankTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'bank_transactions'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BankTransaction));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (bankId) list = list.filter(t => t.bankId === bankId);
    return list;
  } catch (error) {
    const list = (memoryStore['bank_transactions'] || []) as BankTransaction[];
    return bankId ? list.filter(t => t.bankId === bankId) : list;
  }
}

async function recordBankTransactionInternal(data: Omit<BankTransaction, 'id' | 'balanceAfter' | 'createdAt'>): Promise<BankTransaction> {
  const bankSnap = await getDoc(doc(db, 'bank_accounts', data.bankId));
  let currentBal = 0;
  if (bankSnap.exists()) {
    currentBal = (bankSnap.data() as BankAccount).currentBalance || 0;
  }
  const newBal = data.type === 'deposit' ? currentBal + data.amount : currentBal - data.amount;

  const id = generateId();
  const record: BankTransaction = {
    ...data,
    id,
    balanceAfter: newBal,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'bank_transactions', id), record);
  if (bankSnap.exists()) {
    await updateDoc(doc(db, 'bank_accounts', data.bankId), { currentBalance: newBal });
  }
  return record;
}

export async function createBankTransaction(
  data: Omit<BankTransaction, 'id' | 'balanceAfter' | 'createdAt'>, 
  user = 'Admin'
): Promise<BankTransaction> {
  try {
    const record = await recordBankTransactionInternal(data);
    await logAudit(user, 'BANK_TRANSACTION', 'BankAccount', data.bankId, `Bank ${data.type}: ${data.amount} (${data.description})`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bank_transactions');
  }
}

// Transfer from Bank to Cashbox or Bank to Bank
export async function transferFunds(
  sourceType: 'bank' | 'cash',
  sourceId: string,
  destType: 'bank' | 'cash',
  destId: string,
  amount: number,
  date: string,
  description: string,
  user = 'Admin'
) {
  if (sourceType === 'cash' && destType === 'bank') {
    await createCashTransaction({
      type: 'out',
      amount,
      date,
      description: `Transfer to Bank: ${description}`,
      reference: 'TRANSFER',
      category: 'Internal Transfer',
      user
    }, user);
    await recordBankTransactionInternal({
      bankId: destId,
      type: 'deposit',
      amount,
      date,
      description: `Transfer from Cashbox: ${description}`,
      reference: 'TRANSFER'
    });
  } else if (sourceType === 'bank' && destType === 'cash') {
    await recordBankTransactionInternal({
      bankId: sourceId,
      type: 'withdrawal',
      amount,
      date,
      description: `Transfer to Cashbox: ${description}`,
      reference: 'TRANSFER'
    });
    await createCashTransaction({
      type: 'in',
      amount,
      date,
      description: `Transfer from Bank: ${description}`,
      reference: 'TRANSFER',
      category: 'Internal Transfer',
      user
    }, user);
  } else if (sourceType === 'bank' && destType === 'bank') {
    await recordBankTransactionInternal({
      bankId: sourceId,
      type: 'withdrawal',
      amount,
      date,
      description: `Transfer to Bank: ${description}`,
      reference: 'TRANSFER'
    });
    await recordBankTransactionInternal({
      bankId: destId,
      type: 'deposit',
      amount,
      date,
      description: `Transfer from Bank: ${description}`,
      reference: 'TRANSFER'
    });
  }
  await logAudit(user, 'TRANSFER_FUNDS', 'Finance', `${sourceId}->${destId}`, `Transferred ${amount} from ${sourceType} to ${destType}`);
}

// ==========================================
// INVENTORY & MATERIALS
// ==========================================
export async function getMaterials(): Promise<Material[]> {
  try {
    const snap = await getDocs(collection(db, 'materials'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
  } catch (error) {
    return memoryStore['materials'] || [];
  }
}

export async function createMaterial(mat: Omit<Material, 'id' | 'createdAt'>, user = 'Admin'): Promise<Material> {
  const id = generateId();
  const record: Material = {
    ...mat,
    id,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'materials', id), record);
    await logAudit(user, 'CREATE_MATERIAL', 'Material', id, `Created material [${mat.code}] ${mat.name}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `materials/${id}`);
  }
}

export async function updateMaterial(id: string, updates: Partial<Material>, user = 'Admin'): Promise<void> {
  try {
    await updateDoc(doc(db, 'materials', id), updates);
    await logAudit(user, 'UPDATE_MATERIAL', 'Material', id, `Updated material ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `materials/${id}`);
  }
}

export async function deleteMaterial(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'materials', id));
    await logAudit(user, 'DELETE_MATERIAL', 'Material', id, `Deleted material ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `materials/${id}`);
  }
}

export async function getInventoryTransactions(materialId?: string): Promise<InventoryTransaction[]> {
  try {
    const snap = await getDocs(collection(db, 'inventory_transactions'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (materialId) list = list.filter(t => t.materialId === materialId);
    return list;
  } catch (error) {
    const list = (memoryStore['inventory_transactions'] || []) as InventoryTransaction[];
    return materialId ? list.filter(t => t.materialId === materialId) : list;
  }
}

export async function createInventoryTransaction(
  trans: Omit<InventoryTransaction, 'id' | 'createdAt'>, 
  user = 'Admin'
): Promise<InventoryTransaction> {
  const id = generateId();
  const record: InventoryTransaction = {
    ...trans,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'inventory_transactions', id), record);

    // Update material quantity
    const matSnap = await getDoc(doc(db, 'materials', trans.materialId));
    if (matSnap.exists()) {
      const mat = matSnap.data() as Material;
      let newQty = mat.currentQuantity || 0;
      if (trans.type === 'in') {
        newQty += trans.quantity;
      } else if (trans.type === 'out') {
        newQty = Math.max(0, newQty - trans.quantity);
      } else if (trans.type === 'adjustment') {
        newQty = trans.quantity;
      }
      await updateDoc(doc(db, 'materials', trans.materialId), {
        currentQuantity: newQty,
        lastPurchasePrice: trans.unitCost || mat.lastPurchasePrice
      });
    }

    // If dispatched to project, record into project actual cost
    if (trans.type === 'out' && trans.projectId && trans.totalCost > 0) {
      const projSnap = await getDoc(doc(db, 'projects', trans.projectId));
      if (projSnap.exists()) {
        const p = projSnap.data() as Project;
        await updateDoc(doc(db, 'projects', trans.projectId), {
          actualCost: (p.actualCost || 0) + trans.totalCost
        });
      }
    }

    await logAudit(user, 'INVENTORY_TRANSACTION', 'Material', trans.materialId, `${trans.type}: ${trans.quantity} of ${trans.materialName}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `inventory_transactions/${id}`);
  }
}

// ==========================================
// SUBCONTRACTORS
// ==========================================
export async function getSubcontractors(): Promise<Subcontractor[]> {
  try {
    const snap = await getDocs(collection(db, 'subcontractors'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subcontractor));
  } catch (error) {
    return memoryStore['subcontractors'] || [];
  }
}

export async function createSubcontractor(sub: Omit<Subcontractor, 'id' | 'createdAt'>, user = 'Admin'): Promise<Subcontractor> {
  const id = generateId();
  const record: Subcontractor = {
    ...sub,
    id,
    totalContracts: 0,
    totalPaid: 0,
    currentBalance: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'subcontractors', id), record);
    await logAudit(user, 'CREATE_SUBCONTRACTOR', 'Subcontractor', id, `Added subcontractor ${sub.name} (${sub.specialty})`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `subcontractors/${id}`);
  }
}

export async function getSubcontractorContracts(projectId?: string): Promise<SubcontractorContract[]> {
  try {
    const snap = await getDocs(collection(db, 'subcontractor_contracts'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubcontractorContract));
    if (projectId) list = list.filter(c => c.projectId === projectId);
    return list;
  } catch (error) {
    const list = (memoryStore['subcontractor_contracts'] || []) as SubcontractorContract[];
    return projectId ? list.filter(c => c.projectId === projectId) : list;
  }
}

export async function createSubcontractorContract(
  contract: Omit<SubcontractorContract, 'id' | 'createdAt'>, 
  user = 'Admin'
): Promise<SubcontractorContract> {
  const id = generateId();
  const record: SubcontractorContract = {
    ...contract,
    id,
    paid: 0,
    remaining: contract.contractValue,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'subcontractor_contracts', id), record);

    // Update Subcontractor totals
    const subSnap = await getDoc(doc(db, 'subcontractors', contract.subcontractorId));
    if (subSnap.exists()) {
      const s = subSnap.data() as Subcontractor;
      await updateDoc(doc(db, 'subcontractors', contract.subcontractorId), {
        totalContracts: (s.totalContracts || 0) + contract.contractValue,
        currentBalance: (s.currentBalance || 0) + contract.contractValue
      });
    }

    await logAudit(user, 'SUBCONTRACTOR_CONTRACT', 'Subcontractor', contract.subcontractorId, `Contract of ${contract.contractValue} for ${contract.subcontractorName} on ${contract.projectName}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `subcontractor_contracts/${id}`);
  }
}

export async function recordSubcontractorPayment(
  contractId: string, 
  amount: number, 
  paymentMethod: 'cash' | 'bank', 
  sourceId: string, 
  date: string, 
  user = 'Admin'
) {
  const contractRef = doc(db, 'subcontractor_contracts', contractId);
  const snap = await getDoc(contractRef);
  if (!snap.exists()) throw new Error('Contract not found');
  const contract = snap.data() as SubcontractorContract;

  const newPaid = (contract.paid || 0) + amount;
  const newRemaining = Math.max(0, contract.contractValue - newPaid);
  await updateDoc(contractRef, { paid: newPaid, remaining: newRemaining });

  // Update subcontractor balance
  const subSnap = await getDoc(doc(db, 'subcontractors', contract.subcontractorId));
  if (subSnap.exists()) {
    const s = subSnap.data() as Subcontractor;
    await updateDoc(doc(db, 'subcontractors', contract.subcontractorId), {
      totalPaid: (s.totalPaid || 0) + amount,
      currentBalance: Math.max(0, (s.currentBalance || 0) - amount)
    });
  }

  // Update project cost
  const projSnap = await getDoc(doc(db, 'projects', contract.projectId));
  if (projSnap.exists()) {
    const p = projSnap.data() as Project;
    await updateDoc(doc(db, 'projects', contract.projectId), {
      actualCost: (p.actualCost || 0) + amount
    });
  }

  // Cashbox / Bank
  if (paymentMethod === 'cash') {
    await recordCashTransactionInternal({
      type: 'out',
      amount,
      date,
      description: `Subcontractor Payment: ${contract.subcontractorName} (${contract.projectName})`,
      reference: `SUB-${contractId.substring(0, 6)}`,
      category: 'Subcontractor Labor',
      user
    });
  } else if (paymentMethod === 'bank' && sourceId) {
    await recordBankTransactionInternal({
      bankId: sourceId,
      type: 'withdrawal',
      amount,
      date,
      description: `Subcontractor Payment: ${contract.subcontractorName} (${contract.projectName})`,
      reference: `SUB-${contractId.substring(0, 6)}`
    });
  }

  await logAudit(user, 'SUBCONTRACTOR_PAYMENT', 'Subcontractor', contract.subcontractorId, `Paid ${amount} to ${contract.subcontractorName}`);
}

// ==========================================
// EMPLOYEES & LABOR
// ==========================================
export async function getEmployees(): Promise<Employee[]> {
  try {
    const snap = await getDocs(collection(db, 'employees'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
  } catch (error) {
    return memoryStore['employees'] || [];
  }
}

export async function createEmployee(emp: Omit<Employee, 'id' | 'createdAt'>, user = 'Admin'): Promise<Employee> {
  const id = generateId();
  const record: Employee = {
    ...emp,
    id,
    totalPaid: 0,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'employees', id), record);
    await logAudit(user, 'CREATE_EMPLOYEE', 'Employee', id, `Registered employee ${emp.name} (${emp.jobTitle})`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `employees/${id}`);
  }
}

export async function recordEmployeePayment(
  employeeId: string, 
  amount: number, 
  paymentMethod: 'cash' | 'bank', 
  sourceId: string, 
  date: string, 
  projectId?: string, 
  user = 'Admin'
) {
  const empRef = doc(db, 'employees', employeeId);
  const snap = await getDoc(empRef);
  if (!snap.exists()) throw new Error('Employee not found');
  const emp = snap.data() as Employee;

  await updateDoc(empRef, { totalPaid: (emp.totalPaid || 0) + amount });

  // If assigned or specified project, increase project actual cost
  const targetProjId = projectId || emp.assignedProjectId;
  if (targetProjId) {
    const projSnap = await getDoc(doc(db, 'projects', targetProjId));
    if (projSnap.exists()) {
      const p = projSnap.data() as Project;
      await updateDoc(doc(db, 'projects', targetProjId), {
        actualCost: (p.actualCost || 0) + amount
      });
    }
  }

  // Deduct payment
  if (paymentMethod === 'cash') {
    await recordCashTransactionInternal({
      type: 'out',
      amount,
      date,
      description: `Salary/Labor Payment: ${emp.name} (${emp.jobTitle})`,
      reference: `EMP-${employeeId.substring(0, 6)}`,
      category: 'Labor Wages',
      user
    });
  } else if (paymentMethod === 'bank' && sourceId) {
    await recordBankTransactionInternal({
      bankId: sourceId,
      type: 'withdrawal',
      amount,
      date,
      description: `Salary/Labor Payment: ${emp.name} (${emp.jobTitle})`,
      reference: `EMP-${employeeId.substring(0, 6)}`
    });
  }

  await logAudit(user, 'EMPLOYEE_PAYMENT', 'Employee', employeeId, `Paid ${amount} to ${emp.name}`);
}

// ==========================================
// INVOICES & REVENUE
// ==========================================
export async function getInvoices(projectId?: string): Promise<Invoice[]> {
  try {
    const snap = await getDocs(collection(db, 'invoices'));
    let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (projectId) list = list.filter(i => i.projectId === projectId);
    return list;
  } catch (error) {
    const list = (memoryStore['invoices'] || []) as Invoice[];
    return projectId ? list.filter(i => i.projectId === projectId) : list;
  }
}

export async function createInvoice(inv: Omit<Invoice, 'id' | 'createdAt'>, user = 'Admin'): Promise<Invoice> {
  const id = generateId();
  const record: Invoice = {
    ...inv,
    id,
    createdAt: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'invoices', id), record);

    // 1. Update Client Balance and Invoiced Total
    const clientSnap = await getDoc(doc(db, 'clients', inv.clientId));
    if (clientSnap.exists()) {
      const c = clientSnap.data() as Client;
      await updateDoc(doc(db, 'clients', inv.clientId), {
        totalInvoiced: (c.totalInvoiced || 0) + inv.total,
        totalPaid: (c.totalPaid || 0) + inv.paid,
        currentBalance: (c.currentBalance || 0) + inv.remaining
      });
    }

    // 2. Update Project totalInvoiced
    if (inv.projectId) {
      const projSnap = await getDoc(doc(db, 'projects', inv.projectId));
      if (projSnap.exists()) {
        const p = projSnap.data() as Project;
        await updateDoc(doc(db, 'projects', inv.projectId), {
          totalInvoiced: (p.totalInvoiced || 0) + inv.total,
          totalCollected: (p.totalCollected || 0) + inv.paid
        });
      }
    }

    // 3. Increment Invoice numbering
    const settings = await getCompanySettings();
    await updateCompanySettings({ nextInvoiceNumber: settings.nextInvoiceNumber + 1 });

    await logAudit(user, 'CREATE_INVOICE', 'Invoice', id, `Issued Invoice #${inv.invoiceNumber} to ${inv.clientName} for ${inv.total}`);
    return record;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `invoices/${id}`);
  }
}

export async function recordInvoicePayment(
  invoiceId: string, 
  amount: number, 
  paymentMethod: 'cash' | 'bank', 
  destId: string, 
  date: string, 
  user = 'Admin'
) {
  const invRef = doc(db, 'invoices', invoiceId);
  const snap = await getDoc(invRef);
  if (!snap.exists()) throw new Error('Invoice not found');
  const inv = snap.data() as Invoice;

  const newPaid = (inv.paid || 0) + amount;
  const newRemaining = Math.max(0, inv.total - newPaid);
  const newStatus = newRemaining === 0 ? 'Paid' : 'Partially Paid';

  await updateDoc(invRef, {
    paid: newPaid,
    remaining: newRemaining,
    status: newStatus
  });

  // Client balance update
  const clientSnap = await getDoc(doc(db, 'clients', inv.clientId));
  if (clientSnap.exists()) {
    const c = clientSnap.data() as Client;
    await updateDoc(doc(db, 'clients', inv.clientId), {
      totalPaid: (c.totalPaid || 0) + amount,
      currentBalance: Math.max(0, (c.currentBalance || 0) - amount)
    });
  }

  // Project collected update
  if (inv.projectId) {
    const projSnap = await getDoc(doc(db, 'projects', inv.projectId));
    if (projSnap.exists()) {
      const p = projSnap.data() as Project;
      await updateDoc(doc(db, 'projects', inv.projectId), {
        totalCollected: (p.totalCollected || 0) + amount
      });
    }
  }

  // Cashbox / Bank Inflow
  if (paymentMethod === 'cash') {
    await recordCashTransactionInternal({
      type: 'in',
      amount,
      date,
      description: `Client Payment: ${inv.clientName} - Inv #${inv.invoiceNumber}`,
      reference: `INV-${inv.invoiceNumber}`,
      category: 'Customer Collections',
      user
    });
  } else if (paymentMethod === 'bank' && destId) {
    await recordBankTransactionInternal({
      bankId: destId,
      type: 'deposit',
      amount,
      date,
      description: `Client Payment: ${inv.clientName} - Inv #${inv.invoiceNumber}`,
      reference: `INV-${inv.invoiceNumber}`
    });
  }

  await logAudit(user, 'RECEIVE_INVOICE_PAYMENT', 'Invoice', invoiceId, `Collected ${amount} for Invoice #${inv.invoiceNumber}`);
}

export async function deleteInvoice(id: string, user = 'Admin'): Promise<void> {
  try {
    await deleteDoc(doc(db, 'invoices', id));
    await logAudit(user, 'DELETE_INVOICE', 'Invoice', id, `Deleted invoice ${id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
  }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
export async function getNotifications(): Promise<AppNotification[]> {
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    return memoryStore['notifications'] || [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (error) {
    console.warn('Failed to mark notification read:', error);
  }
}

export async function createNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
  const id = generateId();
  const record: AppNotification = {
    ...notif,
    id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, 'notifications', id), record);
  } catch (e) {
    console.warn('Could not write notification:', e);
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================
export async function getAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'audit_logs'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (error) {
    return memoryStore['audit_logs'] || [];
  }
}

// ==========================================
// REAL FINANCIAL CALCULATIONS
// ==========================================
export async function calculateFinancialSummary(): Promise<FinancialSummary> {
  const [projects, invoices, purchases, expenses, cashTxs, bankAccounts, clients, suppliers] = await Promise.all([
    getProjects(),
    getInvoices(),
    getPurchases(),
    getExpenses(),
    getCashTransactions(),
    getBankAccounts(),
    getClients(),
    getSuppliers()
  ]);

  const totalContractValue = projects.reduce((acc, p) => acc + (p.contractValue || 0), 0);
  const totalRevenue = invoices.reduce((acc, i) => acc + (i.paid || 0), 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  // Direct Project Costs (Materials, Labor, Subcontractor, etc.)
  const directProjectCost = projects.reduce((acc, p) => acc + (p.actualCost || 0), 0);
  
  // Total Contract Invoiced
  const totalBilled = invoices.reduce((acc, i) => acc + (i.total || 0), 0);
  
  // Project Gross Profit = Invoiced Revenue - Direct Project Costs
  const projectGrossProfit = totalBilled - directProjectCost;
  
  // Company Overhead
  const companyExpenses = expenses
    .filter(e => e.expenseType === 'company')
    .reduce((acc, e) => acc + (e.amount || 0), 0);

  const netProfit = projectGrossProfit - companyExpenses;

  // Expected Profit from active contracts
  const expectedTotalCost = projects.reduce((acc, p) => acc + (p.expectedCost || 0), 0);
  const expectedProfit = totalContractValue - expectedTotalCost;

  // Current liquid cash & bank balances
  const cashBalance = cashTxs.length > 0 ? cashTxs[0].balanceAfter : 0;
  const bankBalance = bankAccounts.reduce((acc, b) => acc + (b.currentBalance || 0), 0);

  // Receivables from clients & payables to suppliers
  const customerReceivables = clients.reduce((acc, c) => acc + (c.currentBalance || 0), 0);
  const supplierPayables = suppliers.reduce((acc, s) => acc + (s.currentBalance || 0), 0);

  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const completedProjects = projects.filter(p => p.status === 'Completed').length;

  return {
    totalContractValue,
    totalRevenue,
    totalPurchases,
    totalExpenses,
    projectGrossProfit,
    netProfit,
    expectedProfit,
    cashBalance,
    bankBalance,
    customerReceivables,
    supplierPayables,
    activeProjects,
    completedProjects
  };
}

// ==========================================
// SEED REALISTIC DEMO DATA
// ==========================================
export async function seedDemoData(user = 'Admin'): Promise<void> {
  const batch = writeBatch(db);

  // 1. Partners
  const partners: Partner[] = [
    {
      id: 'partner_ahmed',
      name: 'Eng. Ahmed El-Sayed',
      nameAr: 'م. أحمد السيد',
      phone: '+20 100 123 4567',
      email: 'ahmed@alrowad.eg',
      ownershipPercentage: 40,
      profitSharePercentage: 50, // Higher profit share based on active executive management
      lossSharePercentage: 40,
      capitalContribution: 4000000,
      currentBalance: 4650000,
      totalWithdrawals: 350000,
      notes: 'Managing Partner & Technical Director',
      createdAt: new Date().toISOString()
    },
    {
      id: 'partner_mohamed',
      name: 'Mohamed Mansour',
      nameAr: 'أ. محمد منصور',
      phone: '+20 101 987 6543',
      email: 'mohamed@alrowad.eg',
      ownershipPercentage: 35,
      profitSharePercentage: 30,
      lossSharePercentage: 35,
      capitalContribution: 3500000,
      currentBalance: 3780000,
      totalWithdrawals: 220000,
      notes: 'Financial Partner & Business Development',
      createdAt: new Date().toISOString()
    },
    {
      id: 'partner_ali',
      name: 'Eng. Ali Hassan',
      nameAr: 'م. علي حسن',
      phone: '+20 102 333 4455',
      email: 'ali@alrowad.eg',
      ownershipPercentage: 25,
      profitSharePercentage: 20,
      lossSharePercentage: 25,
      capitalContribution: 2500000,
      currentBalance: 2640000,
      totalWithdrawals: 160000,
      notes: 'Partner & Chief Site Operations',
      createdAt: new Date().toISOString()
    }
  ];

  for (const p of partners) {
    batch.set(doc(db, 'partners', p.id), p);
  }

  // 2. Bank Accounts
  const banks: BankAccount[] = [
    {
      id: 'bank_cib',
      bankName: 'Commercial International Bank (CIB)',
      accountName: 'Al-Rowad Contracting Current',
      accountNumber: '1000-4829-1029',
      openingBalance: 2500000,
      currentBalance: 3420000,
      currency: 'EGP',
      createdAt: new Date().toISOString()
    },
    {
      id: 'bank_nbe',
      bankName: 'National Bank of Egypt (NBE)',
      accountName: 'Al-Rowad Operations Account',
      accountNumber: '2938-1920-4821',
      openingBalance: 1200000,
      currentBalance: 1850000,
      currency: 'EGP',
      createdAt: new Date().toISOString()
    }
  ];

  for (const b of banks) {
    batch.set(doc(db, 'bank_accounts', b.id), b);
  }

  // 3. Cashbox Transactions
  const cashTx: CashTransaction = {
    id: 'cash_init',
    type: 'in',
    amount: 350000,
    date: '2026-09-01',
    description: 'Site Petty Cash Initial Allocation',
    reference: 'ALLOC-01',
    category: 'Opening Cash',
    user: 'Eng. Ahmed El-Sayed',
    balanceAfter: 350000,
    createdAt: new Date().toISOString()
  };
  batch.set(doc(db, 'cashbox_transactions', cashTx.id), cashTx);

  // 4. Clients
  const clients: Client[] = [
    {
      id: 'client_marassi',
      name: 'Emaar Misr Real Estate',
      company: 'Emaar Misr',
      phone: '+20 2 3536 0000',
      email: 'projects@emaar.com.eg',
      address: 'Smart Village, Building B12, Giza',
      taxNumber: '102-482-901',
      currentBalance: 850000,
      totalInvoiced: 7200000,
      totalPaid: 6350000,
      notes: 'Tier 1 Developer - Prime Client',
      createdAt: new Date().toISOString()
    },
    {
      id: 'client_new_capital',
      name: 'Talaat Moustafa Group (TMG)',
      company: 'TMG Holding',
      phone: '+20 2 2696 8000',
      email: 'procurement@tmg.com.eg',
      address: 'Dokki, Giza, Egypt',
      taxNumber: '294-821-390',
      currentBalance: 1450000,
      totalInvoiced: 14500000,
      totalPaid: 13050000,
      notes: 'New Capital Commercial Mall Contract',
      createdAt: new Date().toISOString()
    }
  ];

  for (const c of clients) {
    batch.set(doc(db, 'clients', c.id), c);
  }

  // 5. Projects
  const projects: Project[] = [
    {
      id: 'proj_andalus',
      code: 'PRJ-2026-01',
      name: 'Al-Andalus Residential Tower',
      nameAr: 'برج الأندلس السكني الفاخر',
      clientId: 'client_marassi',
      clientName: 'Emaar Misr Real Estate',
      contractValue: 12500000,
      startDate: '2026-01-15',
      expectedEndDate: '2026-12-30',
      projectManager: 'Eng. Tamer Galal',
      status: 'Active',
      progress: 62,
      expectedCost: 9200000,
      actualCost: 5850000,
      totalInvoiced: 7200000,
      totalCollected: 6350000,
      location: 'Fifth Settlement, Plot 42, New Cairo',
      notes: '14-floor luxury residential tower with 2 basements',
      createdAt: new Date().toISOString()
    },
    {
      id: 'proj_mall',
      code: 'PRJ-2026-02',
      name: 'New Capital Boulevard Commercial Complex',
      nameAr: 'مجمع بوليفارد التجاري بالعاصمة الإدارية',
      clientId: 'client_new_capital',
      clientName: 'Talaat Moustafa Group (TMG)',
      contractValue: 24000000,
      startDate: '2026-02-01',
      expectedEndDate: '2027-04-30',
      projectManager: 'Eng. Karim Fawzy',
      status: 'Active',
      progress: 45,
      expectedCost: 18000000,
      actualCost: 9100000,
      totalInvoiced: 14500000,
      totalCollected: 13050000,
      location: 'Downtown District, New Administrative Capital',
      notes: 'Steel structure with curtain glass facade',
      createdAt: new Date().toISOString()
    }
  ];

  for (const pr of projects) {
    batch.set(doc(db, 'projects', pr.id), pr);
  }

  // 6. Contracts
  const contracts: Contract[] = [
    {
      id: 'contract_andalus',
      contractNumber: 'CTR-2026-081',
      clientId: 'client_marassi',
      clientName: 'Emaar Misr Real Estate',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      contractValue: 12500000,
      retentionPercentage: 5,
      retentionAmount: 625000,
      startDate: '2026-01-15',
      endDate: '2026-12-30',
      paymentTerms: 'Monthly progress certificates, 30 days credit',
      status: 'Active',
      createdAt: new Date().toISOString()
    }
  ];

  for (const c of contracts) {
    batch.set(doc(db, 'contracts', c.id), c);
  }

  // 7. Suppliers
  const suppliers: Supplier[] = [
    {
      id: 'supp_suez_cement',
      name: 'Suez Cement Group',
      company: 'Suez Cement S.A.E.',
      phone: '+20 2 2522 2000',
      email: 'sales@suezcement.com.eg',
      address: 'Maadi, Cairo, Egypt',
      taxNumber: '100-394-821',
      currentBalance: 420000,
      totalPurchases: 2850000,
      totalPaid: 2430000,
      notes: 'Ready-mix concrete & bulk Portland cement supplier',
      createdAt: new Date().toISOString()
    },
    {
      id: 'supp_ezz_steel',
      name: 'Ezz Steel Manufacturing',
      company: 'Al Ezz Dikheila Steel Co.',
      phone: '+20 2 3304 4000',
      email: 'commercial@ezzsteel.com',
      address: 'Mohandessin, Giza, Egypt',
      taxNumber: '204-918-203',
      currentBalance: 780000,
      totalPurchases: 4500000,
      totalPaid: 3720000,
      notes: 'Deformed rebar (B500D) Grade 60',
      createdAt: new Date().toISOString()
    }
  ];

  for (const s of suppliers) {
    batch.set(doc(db, 'suppliers', s.id), s);
  }

  // 8. Materials Catalog
  const materials: Material[] = [
    {
      id: 'mat_rebar_16',
      code: 'MAT-STEEL-16',
      name: 'Deformed High-Tensile Steel Rebar 16mm',
      nameAr: 'حديد تسليح عالي المقاومة قطر ١٦ مم',
      category: 'Steel & Metals',
      unit: 'Ton',
      currentQuantity: 42,
      minimumQuantity: 15,
      averageCost: 38500,
      lastPurchasePrice: 39000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mat_portland_cement',
      code: 'MAT-CEM-425',
      name: 'Ordinary Portland Cement CEM I 42.5N',
      nameAr: 'أسمنت بورتلاندي عادي ٤٢.٥ ن',
      category: 'Cement & Concrete',
      unit: 'Ton',
      currentQuantity: 85,
      minimumQuantity: 25,
      averageCost: 2450,
      lastPurchasePrice: 2500,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mat_ready_mix_350',
      code: 'MAT-CONC-350',
      name: 'Ready-Mix Concrete C35/45',
      nameAr: 'خرسانة جاهزة رتبة ٣٥٠ كجم/سم٢',
      category: 'Cement & Concrete',
      unit: 'm³',
      currentQuantity: 120,
      minimumQuantity: 40,
      averageCost: 1750,
      lastPurchasePrice: 1780,
      createdAt: new Date().toISOString()
    },
    {
      id: 'mat_red_bricks',
      code: 'MAT-BRK-25',
      name: 'Perforated Clay Red Bricks 25x12x6 cm',
      nameAr: 'طوب أحمر طفلي مفرغ ٢٥×١٢×٦ سم',
      category: 'Masonry',
      unit: '1,000 Pcs',
      currentQuantity: 65,
      minimumQuantity: 20,
      averageCost: 1650,
      lastPurchasePrice: 1680,
      createdAt: new Date().toISOString()
    }
  ];

  for (const m of materials) {
    batch.set(doc(db, 'materials', m.id), m);
  }

  // 9. Subcontractors
  const subcontractors: Subcontractor[] = [
    {
      id: 'sub_delta_elec',
      name: 'Delta Electromechanical Works',
      company: 'Delta MEP Contracting',
      phone: '+20 100 555 7788',
      specialty: 'Electrical, Fire Alarm & Low Voltage',
      totalContracts: 1800000,
      totalPaid: 1200000,
      currentBalance: 600000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sub_nile_plumbing',
      name: 'Nile Sanitary & Plumbing Co.',
      company: 'Nile Piping S.A.E.',
      phone: '+20 109 444 2233',
      specialty: 'Plumbing, Drainage & Water Supply',
      totalContracts: 950000,
      totalPaid: 650000,
      currentBalance: 300000,
      createdAt: new Date().toISOString()
    }
  ];

  for (const sub of subcontractors) {
    batch.set(doc(db, 'subcontractors', sub.id), sub);
  }

  // 10. Employees
  const employees: Employee[] = [
    {
      id: 'emp_tamer',
      name: 'Eng. Tamer Galal',
      jobTitle: 'Senior Project Manager',
      phone: '+20 100 888 1234',
      type: 'monthly',
      rate: 35000,
      assignedProjectId: 'proj_andalus',
      assignedProjectName: 'Al-Andalus Residential Tower',
      status: 'active',
      totalPaid: 210000,
      createdAt: new Date().toISOString()
    },
    {
      id: 'emp_mostafa',
      name: 'Mostafa El-Naggar',
      jobTitle: 'Site General Foreman',
      phone: '+20 111 234 5678',
      type: 'monthly',
      rate: 18000,
      assignedProjectId: 'proj_andalus',
      assignedProjectName: 'Al-Andalus Residential Tower',
      status: 'active',
      totalPaid: 108000,
      createdAt: new Date().toISOString()
    }
  ];

  for (const emp of employees) {
    batch.set(doc(db, 'employees', emp.id), emp);
  }

  // 11. Invoices
  const invoices: Invoice[] = [
    {
      id: 'inv_1001',
      invoiceNumber: 'INV-1001',
      clientId: 'client_marassi',
      clientName: 'Emaar Misr Real Estate',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      date: '2026-08-20',
      dueDate: '2026-09-20',
      items: [
        {
          id: 'item_1',
          description: 'Progress Certificate #04: Reinforced Concrete Slab 6th to 8th Floor',
          quantity: 1,
          unit: 'Lot',
          unitPrice: 3200000,
          total: 3200000
        }
      ],
      subtotal: 3200000,
      discount: 0,
      tax: 0,
      total: 3200000,
      paid: 3200000,
      remaining: 0,
      status: 'Paid',
      paymentTerms: 'Net 30 days',
      createdAt: new Date().toISOString()
    },
    {
      id: 'inv_1002',
      invoiceNumber: 'INV-1002',
      clientId: 'client_marassi',
      clientName: 'Emaar Misr Real Estate',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      date: '2026-09-15',
      dueDate: '2026-10-15',
      items: [
        {
          id: 'item_2',
          description: 'Progress Certificate #05: Masonry Works & External Plastering',
          quantity: 1,
          unit: 'Lot',
          unitPrice: 4000000,
          total: 4000000
        }
      ],
      subtotal: 4000000,
      discount: 0,
      tax: 0,
      total: 4000000,
      paid: 3150000,
      remaining: 850000,
      status: 'Partially Paid',
      paymentTerms: 'Net 30 days',
      createdAt: new Date().toISOString()
    }
  ];

  for (const inv of invoices) {
    batch.set(doc(db, 'invoices', inv.id), inv);
  }

  // 12. Purchases
  const purchases: Purchase[] = [
    {
      id: 'pur_01',
      invoiceNumber: 'SZ-90219',
      supplierId: 'supp_suez_cement',
      supplierName: 'Suez Cement Group',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      date: '2026-09-10',
      category: 'Materials',
      items: [
        {
          id: 'pitem_1',
          description: 'Ordinary Portland Cement CEM I 42.5N',
          quantity: 100,
          unit: 'Ton',
          unitPrice: 2450,
          total: 245000
        }
      ],
      subtotal: 245000,
      discount: 0,
      tax: 0,
      total: 245000,
      paid: 200000,
      remaining: 45000,
      paymentMethod: 'bank',
      sourceId: 'bank_cib',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pur_02',
      invoiceNumber: 'EZ-48201',
      supplierId: 'supp_ezz_steel',
      supplierName: 'Ezz Steel Manufacturing',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      date: '2026-09-18',
      category: 'Materials',
      items: [
        {
          id: 'pitem_2',
          description: 'Steel Rebar 16mm High Tensile',
          quantity: 25,
          unit: 'Ton',
          unitPrice: 38800,
          total: 970000
        }
      ],
      subtotal: 970000,
      discount: 0,
      tax: 0,
      total: 970000,
      paid: 700000,
      remaining: 270000,
      paymentMethod: 'bank',
      sourceId: 'bank_nbe',
      createdAt: new Date().toISOString()
    }
  ];

  for (const pur of purchases) {
    batch.set(doc(db, 'purchases', pur.id), pur);
  }

  // 13. Expenses
  const expenses: Expense[] = [
    {
      id: 'exp_01',
      expenseType: 'project',
      category: 'Equipment',
      amount: 145000,
      date: '2026-09-12',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      paymentMethod: 'bank',
      sourceId: 'bank_cib',
      description: 'Tower Crane Monthly Rental & Maintenance',
      receiptNumber: 'REC-CRANE-09',
      createdBy: 'Eng. Ahmed El-Sayed',
      createdAt: new Date().toISOString()
    },
    {
      id: 'exp_02',
      expenseType: 'company',
      category: 'Rent',
      amount: 60000,
      date: '2026-09-01',
      paymentMethod: 'bank',
      sourceId: 'bank_cib',
      description: 'Head Office Rent - Fifth Settlement',
      receiptNumber: 'RENT-SEP-26',
      createdBy: 'Mohamed Mansour',
      createdAt: new Date().toISOString()
    },
    {
      id: 'exp_03',
      expenseType: 'project',
      category: 'Transportation',
      amount: 28000,
      date: '2026-09-19',
      projectId: 'proj_andalus',
      projectName: 'Al-Andalus Residential Tower',
      paymentMethod: 'cash',
      description: 'Sand & Gravel Aggregate Haulage Trucks',
      receiptNumber: 'TRK-9921',
      createdBy: 'Mostafa El-Naggar',
      createdAt: new Date().toISOString()
    }
  ];

  for (const exp of expenses) {
    batch.set(doc(db, 'expenses', exp.id), exp);
  }

  // 14. Notifications
  const notifications: AppNotification[] = [
    {
      id: 'notif_1',
      title: 'Invoice Due Soon',
      titleAr: 'فاتورة مستحقة قريباً',
      message: 'Invoice INV-1002 (850,000 EGP) from Emaar Misr is due on 15 Oct 2026.',
      messageAr: 'الفاتورة INV-1002 بقيمة ٨٥٠,٠٠٠ ج.م من شركة إعمار مصر مستحقة في ١٥ أكتوبر ٢٠٢٦.',
      type: 'warning',
      isRead: false,
      link: 'invoices',
      createdAt: new Date().toISOString()
    },
    {
      id: 'notif_2',
      title: 'Low Stock Alert',
      titleAr: 'تنبيه انخفاض المخزون',
      message: 'Deformed High-Tensile Steel Rebar 16mm reached 42 Tons (Min: 15 Tons). Plan procurement.',
      messageAr: 'حديد تسليح ١٦ مم وصل إلى ٤٢ طن (الحد الأدنى: ١٥ طن). يرجى التخطيط للتوريد.',
      type: 'info',
      isRead: false,
      link: 'inventory',
      createdAt: new Date().toISOString()
    }
  ];

  for (const n of notifications) {
    batch.set(doc(db, 'notifications', n.id), n);
  }

  // 15. Partner Transactions (Historical initial capital & withdrawals)
  const ptrs: PartnerTransaction[] = [
    {
      id: 'ptr_1',
      partnerId: 'partner_ahmed',
      partnerName: 'Eng. Ahmed El-Sayed',
      type: 'capital_contribution',
      amount: 4000000,
      date: '2026-01-01',
      paymentMethod: 'bank',
      cashboxOrBankId: 'bank_cib',
      description: 'Initial Company Equity Capital Contribution (40%)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ptr_2',
      partnerId: 'partner_mohamed',
      partnerName: 'Mohamed Mansour',
      type: 'capital_contribution',
      amount: 3500000,
      date: '2026-01-01',
      paymentMethod: 'bank',
      cashboxOrBankId: 'bank_cib',
      description: 'Initial Company Equity Capital Contribution (35%)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ptr_3',
      partnerId: 'partner_ali',
      partnerName: 'Eng. Ali Hassan',
      type: 'capital_contribution',
      amount: 2500000,
      date: '2026-01-01',
      paymentMethod: 'bank',
      cashboxOrBankId: 'bank_nbe',
      description: 'Initial Company Equity Capital Contribution (25%)',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ptr_4',
      partnerId: 'partner_ahmed',
      partnerName: 'Eng. Ahmed El-Sayed',
      type: 'withdrawal',
      amount: 350000,
      date: '2026-06-30',
      paymentMethod: 'bank',
      cashboxOrBankId: 'bank_cib',
      description: 'Quarterly Executive Partner Draw / Withdrawal',
      createdAt: new Date().toISOString()
    }
  ];

  for (const pt of ptrs) {
    batch.set(doc(db, 'partner_transactions', pt.id), pt);
  }

  // Execute batch commit to Firestore
  await batch.commit();
  await logAudit(user, 'SEED_DEMO_DATA', 'Database', 'all', 'Seeded realistic Egyptian multi-partner construction demo data');
}

// ==========================================
// RESET DATABASE TO PRISTINE EMPTY
// ==========================================
export async function resetDatabase(user = 'Admin'): Promise<void> {
  const collectionsToClear = [
    'partners',
    'partner_transactions',
    'projects',
    'contracts',
    'clients',
    'suppliers',
    'purchases',
    'expenses',
    'cashbox_transactions',
    'bank_accounts',
    'bank_transactions',
    'materials',
    'inventory_transactions',
    'subcontractors',
    'subcontractor_contracts',
    'employees',
    'invoices',
    'notifications'
  ];

  for (const colName of collectionsToClear) {
    const snap = await getDocs(collection(db, colName));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    memoryStore[colName] = [];
  }

  await logAudit(user, 'RESET_DATABASE', 'Database', 'all', 'Reset database to clean empty state');
}
