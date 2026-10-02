# CONSTRUCTA (كونستركتا)
### Enterprise ERP, Financial Accounting & Engineering Management for Multi-Partner Construction Companies

---

## 1. Project Overview
**CONSTRUCTA** is a production-ready enterprise ERP, job-cost accounting, and construction project management system built specifically for general contractors and construction firms owned by multiple equity partners.

Unlike generic accounting software, CONSTRUCTA incorporates specialized construction engineering workflows:
- **Independent Partner Ledgers & Asymmetric Equity:** Allows ownership percentage (e.g. 40%) to differ from profit distribution ratios (e.g. 50%), with dedicated capital contribution tracking, draws, and an automated profit distribution wizard.
- **Contract & Retentions Management:** Tracks progress billing certificates, defect liability retention amounts (e.g. 5%), and customer payment schedules.
- **Job Costing Financial Formula:** Evaluates each project dynamically:
  $$\text{Project Gross Profit} = \text{Contract Value} - (\text{Materials} + \text{Labor} + \text{Subcontractors} + \text{Equipment} + \text{Transportation} + \text{Other})$$
  followed by overhead allocation rules to determine **Project Net Profit**.
- **Procurement & Inventory Linkage:** Purchases automatically update supplier balances, warehouse stock levels, weighted average costs, and project job costs.
- **Dual Treasury Architecture:** Real-time synchronized tracking of site cashboxes (petty cash) and multi-currency commercial bank accounts (CIB, NBE, etc.) with inter-account transfers.
- **Bilingual & Responsive:** Full English and Arabic localization with native RTL layout, Cairo typography, and luxury dark/light high-contrast theme.

---

## 2. Technology Stack

### Frontend:
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS v4 with custom dark mode & print stylesheets
- **Icons:** Lucide React
- **Animations:** Motion
- **Internationalization:** Custom i18n engine with instantaneous Arabic (RTL) and English (LTR) toggling
- **Build Tool:** Vite 8

### Backend & Database:
- **Database & Storage:** Google Cloud Firestore (provisioned enterprise database)
- **Security & Authorization:** Fine-grained `firestore.rules` with ABAC (Attribute-Based Access Control)
- **Traceability:** Immutable Audit Log tracking every financial mutation with user and timestamp

---

## 3. Environment Variables
Configure the following variables in `.env` (refer to `.env.example`):
```env
APP_URL="https://your-domain.run.app"
GEMINI_API_KEY="your-api-key"
```
Firebase connection configuration is stored in `firebase-applet-config.json`.

---

## 4. Default Roles & Testing Accounts
CONSTRUCTA includes role-based access control with switchable profiles:
1. **Eng. Ahmed El-Sayed (Owner / Managing Partner)** - Full access to all modules, partner distributions, and company settings.
2. **Mohamed Mansour (Equity Partner)** - Access to financial reports, project profitability, and personal partner ledger.
3. **Hazem Fekry, CPA (Chief Accountant)** - Access to cashbox, bank accounts, purchases, invoices, and expenses.
4. **Eng. Tamer Galal (Project Manager)** - Access to assigned job sites, material dispatches, and labor logs.
5. **Mostafa El-Naggar (Site Employee / Foreman)** - Field view access.

---

## 5. Development & Build Commands

### Install dependencies:
```bash
npm install
```

### Start development server:
```bash
npm run dev
```

### Production build:
```bash
npm run build
```

### Code verification & lint:
```bash
npm run lint
```

---

## 6. Seed Data & Database Reset
- **Seed Demo Data:** Navigate to **Settings** -> Click **"Load Realistic Egyptian Demo Data"** to load projects (Al-Andalus Residential Tower, New Capital Boulevard), partners (Ahmed, Mohamed, Ali), suppliers (Suez Cement, Ezz Steel), inventory, and bank accounts.
- **Wipe to Clean Empty State:** Navigate to **Settings** -> Click **"Reset Database to Clean Empty State"** for a fresh start with zero records and clear empty states.

---
© 2026 CONSTRUCTA Enterprise Systems. All rights reserved.
