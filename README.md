# Service Ledger — Shift & Tip Optimizer (v1.0)

A modern, hospitality-first web application for restaurant shift leads, managers, and staff. Built with the **Juniper Kitchen / Service Ledger** design system: deep forest green (`#143C33`), warm peach accents (`#F59A65`), PIN-based multi-role authentication, and role-adaptive perspectives for employees and managers.

Built in strict compliance with the [`shift-tip-standards`](.agents/skills/shift-tip-standards/SKILL.md) design, technical, and calculation standards.

---

## 👥 1. Employee vs. Manager Perspectives

### 🍽️ The Employee Perspective
Employees sign in with their unique 4-digit PIN (e.g., Jordan Ellis: `2222`, Joseph: `6666`, Maya Chen: `1111`) to access a dedicated, streamlined interface:
- **Tailored Navigation:** Only shows **Overview**, **Shift board**, **Cash tips**, and **My requests**.
- **Overview Dashboard:**
  - Hero card: *"Pick up open shifts, request coverage, and record your pooled cash tips."* with **[📅 Browse open shifts]** button.
  - 4 employee KPIs: *Claimable shifts*, *My assigned shifts*, *My open requests*, and *My pooled cash tips*.
  - **Your Profile Card:** Shows the logged-in team member's verified certifications and **[💵 Log cash tips]** action.
- **Shift Board (Master Schedule):**
  - Filter dropdown: `All shifts`, `My shifts`, and `Claimable shifts`.
  - **Pick Up Open Shifts:** Employees can click **"Claim"** on any open or up-for-grabs shift that matches their certifications.
  - **Offer for Coverage:** Employees can mark their own shift as *"Up for Grabs"*.
  - **Propose Shift Swap:** Employees can click **"Propose swap"** to select a certified colleague and submit a direct trade proposal with an optional note for the manager.
  - **Withdraw Offer:** Employees can withdraw their coverage offer anytime before approval.
- **My Requests:**
  - Tracks all pending claims and trade proposals with live status: `Awaiting manager review`.
  - Allows withdrawing pending requests before review.

### 🛡️ Manager Authorization Guardrail
- When an employee claims a shift or proposes a swap, the change **does not automatically take effect**.
- The request immediately flows into the Manager's **Approvals Queue** (`Awaiting manager review`).
- Once a Manager logs in (e.g., Ava Morgan: `5678` or Paul Parajuli: `1234`), they review and click **"✓ Authorize"** or **"Dismiss"**.
- Upon authorization, the shift schedule updates, logged weekly hours reconcile, and the tip pool recalculates down to the exact cent.

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
