# Shift-Coverage & Tip-Pool Optimizer (v2.0)

A lightweight, zero-dependency browser web application for restaurant shift leads and hospitality managers. Combines deterministic shift-swap validation with 1.5x overtime financial liability alerts and FLSA-compliant bi-weekly tip-pool allocation.

Built in strict compliance with the [`shift-tip-standards`](.agents/skills/shift-tip-standards/SKILL.md) design, technical, and calculation standards.

---

## 🚀 Live Demo & GitHub Pages Ready

- **Pure Static Frontend:** Zero build tools, zero npm packages, zero server backend required.
- **Strict Lowercase Files:** `index.html`, `style.css`, and `app.js` are ready for direct deployment to GitHub Pages.
- **Offline / Local Testing:** Double-click `index.html` to run in any modern web browser or deploy directly to GitHub Pages:
  1. Push this repository to GitHub.
  2. Navigate to **Repository Settings** > **Pages**.
  3. Under **Branch**, select `main` (or `master`) and `/ (root)`.
  4. Save. Your live URL will be active immediately.

---

## ⚡ Core Features

### 1. Pre-loaded Synthetic Restaurant Roster (8 Staff Members)
Realistic hospitality team with standardized **Team Member** and **Manager** roles:
- **Jordan Miller** — Team Member ($13.00/hr, 31.0w / 62.0 bi-weekly hrs)
- **Maya Lin** — Team Member ($13.50/hr, **37.0w / 74.0 bi-weekly hrs**) — *Primed to trigger 3.0h overtime warning on 6.0h shift coverage*
- **Elena Rodriguez** — Team Member ($12.50/hr, 22.0w / 44.0 bi-weekly hrs) — *Safe replacement candidate (stays <= 40h)*
- **Samir Patel** — Team Member ($15.00/hr, 33.0w / 66.0 bi-weekly hrs)
- **Chloe Bennett** — Team Member ($12.00/hr, 18.0w / 36.0 bi-weekly hrs) — *Trainee status; triggers Role Mismatch on independent Team Member coverage*
- **Leo Tanaka** — Team Member ($13.00/hr, 26.0w / 52.0 bi-weekly hrs)
- **Marcus Vance** — Team Member ($18.00/hr, **36.5w / 73.0 bi-weekly hrs**) — *Overtime alert candidate*
- **Rachel Greene** — Manager ($24.00/hr, 35.0w / 70.0 bi-weekly hrs) — *Salaried Manager, FLSA tip exempt*

### 2. Tab 1: Active Shift & Swap Validator
- **Tonight's Floor Roster:** Displays 6 active floor shifts with live weekly hour tracking and bi-weekly hours logged.
- **Coverage Evaluation Engine:** Click **"Request Cover / Swap"** on any active worker to evaluate all available replacement staff:
  - 🟢 **Safe to Approve:** Candidate possesses station certification and stays within 40.0 hours/week.
  - ⚠️ **Overtime Alert:** Candidate possesses certification but shift exceeds 40.0 hours. Automatically calculates exact overtime hours and financial liability at 1.5x hourly rate (showing regular wage, extra overtime premium, and total overtime pay).
  - ⛔ **Role Mismatch:** Candidate lacks the required station certification (e.g., Busser attempting to cover Bartender).
- **One-Click Approval:** Updates tonight's scheduled floor roster and updates weekly & bi-weekly hours logged.

### 3. Tab 2: Bi-Weekly Tip-Pool Optimizer
- **Role Weight Multipliers Removed:** Tips are divided proportionally by bi-weekly hours worked.
- **Deterministic Bi-Weekly Formula:**
  $$\text{Employee Tip Payout} = \text{Total Tip Pool} \times \left( \frac{\text{Employee Bi-Weekly Hours}}{\sum \text{Eligible Staff Bi-Weekly Hours}} \right)$$
- **Scope Toggle:** Switch between:
  - **Tonight's Working Floor Crew** (active shifts from Tab 1)
  - **All Store Employees (8 Staff)** (full store bi-weekly pool distribution)
- **FLSA Labor Compliance Guardrail:** In accordance with federal FLSA regulations (29 U.S.C. § 203(m)(2)(B)), salaried managers are strictly barred from receiving employee tip pool distributions. Rachel Greene's allocation is locked to $0.00 (0.0%), ensuring 100% of tips are distributed among eligible Team Members.
- **Exact Penny Reconciliation:** Largest Remainder Method ensures that the sum of individual team payouts equals the total collected tips to the exact cent ($0.00 remainder variance).
- **Dual Payout Tracking:** Breaks out Cash Take-Home vs Credit Card Tips (for payroll).
- **Inline Bi-Weekly Adjustments:** Adjust any employee's bi-weekly hours directly inside the table to re-balance the pool in real time.

### 4. Verified Shift Slip & Receipt (Print / Download)
- Click **"Print Shift & Tip Slip"** for an authentic print-optimized register slip (`@media print` formatted).
- Includes restaurant header, date, shift lead name, scope, itemized crew payouts with bi-weekly hours, and signature lines for management sign-off.
- Export as downloadable text record or copy summary to clipboard.

### 5. "Try It in 2 Minutes" Sample Scenario
- Click the prominent **"⚡ Try It in 2 Minutes"** button in the header.
- Instantly loads a Friday dinner rush scenario with Jordan Miller needing coverage, highlighting Maya Lin's Overtime Alert vs Elena's Safe Approval, with pre-filled tips ($240 Cash, $860 CC = $1,100 Total Pool) ready in Tab 2.
- **"Reset to Sample Data"** allows quick restoring to defaults at any time.

---

## 🛠️ Tech Stack & Architecture
- **HTML5:** Semantic, accessible layout with live aria status.
- **CSS3:** High-contrast slate and copper hospitality theme, responsive CSS Grid / Flexbox, print stylesheet.
- **JavaScript (ES6):** Deterministic calculations, `localStorage` state management, zero external libraries or APIs.
