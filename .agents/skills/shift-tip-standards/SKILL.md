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
- Never use approximations or hard coded outputs. All wage, shift coverage, and tip-pool calculations must run live in JavaScript.
- **Wage Policy (Standard Straight-Time Only):** Standard straight-time hourly rates apply to all hours worked (zero 1.5x overtime rate adjustments, zero overtime financial liability formulas, and zero >40h threshold warnings). Calculate all worker hours, shift pay, and tip-pool shares strictly using standard straight-time hours and base role rates.
- **Qualification Rule:** Validate that the covering worker has the required role certification (standardized to **Team Member** and **Manager**) to prevent unauthorized role coverage.
- **Tip Pool Formula (Bi-Weekly Hours Basis):** Divide collected tip receipts between eligible Team Members in direct proportion to bi-weekly hours worked (role weight multipliers removed):
  `Employee Tip Payout = Total Tip Pool × (Employee Bi-Weekly Hours ÷ Sum of Eligible Staff Bi-Weekly Hours)`
- Ensure the sum of individual payouts reconciles to the exact cent with the total tip pool (using Largest Remainder Method for $0.00 penny variance).
- Exclude salaried Managers from receiving tip-pool payouts in strict compliance with federal FLSA Section 3(m)(2)(B) (29 U.S.C. § 203(m)(2)(B)).

## 3. UI & Accessibility Standards
- Mobile-first responsive layout (must work cleanly on both a phone screen and a laptop browser without horizontal scrolling).
- High contrast, clean hospitality dashboard aesthetic with clear status badges (`Qualified to Cover`, `Role Mismatch`, `Up for Grabs`).
- Include a clean **"Print / Export Shift & Tip Slip"** view so shift leads can share verified results without manual PDF errors.

## 4. Role-Based Permissions & Prototype Workspace Rules
- Include a prototype role-based sign-in and view switcher (`Manager` vs `Team Member`) with quick-switch toggling in the header and demo banner.
- **Team Member Permissions:** View schedule and tip breakdown, put assigned shifts "Up for Grabs", submit shift pickup/swap proposals (routed to manager queue), and log daily cash tips to shift records. Manager-only controls (master schedule editing, direct swap approvals, other staff records) are strictly hidden or disabled.
- **Manager Permissions:** Full access plus Manager Queue & Controls (approve/decline pending requests with automated schedule updates), master shift schedule editing, employee hours override, and verified audit logging.
- Maintain 100% in-browser `localStorage` persistence with no real credentials or external backends, backed by a prominent **"Reset Demo Data"** action.
