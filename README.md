# Shift-Coverage & Tip-Pool Optimizer (v1.0)

A lightweight, zero-dependency browser web application for restaurant shift leads and hospitality managers. Combines deterministic shift-swap validation with 1.5x overtime financial liability alerts and FLSA-compliant weighted tip-pool allocation.

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
Realistic hospitality team covering all major station certifications and pay rates:
- **Jordan Miller** — Server ($12.00/hr, 31.0 hrs logged)
- **Maya Lin** — Server ($12.50/hr, **37.0 hrs logged**) — *Primed to trigger 3.0h overtime warning on 6.0h shift coverage*
- **Elena Rodriguez** — Server ($11.50/hr, 22.0 hrs logged) — *Safe replacement candidate (stays <= 40h)*
- **Samir Patel** — Bartender ($15.00/hr, 33.0 hrs logged)
- **Chloe Bennett** — Bartender ($14.50/hr, 18.0 hrs logged) — *Station mismatch if attempting to cover Server or Line Cook*
- **Leo Tanaka** — Busser ($13.00/hr, 26.0 hrs logged)
- **Marcus Vance** — Line Cook ($19.00/hr, **36.5 hrs logged**) — *Kitchen overtime alert candidate*
- **Rachel Greene** — Shift Lead ($22.00/hr, 35.0 hrs logged) — *Salaried lead, FLSA tip exempt*

### 2. Tab 1: Active Shift & Swap Validator
- **Tonight's Floor Roster:** Displays 6 active floor shifts with live weekly hour tracking.
- **Coverage Evaluation Engine:** Click **"Request Cover / Swap"** on any active worker to evaluate all available replacement staff:
  - 🟢 **Safe to Approve:** Candidate possesses station certification and stays within 40.0 hours/week.
  - ⚠️ **Overtime Alert:** Candidate possesses certification but shift exceeds 40.0 hours. Automatically calculates exact overtime hours and financial liability at 1.5x hourly rate (showing both regular wage, extra overtime premium, and total overtime pay).
  - ⛔ **Role Mismatch:** Candidate lacks the required station certification (e.g., Busser attempting to cover Bartender).
- **One-Click Approval:** Updates tonight's scheduled floor roster and updates weekly hours logged.

### 3. Tab 2: End-of-Night Tip-Pool Split
- **Real-Time Sync:** Automatically pulls tonight's active floor staff and hours from Tab 1.
- **Deterministic Tip Formula:**
  $$\text{Employee Tip Payout} = \text{Total Tip Pool} \times \left( \frac{\text{Hours Worked} \times \text{Role Weight}}{\sum (\text{Staff Weighted Hours})} \right)$$
- **Role Multipliers:** Bartender (1.2x), Server (1.0x), Busser (0.6x), Line Cook (0.0x), Shift Lead (0.0x FLSA locked).
- **FLSA Labor Compliance Guardrail:** In accordance with federal FLSA regulations (29 U.S.C. § 203(m)(2)(B)), managers and shift leads are strictly barred from receiving employee tip pool distributions.
- **Exact Penny Reconciliation:** Largest remainder rounding method ensures that the sum of individual team payouts equals the total collected tips to the exact cent ($0.00 remainder variance).
- **Dual Payout Tracking:** Breaks out Cash Take-Home vs Credit Card Tips (for payroll).

### 4. Verified Shift Slip & Receipt (Print / Download)
- Click **"Print Shift & Tip Slip"** for an authentic print-optimized register slip (`@media print` formatted).
- Includes restaurant header, date, shift lead name, total tips collected, itemized crew payouts, and signature lines for management sign-off.
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
