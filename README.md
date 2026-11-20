# Shift-Coverage & Tip-Pool Optimizer (v3.0)

A lightweight, zero-dependency browser web application for restaurant shift leads, general managers, and team members. Combines deterministic shift-swap validation with standard straight-time wage policy (zero overtime multipliers), FLSA-compliant bi-weekly tip-pool allocation, and full **role-based access control (Manager vs. Team Member)**.

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

## 👥 Role-Based Access & View Switcher

The application includes prototype role-based demo access with instantaneous switching via the header profile pill or the persistent top demo banner:

### 1. Manager Access (e.g., Rachel Greene — General Manager & Shift Lead)
- **Prototype Demo PIN:** `1234` (pre-filled for prototype testing, clearly labeled as non-production security).
- **Manager Permissions:**
  - Full visibility into shift schedules, weekly/bi-weekly logged hours, and tip allocations.
  - **Manager Approval Queue:** Review pending shift-swap and pickup proposals submitted by team members.
    - Inspect real-time deterministic compliance checks: Station certification match, shift hours, and standard straight-time pay.
    - **One-Click Approve:** Automatically reassigns the shift to the covering employee, updates both workers' weekly and bi-weekly logged hours, clears open status, and writes to the verified audit log.
    - **One-Click Decline:** Declines the proposal with reason logging.
  - **Master Shift Editor:** Edit active shift assignments, roles, time windows, and station notes.
  - **Employee Hours Override:** Adjust weekly and bi-weekly hours directly on the master roster.
  - **Audit Log:** Complete, timestamped audit trail of all management approvals, schedule modifications, and tip adjustments.

### 2. Team Member Access (e.g., Jordan Miller, Maya Lin, Elena Rodriguez, etc.)
- **One-Click Profile Selector:** Choose between 7 pre-configured synthetic frontline staff members.
- **Team Member Permissions:**
  - View the active shift schedule, team members working, and bi-weekly tip distribution breakdowns.
  - **Put Shift "Up for Grabs":** Team members can mark their own assigned shifts as open for pickup (with optional note/reason). Open shifts display a prominent `🏷️ UP FOR GRABS` banner across the floor schedule.
  - **Propose Shift Swaps & Pickups:** Pick any colleague's shift (or an open Up-for-Grabs shift) and submit a coverage proposal with custom notes. Deterministic qualification checks preview automatically before submission.
  - **Daily Cash Tip Logger:** Frontline staff can log their daily cash take-home (service date, station, cash tip amount, and notes). Updates the shift records in local storage and records in the cash tip history.
  - **Manager Control Protection:** Manager-only controls (master schedule editing, direct swap approvals, other staff records) are strictly hidden or disabled.

---

## ⚡ Core Features

### 1. Pre-loaded Synthetic Restaurant Roster (8 Staff Members)
Realistic hospitality team with standardized **Team Member** and **Manager** roles:
- **Jordan Miller** — Team Member ($13.00/hr, 31.0w / 62.0 bi-weekly hrs) — *Shift 1 assigned, marked Up for Grabs*
- **Maya Lin** — Team Member ($13.50/hr, 37.0w / 74.0 bi-weekly hrs) — *Frontline server, standard straight-time rates*
- **Elena Rodriguez** — Team Member ($12.50/hr, 22.0w / 44.0 bi-weekly hrs) — *Qualified replacement candidate*
- **Samir Patel** — Team Member ($15.00/hr, 33.0w / 66.0 bi-weekly hrs)
- **Chloe Bennett** — Team Member ($12.00/hr, 18.0w / 36.0 bi-weekly hrs) — *Trainee status; triggers Role Mismatch on independent Team Member coverage*
- **Leo Tanaka** — Team Member ($13.00/hr, 26.0w / 52.0 bi-weekly hrs)
- **Marcus Vance** — Team Member ($18.00/hr, 36.5w / 73.0 bi-weekly hrs)
- **Rachel Greene** — Manager ($24.00/hr, 35.0w / 70.0 bi-weekly hrs) — *Salaried Manager, FLSA tip exempt*

### 2. Tab 1: Active Shift & Swap Validator
- **Tonight's Floor Roster:** Displays 6 active floor shifts with live weekly hour tracking and bi-weekly hours logged.
- **Coverage Evaluation Engine:** Click **"Evaluate Coverage"** on any active worker to evaluate all available replacement staff:
  - 🟢 **Qualified to Cover:** Candidate possesses required station certification and role qualification. Shift cost calculated at standard straight-time rate (`shift hours × hourly rate`).
  - ⛔ **Role Mismatch:** Candidate lacks the required certification (e.g., Trainee attempting to cover independent shift, or Team Member attempting to cover Manager shift).
- **Direct Approval (Manager) vs. Proposal Submission (Team Member).**

### 3. Tab 2: Bi-Weekly Tip-Pool Optimizer
- **Role Weight Multipliers Removed:** Tips are divided proportionally by bi-weekly hours worked.
- **Deterministic Bi-Weekly Formula:**
  $$\text{Employee Tip Payout} = \text{Total Tip Pool} \times \left( \frac{\text{Employee Bi-Weekly Hours}}{\sum \text{Eligible Staff Bi-Weekly Hours}} \right)$$
- **Scope Toggle:** Switch between:
  - **Tonight's Working Floor Crew** (active shifts from Tab 1)
  - **All Store Employees (8 Staff)** (full store bi-weekly pool distribution)
- **FLSA Labor Compliance Guardrail:** In accordance with federal FLSA regulations (29 U.S.C. § 203(m)(2)(B)), salaried managers are strictly barred from receiving employee tip pool distributions. Rachel Greene's allocation is locked to $0.00 (0.0%).
- **Exact Penny Reconciliation:** Largest Remainder Method ensures that the sum of individual team payouts equals the total collected tips to the exact cent ($0.00 remainder variance).
- **Dual Payout Tracking:** Breaks out Cash Take-Home vs Credit Card Tips (for payroll).

### 4. Tab 3: Role-Specific Workspace
- **Manager Mode:**
  - Manager Approval Queue (review, approve, or decline pending swap proposals).
  - Master Shift Schedule table with shift edit modal.
  - Permanent verified audit log with straight-time hour tracking.
- **Team Member Mode:**
  - My Assigned Shifts list with "Put Up for Grabs" action.
  - Daily Cash Tip Logger with running cash tip history.
  - My Swap & Pickup Proposals status tracking.

### 5. Verified Shift Slip & Receipt (Print / Download)
- Click **"Print Shift & Tip Slip"** for an authentic print-optimized register slip (`@media print` formatted).
- Includes restaurant header, date, shift manager name, scope, itemized crew payouts with bi-weekly hours, standard straight-time wage basis, and signature lines for management sign-off.
- Export as downloadable text record or copy summary to clipboard.

### 6. Prototype Safety & Reset
- Clearly labeled prototype demo using browser `localStorage` and synthetic restaurant data.
- **"Reset Demo Data"** restores all baseline shifts, swap requests, cash tip logs, audit logs, and default manager session in one click.

---

## 🛠️ Tech Stack & Architecture
- **HTML5:** Semantic, accessible layout with live aria status.
- **CSS3:** High-contrast slate and copper hospitality theme, responsive CSS Grid / Flexbox, print stylesheet.
- **JavaScript (ES6):** Deterministic calculations, `localStorage` state management, zero external libraries or APIs.
