---
name: shift-tip-standards
description: Design, technical, and calculation standards for the Shift Coverage and Tip Pool Optimizer web application.
---

# Shift Coverage and Tip Pool Optimizer Standards

## 1. Architecture & Hosting Rules (GitHub Pages)
- Build purely with vanilla HTML5, CSS3, and JavaScript (no build steps, no Node/React compilation, no backend servers, no external API keys).
- Keep all file names strictly lowercase (`index.html`, `style.css`, `app.js`) to prevent case-sensitivity issues on GitHub Pages.
- Persist user edits in browser `localStorage` with a prominent **"Reset to Sample Restaurant Data"** button so first time testers can experiment safely.

## 2. Deterministic Math & Compliance Guardrails
- Never use approximations or hard coded outputs. All overtime and tip-pool calculations must run live in JavaScript.
- **Overtime Rule:** Flag any shift assignment or swap that pushes an employee above **40.0 hours/week** (Red Warning) and display the exact overtime cost impact at 1.5x hourly rate.
- **Qualification Rule:** Block or flag swaps if the covering worker lacks the required role certification (standardized to **Team Member** and **Manager**).
- **Tip Pool Formula (Bi-Weekly Hours Basis):** Divide collected tip receipts between eligible Team Members in direct proportion to bi-weekly hours worked (role weight multipliers removed):
  `Employee Tip Payout = Total Tip Pool × (Employee Bi-Weekly Hours ÷ Sum of Eligible Staff Bi-Weekly Hours)`
- Ensure the sum of individual payouts reconciles to the exact cent with the total tip pool (using Largest Remainder Method for $0.00 penny variance).
- Exclude salaried Managers from receiving tip-pool payouts in strict compliance with federal FLSA Section 3(m)(2)(B) (29 U.S.C. § 203(m)(2)(B)).

## 3. UI & Accessibility Standards
- Mobile-first responsive layout (must work cleanly on both a phone screen and a laptop browser without horizontal scrolling).
- High contrast, clean hospitality dashboard aesthetic with clear status badges (`Safe to Approve`, `Overtime Warning`, `Role Mismatch`).
- Include a clean **"Print / Export Shift & Tip Slip"** view so shift leads can share verified results without manual PDF errors.
