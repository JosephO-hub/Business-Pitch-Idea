# Service Ledger — Shift & Tip Optimizer (v2.0)

A modern, hospitality-first web application for restaurant shift leads, managers, and staff. Built with the **Juniper Kitchen / Service Ledger** design system: deep forest green (`#143C33`), warm peach accents (`#F59A65`), PIN-based multi-role authentication, **Manager-Only Schedule Builder (Bi-Weekly & Monthly Generator)**, and role-adaptive perspectives for employees and managers.

Built in strict compliance with the [`shift-tip-standards`](.agents/skills/shift-tip-standards/SKILL.md) design, technical, and calculation standards.

---

## 👥 1. Employee vs. Manager Perspectives

### 🍽️ The Employee Perspective
Employees sign in with their unique 4-digit PIN (e.g., Jordan Ellis: `2222`, Joseph: `6666`, Maya Chen: `1111`) to access a dedicated, streamlined interface:
- **Tailored Navigation:** Shows **Overview**, **Shift board**, **Cash tips**, and **My requests**.
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

### 💼 The Manager Perspective & Schedule Builder
Managers sign in with manager credentials (e.g., Ava Morgan: `5678` or Paul Parajuli: `1234`) to access management controls:
- **Manager-Only Schedule Builder:**
  - **Period Selection:** Choose **"Bi-Weekly (14 Days)"** or **"Monthly (30 Days)"** with custom start date picker.
  - **Starter Template Auto-Population:** One-click generation of balanced restaurant shifts (Dinner service, Lunch turnover, Bar close, Kitchen prep, Floor lead) across qualified staff with sample open and up-for-grabs shifts.
  - **Manual Shift Creation & Editing:** Add custom shifts with specific date, service name, station role, hours, assigned staff member, and notes. Edit or delete existing shifts.
  - **Single Source of Truth:** All shifts save directly into the unified schedule array in local browser storage, syncing immediately with the swap queue and tip pool.
- **Manager Approvals Queue:**
  - Review submitted claims and swap proposals.
  - Click **"Authorize"** or **"Dismiss"**.
  - Upon authorization:
    - Automatically updates the assigned worker in the master schedule.
    - Decorates the shift with a subtle `🔄 Covered / Swapped` status badge.
    - Permanently records the authorization in the verified audit log.
    - Instantly recalculates shift hours and tip-pool shares to the exact cent.
- **Coverage Validation Engine:**
  - Click **"Validate"** on any scheduled shift to evaluate off-duty employees against station certifications and straight-time wage policies.
- **Audit Log & Labor Compliance:**
  - Verified audit trail logging all schedule publications, approved shift coverage transfers, and wage policy checks.

---

## ⚡ 2. Real-Time Sync & Calculation Model

- **Standard Straight-Time Wage Policy:** Straight-time hourly rates apply to all shift hours (zero 1.5x overtime rate adjustments or threshold penalties).
- **Tip Pool Split Sync:** Tip-pool shares dynamically pull employee hours worked from the unified schedule. Reassigning a shift via swap authorization immediately recalculates team members' hours and tip distributions down to the exact penny ($0.00 remainder variance via the Largest Remainder Method).
- **FLSA Exclusions:** Salaried managers and shift leads are strictly excluded from tip-pool payouts under 29 U.S.C. § 203(m)(2)(B).

---

## 🔐 3. PIN-Based Multi-Role Authentication

- **Full-height Deep Forest Green Screen (`#143C33`):**
  - 72px apricot squircle logo (`#F59A65`) above the "Service Ledger" heading.
  - Masked four-digit PIN input with automatic user and role recognition.
  - Quick-fill demo login chips:
    - 👤 **Employee:** `2222` (*Jordan Ellis — JE*)
    - 👤 **Employee:** `6666` (*Joseph — JO*)
    - 💼 **Manager:** `5678` (*Ava Morgan — AM*)
    - 👑 **Admin:** `1234` (*Paul Parajuli — PP*)
  - **"Reset sample data"** button in top bar restores clean default synthetic restaurant data.

---

## 🚀 4. GitHub Pages Deployment

1. Push this repository to GitHub.
2. In GitHub, go to **Settings** > **Pages**.
3. Under **Branch**, select `main` (or `master`) and `/ (root)`.
4. Click **Save**. Your site will be live within seconds.

---

## 🔐 2. PIN-Based Multi-Role Authentication

- **Full-height Deep Forest Green Screen (`#143C33`):**
  - 72px apricot fork-and-receipt squircle logo (`#F59A65`) above the "Service Ledger" heading.
  - Masked four-digit PIN input with automatic user and role recognition.
  - Green **"Sign in"** button.
  - Quick-fill demo login chips:
    - 👤 **Employee:** `2222` (*Jordan Ellis — JE*)
    - 👤 **Employee:** `6666` (*Joseph — JO*)
    - 💼 **Manager:** `5678` (*Ava Morgan — AM*)
    - 👑 **Admin:** `1234` (*Paul Parajuli — PP*)
  - **"Sign out"** button in top bar securely locks the workspace.

---

## 🚀 GitHub Pages Deployment

1. Push this repository to GitHub.
2. In GitHub, go to **Settings** > **Pages**.
3. Under **Branch**, select `main` (or `master`) and `/ (root)`.
4. Click **Save**. Your site will be live within seconds.
