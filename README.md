# Restraunt Toolbox — Shift & Tip Optimizer (v2.0)

A modern, hospitality-first web application for restaurant shift leads, managers, and staff. Built with the **Juniper Kitchen / Restraunt Toolbox** design system: deep forest green (`#143C33`), warm peach accents (`#F59A65`), PIN-based multi-role authentication, **Manager-Only Schedule Builder (Bi-Weekly & Monthly Generator)**, and role-adaptive perspectives for employees and managers.

Built in strict compliance with the [`shift-tip-standards`](.agents/skills/shift-tip-standards/SKILL.md) design, technical, and calculation standards.

---

## 👥 1. Employee vs. Manager Perspectives

### 🍽️ The Employee Perspective
Employees sign in with their unique 4-digit PIN (e.g., Jordan Ellis: `2222`, Joseph: `6666`, Maya Chen: `1111`) to access a dedicated, streamlined interface:
- **Tailored Navigation:** Shows **Overview**, **Shift board**, **Cash tips**, **My requests**, and **Audit log**.
- **Overview Dashboard:**
  - Hero card: *"Pick up open shifts, request coverage, and record your pooled cash tips."* with **[📅 Browse open shifts]** button.
  - 4 employee KPIs: *Claimable shifts*, *My assigned shifts*, *My open requests*, and *My pooled cash tips*.
  - **Your Profile Card:** Shows the logged-in team member's verified certifications and **[💵 Cash tips]** action.
- **Master Schedule View (Read-Only Schedule):**
  - Toggle between **Bi-Weekly (14 Days)** and **Monthly (30 Days)** view ranges.
  - Filter chips: `All Shifts`, `My Shifts`, `Up for Grabs / Open`, and `Covered / Swapped`.
  - Date filter dropdown to inspect specific days or view all days.
  - **Pick Up Open Shifts:** Employees can click **"Claim"** on any open or up-for-grabs shift that matches their certifications.
  - **Offer for Coverage:** Employees can mark their own shift as *"Up for Grabs"*.
  - **Propose Shift Swap:** Employees can click **"Propose swap"** to select a certified colleague and submit a direct trade proposal with an optional note for the manager.
  - **Withdraw Offer:** Employees can withdraw their coverage offer anytime before approval.
- **My Requests:**
  - Tracks all pending claims and trade proposals with live status: `Awaiting manager review`.
  - Allows withdrawing pending requests before review.
- **Employee Audit Log & Notification Feed:**
  - Dedicated personal audit log tab in the employee navigation.
  - Displays instant notifications for the 4 core shift events:
    1. **Manager Approvals:** When a manager authorizes a shift claim, coverage request, or swap proposal.
    2. **Coverage Requests Submitted:** When an employee submits an offer to cover a colleague's shift placed Up for Grabs.
    3. **Swap Proposals Submitted:** When an employee submits a trade proposal to swap shifts with a coworker.
    4. **Open Shift Claims Accepted / Approved:** When a manager accepts and officially assigns an open shift to the employee.
  - Shows clear status pills (`APPROVED`, `SUBMITTED`, `POSTED`, `DECLINED`) and summary metric cards (*Approved Requests*, *Submitted & Pending*, *Active Notification Sync*).
  - Strict privacy guardrail: Employees only see their own personal logs and notifications (coworkers' activity and manager compliance cards remain completely hidden).
- **Personal Cash Tips & Payout Privacy:**
  - **Restricted Manager Panels:** "Enter Shift Tip Receipts" and "Role Weight Multipliers" are strictly hidden from employees.
  - **Privacy-Guarded Breakdown:** Non-manager employees see only their personal earnings breakdown (hours, role, cash share, payroll credit card share, and total payout). Coworkers' names, hours, and tip amounts are completely hidden.

### 💼 The Manager Perspective & Schedule Builder
Managers sign in with manager credentials (e.g., Ava Morgan: `5678` or Paul Parajuli: `1234`) to access management controls:
- **Manager-Only Schedule Builder:**
  - **Period Selection:** Choose **"Bi-Weekly (14 Days)"** or **"Monthly (30 Days)"** with custom start date picker.
  - **Starter Template Auto-Population:** One-click generation of balanced restaurant shifts (Dinner service, Lunch turnover, Bar close, Kitchen prep, Floor lead) across qualified staff with sample open and up-for-grabs shifts.
  - **Manual Shift Creation & Editing:** Add custom shifts with specific date, service name, station role, hours, assigned staff member, and notes. Edit or delete existing shifts.
  - **Single Source of Truth:** All shifts save directly into the unified schedule array in local browser storage, syncing immediately with the swap queue and tip pool.
- **Manager Approvals Queue & Live Overtime Projection:**
  - **Individual Scheduled Hours Visibility:** For every pending shift claim or swap proposal, the manager can see the exact currently scheduled work hours for each user involved (claimant, releasing staff, and swap partner).
  - **Live Overtime Impact Analysis:** Calculates what approving the request would do to each user's scheduled weekly hours. Shows projected weekly totals and overtime alerts whenever hours exceed weekly FLSA limits (40.0h Full-Time / 32.0h Part-Time).
  - **One-Click Authorization with Overtime Warnings:** Prominently flags overtime risk (`⚠️ Overtime Alert: +X.X hrs Overtime at 1.5x pay`) so managers avoid accidental overtime expenses before authorizing shift changes.
- **Master Schedule — Team Scheduled Hours & Overtime Prevention:**
  - **Team Work Hours & Overtime Watch Panel:** Positioned at the top of the Master Schedule for managers, displaying live scheduled hours, shift counts, threshold progress bars, and remaining buffers for all 8 team members.
  - **In-Table Scheduled Hours Badges:** Each assigned shift row in the schedule table displays the employee's current weekly work hours and overtime status (e.g. `⏱️ 36.0h scheduled • 4.0h buffer` or `⏱️ 42.0h scheduled • ⚠️ +2.0h Overtime`).
  - **Interactive Staff Filter & Overtime Risk Chip:** Click any employee's tracker card or the `⚠️ Overtime Risk` filter chip to isolate relevant shifts instantly.
- **Coverage Validation Engine:**
  - Click **"Validate"** on any scheduled shift to evaluate off-duty employees against station certifications and straight-time wage policies.
- **Bi-Weekly Tip-Pool Allocation Engine:**
  - Full receipt entry (Cash Tips and Credit Card Tips).
  - Role weight multipliers with sliders and standards reset.
  - Deterministic mathematical formula breakdown and penny reconciliation badge ($0.00 variance).
  - Complete working crew payout breakdown table and master shift receipt slip generation.
- **Audit Log & Labor Compliance:**
  - Verified audit trail logging all schedule publications, approved shift coverage transfers, and wage policy checks.

---

## 🛡️ 2. Role-Based Visibility & Access Control Guardrails

Restraunt Toolbox enforces strict client-side role-based access control and coworker privacy:

1. **Hidden Shift Tip Receipts:** Non-manager employees cannot view or edit Cash Tips, Credit Card Tips, or receipt totals on the Shift Board or Tip Pool page.
2. **Hidden Role Weight Multipliers:** Non-manager employees cannot view, adjust, or reset role weights. The calculation engine applies saved weights from `localStorage` seamlessly in the background.
3. **Hidden Coverage Validation Engine:** The Deterministic Validation Engine on the Master Schedule and Tip Pool formula strip are hidden from employees. Only managers can evaluate replacement candidates or inspect internal diagnostics.
4. **Coworker Privacy in Tip Breakdowns:** Employees only see their own individual payout row and summary (hours, role, cash share, CC payroll share, total tip payout). Coworker names, hours, and tip shares are never rendered in the employee DOM.
5. **State Guardrails:** Action handlers (tip inputs, slider inputs, weight reset, shift validation, shift edit, delete, and reassignment) verify `isManagerUser()` before making any state mutations.

---

## ⚡ 3. Real-Time Sync & Calculation Model

- **Standard Straight-Time Wage Policy:** Straight-time hourly rates apply to all shift hours (zero 1.5x overtime rate adjustments or threshold penalties).
- **Tip Pool Split Sync:** Tip-pool shares dynamically pull employee hours worked from the unified schedule. Reassigning a shift via swap authorization immediately recalculates team members' hours and tip distributions down to the exact penny ($0.00 remainder variance via the Largest Remainder Method).
- **FLSA Exclusions:** Salaried managers and shift leads are strictly excluded from tip-pool payouts under 29 U.S.C. § 203(m)(2)(B).

---

## 🔐 4. PIN-Based Multi-Role Authentication

- **Full-height Deep Forest Green Screen (`#143C33`):**
  - 72px apricot squircle logo (`#F59A65`) above the "Restraunt Toolbox" heading.
  - Masked four-digit PIN input with automatic user and role recognition.
  - Quick-fill demo login chips:
    - 👤 **Employee:** `2222` (*Jordan Ellis — JE*)
    - 👤 **Employee:** `6666` (*Joseph — JO*)
    - 💼 **Manager:** `5678` (*Ava Morgan — AM*)
    - 👑 **Admin:** `1234` (*Paul Parajuli — PP*)
  - **"Reset sample data"** button in top bar restores clean default synthetic restaurant data.

---

## 🚀 5. GitHub Pages Deployment

1. Push this repository to GitHub.
2. In GitHub, go to **Settings** > **Pages**.
3. Under **Branch**, select `main` (or `master`) and `/ (root)`.
4. Click **Save**. Your site will be live within seconds.
