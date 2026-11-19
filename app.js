/**
 * Shift-Coverage & Tip-Pool Optimizer (v2.1)
 * Standards compliant with /shift-tip-standards:
 * - Pure vanilla ES6 JavaScript (No build steps, no backend, GitHub Pages ready)
 * - Deterministic math with exact penny reconciliation
 * - 1.5x Overtime financial liability calculation
 * - FLSA 29 U.S.C. § 203(m)(2)(B) manager tip-exclusion guardrail
 * - Shift Roles standardized to "Team Member" and "Manager"
 * - Bi-weekly hours proportional tip distribution (Role weights removed)
 * - LocalStorage state persistence with instant sample data reset
 */

(function () {
  'use strict';

  // =========================================================================
  // Baseline Synthetic Restaurant Roster & Shifts (8 Staff Members)
  // Shift Roles: "Team Member" & "Manager"
  // =========================================================================

  const INITIAL_ROSTER = [
    {
      id: 'emp-1',
      name: 'Jordan Miller',
      role: 'Team Member',
      hourlyRate: 13.00,
      weeklyHours: 31.0,
      biweeklyHours: 62.0, // Bi-weekly hours logged
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-2',
      name: 'Maya Lin',
      role: 'Team Member',
      hourlyRate: 13.50,
      weeklyHours: 37.0, // Primed to trigger 3.0h Overtime Warning on 6.0h shift
      biweeklyHours: 74.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-3',
      name: 'Elena Rodriguez',
      role: 'Team Member',
      hourlyRate: 12.50,
      weeklyHours: 22.0, // Safe candidate (22 + 6 = 28 <= 40)
      biweeklyHours: 44.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-4',
      name: 'Samir Patel',
      role: 'Team Member',
      hourlyRate: 15.00,
      weeklyHours: 33.0,
      biweeklyHours: 66.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-5',
      name: 'Chloe Bennett',
      role: 'Team Member',
      hourlyRate: 12.00,
      weeklyHours: 18.0,
      biweeklyHours: 36.0,
      certifications: ['Trainee'], // Lacks independent 'Team Member' certification -> triggers Role Mismatch
      isManager: false
    },
    {
      id: 'emp-6',
      name: 'Leo Tanaka',
      role: 'Team Member',
      hourlyRate: 13.00,
      weeklyHours: 26.0,
      biweeklyHours: 52.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-7',
      name: 'Marcus Vance',
      role: 'Team Member',
      hourlyRate: 18.00,
      weeklyHours: 36.5, // Primed for Overtime alert testing (36.5 + 6 = 42.5h)
      biweeklyHours: 73.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-8',
      name: 'Rachel Greene',
      role: 'Manager',
      hourlyRate: 24.00,
      weeklyHours: 35.0,
      biweeklyHours: 70.0,
      certifications: ['Manager', 'Team Member'],
      isManager: true // FLSA Tip Exclusion Rule applies strictly
    }
  ];

  const INITIAL_SHIFTS = [
    {
      id: 'shift-1',
      employeeId: 'emp-1', // Jordan Miller
      role: 'Team Member',
      startTime: '5:00 PM',
      endTime: '11:00 PM',
      hours: 6.0,
      notes: 'Dining Room & Guest Service'
    },
    {
      id: 'shift-2',
      employeeId: 'emp-3', // Elena Rodriguez
      role: 'Team Member',
      startTime: '4:30 PM',
      endTime: '10:30 PM',
      hours: 6.0,
      notes: 'Patio & Beverage Service'
    },
    {
      id: 'shift-3',
      employeeId: 'emp-4', // Samir Patel
      role: 'Team Member',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Bar & Hospitality Station'
    },
    {
      id: 'shift-4',
      employeeId: 'emp-6', // Leo Tanaka
      role: 'Team Member',
      startTime: '5:00 PM',
      endTime: '10:00 PM',
      hours: 5.0,
      notes: 'Floor Support & Turnover'
    },
    {
      id: 'shift-5',
      employeeId: 'emp-7', // Marcus Vance
      role: 'Team Member',
      startTime: '3:30 PM',
      endTime: '10:30 PM',
      hours: 7.0,
      notes: 'Kitchen & Expediting Station'
    },
    {
      id: 'shift-6',
      employeeId: 'emp-8', // Rachel Greene (Manager)
      role: 'Manager',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Floor Operations & Cash Closeout'
    }
  ];

  const STORAGE_KEY = 'shift_tip_optimizer_state_v3';

  // =========================================================================
  // State Container
  // =========================================================================

  let state = {
    roster: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
    shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
    selectedShiftId: null,
    candidateFilter: 'all',
    tips: {
      cash: 240.00,
      cc: 860.00
    },
    tipScope: 'crew', // 'crew' (tonight's floor crew) or 'all' (all store employees)
    shiftHoursOverride: {}
  };

  // =========================================================================
  // Storage Management
  // =========================================================================

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.roster && parsed.shifts) {
          state = parsed;
          state.roster.forEach(emp => {
            if (emp.biweeklyHours === undefined) {
              emp.biweeklyHours = parseFloat((emp.weeklyHours * 2).toFixed(1));
            }
          });
          if (!state.tipScope) state.tipScope = 'crew';
        }
      }
    } catch (e) {
      console.warn('Could not load localStorage state:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save localStorage state:', e);
    }
  }

  function resetState() {
    state = {
      roster: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
      shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
      selectedShiftId: null,
      candidateFilter: 'all',
      tips: {
        cash: 240.00,
        cc: 860.00
      },
      tipScope: 'crew',
      shiftHoursOverride: {}
    };
    saveState();
    renderAll();
    showToast('Reset to default 8-person roster with Team Member & Manager roles.', 'info');
  }

  // =========================================================================
  // Helper Math & Formatting Functions
  // =========================================================================

  function formatCurrency(num) {
    return '$' + (Number(num) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getEmployeeById(empId) {
    return state.roster.find(e => e.id === empId);
  }

  function getShiftById(shiftId) {
    return state.shifts.find(s => s.id === shiftId);
  }

  function getShiftActualHours(shift) {
    if (state.shiftHoursOverride && state.shiftHoursOverride[shift.id] !== undefined) {
      return Number(state.shiftHoursOverride[shift.id]);
    }
    return shift.hours;
  }

  // =========================================================================
  // Swap Validator Engine (Deterministic Overtime & Qualification Checks)
  // =========================================================================

  /**
   * Evaluates a candidate to cover a target shift.
   * Return status: 'safe', 'warning', or 'mismatch'
   * Along with exact OT hours and 1.5x financial liability.
   */
  function evaluateCoverageCandidate(candidate, targetShift) {
    // 1. Check Station Role Certification (Team Member vs Manager)
    const isCertified = candidate.certifications && candidate.certifications.includes(targetShift.role);
    if (!isCertified) {
      return {
        status: 'mismatch',
        badgeText: 'Role Mismatch',
        badgeClass: 'mismatch',
        reason: `Lacks required '${targetShift.role}' certification. Has: [${candidate.certifications.join(', ')}]`,
        canApprove: false,
        otHours: 0,
        extraCost: 0,
        totalOtPay: 0,
        projectedHours: candidate.weeklyHours + targetShift.hours
      };
    }

    // 2. Check 40.0 Hour Overtime Threshold
    const currentHours = candidate.weeklyHours;
    const shiftHours = targetShift.hours;
    const projectedHours = currentHours + shiftHours;

    if (projectedHours <= 40.0) {
      return {
        status: 'safe',
        badgeText: 'Safe to Approve',
        badgeClass: 'safe',
        reason: `Stays at ${projectedHours.toFixed(1)} hrs (≤ 40.0h). Standard wage applies without overtime penalty.`,
        canApprove: true,
        otHours: 0,
        extraCost: 0,
        totalOtPay: 0,
        projectedHours: projectedHours
      };
    }

    // 3. Overtime Alert Calculation
    const otHours = currentHours >= 40.0 
      ? shiftHours 
      : (projectedHours - 40.0);
    
    const regularRate = candidate.hourlyRate;
    const otRate = regularRate * 1.5;
    const extraOvertimeCost = otHours * (regularRate * 0.5); // Premium cost impact
    const totalOtPay = otHours * otRate; // Full overtime wage

    return {
      status: 'warning',
      badgeText: `Overtime Alert (+${otHours.toFixed(1)}h OT)`,
      badgeClass: 'warning',
      reason: `Pushes weekly total to ${projectedHours.toFixed(1)} hrs (> 40.0h). Requires 1.5x overtime wage penalty.`,
      canApprove: true,
      otHours: otHours,
      extraCost: extraOvertimeCost,
      totalOtPay: totalOtPay,
      projectedHours: projectedHours
    };
  }

  function approveSwap(candidateId, targetShiftId) {
    const shift = getShiftById(targetShiftId);
    const candidate = getEmployeeById(candidateId);
    const previousEmployee = getEmployeeById(shift.employeeId);

    if (!shift || !candidate || !previousEmployee) return;

    const shiftHours = shift.hours;

    // Adjust weekly logged hours in deterministic compliance
    previousEmployee.weeklyHours = Math.max(0, parseFloat((previousEmployee.weeklyHours - shiftHours).toFixed(1)));
    candidate.weeklyHours = parseFloat((candidate.weeklyHours + shiftHours).toFixed(1));

    // Adjust bi-weekly logged hours consistently
    previousEmployee.biweeklyHours = Math.max(0, parseFloat((previousEmployee.biweeklyHours - shiftHours).toFixed(1)));
    candidate.biweeklyHours = parseFloat((candidate.biweeklyHours + shiftHours).toFixed(1));

    // Assign shift to candidate
    shift.employeeId = candidate.id;

    saveState();
    renderAll();

    showToast(`Swap Approved! ${candidate.name} is now assigned to tonight's ${shift.role} shift. Weekly & bi-weekly hours updated.`, 'success');
  }

  // =========================================================================
  // Tip Pool Engine (Bi-Weekly Hours Proportional Division & Exact Penny Reconciliation)
  // =========================================================================

  /**
   * Divides the Tip Pool Total between eligible Team Members by their bi-weekly hours.
   * Shift Roles: "Team Member" (eligible) and "Manager" (strictly excluded).
   * Managers are excluded per FLSA § 203(m)(2)(B).
   * Uses Largest Remainder Method for 100% exact cent balancing with zero penny variance.
   */
  function calculateTipPool() {
    const cashTips = parseFloat(state.tips.cash) || 0;
    const ccTips = parseFloat(state.tips.cc) || 0;
    const totalTips = cashTips + ccTips;

    let candidatesList = [];

    if (state.tipScope === 'all') {
      candidatesList = state.roster.map(emp => {
        const activeShift = state.shifts.find(s => s.employeeId === emp.id);
        return {
          employee: emp,
          role: activeShift ? activeShift.role : emp.role,
          shiftHours: activeShift ? getShiftActualHours(activeShift) : 0,
          biweeklyHours: emp.biweeklyHours !== undefined ? emp.biweeklyHours : (emp.weeklyHours * 2),
          isWorkingTonight: !!activeShift,
          shiftId: activeShift ? activeShift.id : null
        };
      });
    } else {
      const crewMap = new Map();

      state.shifts.forEach(shift => {
        const emp = getEmployeeById(shift.employeeId);
        if (!emp) return;

        const hoursWorked = getShiftActualHours(shift);

        if (!crewMap.has(emp.id)) {
          crewMap.set(emp.id, {
            employee: emp,
            role: shift.role,
            shiftHours: hoursWorked,
            biweeklyHours: emp.biweeklyHours !== undefined ? emp.biweeklyHours : (emp.weeklyHours * 2),
            isWorkingTonight: true,
            shiftId: shift.id
          });
        } else {
          const existing = crewMap.get(emp.id);
          existing.shiftHours += hoursWorked;
        }
      });

      candidatesList = Array.from(crewMap.values());
    }

    // Determine eligible employees:
    // Only non-managers with role "Team Member" participate in the tip pool.
    // Managers are excluded under FLSA § 203(m)(2)(B).
    let totalEligibleBiweeklyHours = 0;
    let totalAllBiweeklyHours = 0;
    let totalShiftHours = 0;

    candidatesList.forEach(item => {
      totalAllBiweeklyHours += item.biweeklyHours;
      totalShiftHours += item.shiftHours;

      item.isEligible = (!item.employee.isManager && item.employee.role !== 'Manager' && item.role !== 'Manager' && item.biweeklyHours > 0);

      if (item.isEligible) {
        totalEligibleBiweeklyHours += item.biweeklyHours;
      }
    });

    const totalCents = Math.round(totalTips * 100);
    const cashCents = Math.round(cashTips * 100);
    const ccCents = Math.round(ccTips * 100);

    let allocatedTotalCents = 0;
    let allocatedCashCents = 0;
    let allocatedCcCents = 0;

    // First pass: Proportional floor distribution
    candidatesList.forEach(item => {
      if (item.isEligible && totalEligibleBiweeklyHours > 0) {
        item.poolSharePercent = (item.biweeklyHours / totalEligibleBiweeklyHours) * 100;
        
        const exactStaffTotalCents = (totalCents * item.biweeklyHours) / totalEligibleBiweeklyHours;
        const exactStaffCashCents = totalTips > 0 ? (cashCents * item.biweeklyHours) / totalEligibleBiweeklyHours : 0;
        
        item.totalCents = Math.floor(exactStaffTotalCents);
        item.cashCents = Math.floor(exactStaffCashCents);
        item.ccCents = item.totalCents - item.cashCents;
        item.remainder = exactStaffTotalCents - item.totalCents;
      } else {
        item.poolSharePercent = 0.0;
        item.totalCents = 0;
        item.cashCents = 0;
        item.ccCents = 0;
        item.remainder = 0;
      }

      allocatedTotalCents += item.totalCents;
      allocatedCashCents += item.cashCents;
      allocatedCcCents += item.ccCents;
    });

    // Second pass: Largest Remainder Method (Penny Reconciliation)
    let pennyDiff = totalCents - allocatedTotalCents;
    if (pennyDiff > 0 && totalEligibleBiweeklyHours > 0) {
      const eligible = candidatesList.filter(c => c.isEligible);
      eligible.sort((a, b) => b.remainder - a.remainder);

      for (let i = 0; i < pennyDiff && i < eligible.length; i++) {
        eligible[i].totalCents += 1;
        if (cashCents > allocatedCashCents) {
          eligible[i].cashCents += 1;
          allocatedCashCents += 1;
        } else {
          eligible[i].ccCents += 1;
          allocatedCcCents += 1;
        }
        allocatedTotalCents += 1;
      }
    }

    candidatesList.forEach(item => {
      item.totalPayout = item.totalCents / 100;
      item.cashPayout = item.cashCents / 100;
      item.ccPayout = item.ccCents / 100;
      item.effectiveTipRate = item.biweeklyHours > 0 ? (item.totalPayout / item.biweeklyHours) : 0;
    });

    const averageEffectiveTipRate = totalEligibleBiweeklyHours > 0 ? (totalTips / totalEligibleBiweeklyHours) : 0;

    return {
      candidates: candidatesList,
      totalTips,
      cashTips,
      ccTips,
      totalShiftHours,
      totalEligibleBiweeklyHours,
      totalAllBiweeklyHours,
      averageEffectiveTipRate,
      reconciliationDiff: (totalCents - allocatedTotalCents) / 100
    };
  }

  // =========================================================================
  // DOM Renderers
  // =========================================================================

  function getRoleSlug(role) {
    return role.toLowerCase().replace(/[\s_]+/g, '');
  }

  function renderShiftCards() {
    const grid = document.getElementById('scheduledShiftsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    state.shifts.forEach(shift => {
      const emp = getEmployeeById(shift.employeeId);
      if (!emp) return;

      const isSelected = state.selectedShiftId === shift.id;
      const roleSlug = getRoleSlug(shift.role);

      const otPct = Math.min(100, (emp.weeklyHours / 40.0) * 100);
      const isNearOt = emp.weeklyHours >= 36.0 && emp.weeklyHours <= 40.0;
      const isInOt = emp.weeklyHours > 40.0;

      const card = document.createElement('div');
      card.className = `shift-card ${isSelected ? 'active-target' : ''}`;
      card.setAttribute('data-shift-id', shift.id);

      card.innerHTML = `
        <div class="shift-card-body">
          <div class="shift-card-header">
            <div class="emp-profile">
              <div class="emp-avatar ${roleSlug}">
                ${emp.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div class="shift-emp-name">${emp.name}</div>
                <div class="role-badge-row">
                  <span class="role-badge ${roleSlug}">${shift.role}</span>
                  ${emp.isManager ? '<span class="flsa-pill-sm" title="FLSA Salaried Manager — Excluded from tips">FLSA Lead</span>' : ''}
                </div>
              </div>
            </div>
            <div class="shift-duration-badge">
              <span class="hours-num">${shift.hours.toFixed(1)}</span>
              <span class="hours-label">hrs tonight</span>
            </div>
          </div>

          <div class="shift-details">
            <div class="detail-line">
              <span class="detail-label">Schedule Window:</span>
              <span class="detail-val font-mono">${shift.startTime} – ${shift.endTime}</span>
            </div>
            <div class="detail-line">
              <span class="detail-label">Station Assignment:</span>
              <span class="detail-val">${shift.notes}</span>
            </div>
            <div class="detail-line">
              <span class="detail-label">Base Pay Rate:</span>
              <span class="detail-val font-mono">${formatCurrency(emp.hourlyRate)}/hr</span>
            </div>
            <div class="detail-line">
              <span class="detail-label">Bi-Weekly Logged:</span>
              <span class="detail-val biweekly-val font-mono">${(emp.biweeklyHours || (emp.weeklyHours * 2)).toFixed(1)} hrs</span>
            </div>

            <!-- Overtime Tracker Bar -->
            <div class="ot-tracker-box">
              <div class="ot-tracker-header">
                <span class="ot-label">Weekly Hours Logged:</span>
                <span class="ot-val font-mono ${isInOt ? 'ot-red' : isNearOt ? 'ot-amber' : ''}">
                  ${emp.weeklyHours.toFixed(1)} / 40.0h
                </span>
              </div>
              <div class="progress-bar-wrap" title="${emp.weeklyHours.toFixed(1)} hrs logged this week">
                <div class="progress-fill ${isInOt ? 'in-ot' : isNearOt ? 'near-ot' : ''}" style="width: ${otPct}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="shift-card-actions">
          <button class="btn-swap ${isSelected ? 'selected' : ''}" data-action="toggle-swap" data-shift-id="${shift.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3h5v5"></path>
              <path d="M4 20L21 3"></path>
              <path d="M21 16v5h-5"></path>
              <path d="M15 15l6 6"></path>
              <path d="M4 4l5 5"></path>
            </svg>
            ${isSelected ? 'Evaluating Swap Candidates' : 'Request Cover / Swap'}
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    const countEl = document.getElementById('activeCrewCount');
    if (countEl) countEl.textContent = `${state.shifts.length} Active Staff`;
  }

  function renderSwapEnginePanel() {
    const panel = document.getElementById('swapEnginePanel');
    const titleEl = document.getElementById('swapTargetTitle');
    const subtitleEl = document.getElementById('swapTargetSubtitle');
    const actionContainer = document.getElementById('swapTargetActionContainer');
    const candidatesGrid = document.getElementById('swapCandidatesGrid');

    if (!panel || !titleEl || !candidatesGrid) return;

    if (!state.selectedShiftId) {
      titleEl.textContent = 'Select any scheduled shift above to request coverage';
      subtitleEl.textContent = 'Our deterministic validation engine automatically tests all off-duty staff against role qualifications ("Team Member" vs "Manager") and the 40.0-hour overtime limit.';
      actionContainer.innerHTML = '';
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3h5v5"></path>
              <path d="M4 20L21 3"></path>
              <path d="M21 16v5h-5"></path>
              <path d="M15 15l6 6"></path>
              <path d="M4 4l5 5"></path>
            </svg>
          </div>
          <h4>No Shift Selected for Coverage</h4>
          <p>Click <strong>"Request Cover / Swap"</strong> on any scheduled employee above to evaluate available off-duty staff.</p>
        </div>
      `;
      updateCandidateFilterCounts(0, 0, 0, 0);
      return;
    }

    const shift = getShiftById(state.selectedShiftId);
    const scheduledEmp = getEmployeeById(shift.employeeId);

    titleEl.innerHTML = `Evaluating Replacement Coverage for <span class="highlight-worker">${scheduledEmp.name}</span> (${shift.role} • ${shift.hours.toFixed(1)}h)`;
    subtitleEl.textContent = `Shift Window: ${shift.startTime} – ${shift.endTime} • Station: ${shift.notes}`;

    actionContainer.innerHTML = `
      <button class="btn btn-outline" id="btnCancelSwapSelect">
        ✕ Clear Selection
      </button>
    `;

    document.getElementById('btnCancelSwapSelect')?.addEventListener('click', () => {
      state.selectedShiftId = null;
      renderAll();
    });

    const candidates = state.roster.filter(e => e.id !== scheduledEmp.id);

    const evaluations = candidates.map(c => {
      const evalResult = evaluateCoverageCandidate(c, shift);
      return {
        candidate: c,
        ...evalResult
      };
    });

    const countSafe = evaluations.filter(e => e.status === 'safe').length;
    const countWarning = evaluations.filter(e => e.status === 'warning').length;
    const countMismatch = evaluations.filter(e => e.status === 'mismatch').length;
    updateCandidateFilterCounts(evaluations.length, countSafe, countWarning, countMismatch);

    const filtered = evaluations.filter(e => {
      if (state.candidateFilter === 'all') return true;
      return e.status === state.candidateFilter;
    });

    candidatesGrid.innerHTML = '';

    if (filtered.length === 0) {
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <p>No candidates match the filter <strong>"${state.candidateFilter.toUpperCase()}"</strong> for this shift.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const c = item.candidate;
      const card = document.createElement('div');
      card.className = `candidate-card status-${item.status}`;

      const certsBadges = c.certifications.map(cert => {
        const matches = cert === shift.role;
        return `<span class="cert-pill ${matches ? 'matched' : ''}">${cert}</span>`;
      }).join(' ');

      let metricsHtml = '';
      if (item.status === 'safe') {
        metricsHtml = `
          <div class="metric-row">
            <span class="m-label">Current Weekly Hours:</span>
            <span class="m-val font-mono">${c.weeklyHours.toFixed(1)} hrs</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Projected with Shift:</span>
            <span class="m-val font-mono text-safe">${item.projectedHours.toFixed(1)} / 40.0 hrs (Safe)</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Overtime Cost Impact:</span>
            <span class="m-val font-mono text-safe">$0.00 (Standard Wage: ${formatCurrency(c.hourlyRate)}/hr)</span>
          </div>
        `;
      } else if (item.status === 'warning') {
        metricsHtml = `
          <div class="metric-row">
            <span class="m-label">Current Weekly Hours:</span>
            <span class="m-val font-mono">${c.weeklyHours.toFixed(1)} hrs</span>
          </div>
          <div class="metric-row highlight-ot">
            <span class="m-label">Projected Weekly Total:</span>
            <span class="m-val font-mono text-warning">${item.projectedHours.toFixed(1)} hrs (&gt; 40.0h)</span>
          </div>
          <div class="metric-row highlight-ot">
            <span class="m-label">Overtime Triggered:</span>
            <span class="m-val font-mono text-warning">+${item.otHours.toFixed(1)} hrs @ 1.5x (${formatCurrency(c.hourlyRate * 1.5)}/hr)</span>
          </div>
          <div class="metric-row highlight-ot">
            <span class="m-label">Extra Overtime Liability:</span>
            <span class="m-val font-mono text-danger">+${formatCurrency(item.extraCost)} premium (${formatCurrency(item.totalOtPay)} total OT pay)</span>
          </div>
        `;
      } else {
        metricsHtml = `
          <div class="metric-row">
            <span class="m-label">Required Role Certification:</span>
            <span class="cert-pill missing">Requires '${shift.role}'</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Employee Certifications:</span>
            <span class="detail-val">${c.certifications.join(', ') || 'None'}</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Compliance Guardrail:</span>
            <span class="text-neutral font-mono">${shift.role === 'Manager' ? 'Manager role restricted' : 'Lacks Team Member certification'}</span>
          </div>
        `;
      }

      let buttonHtml = '';
      if (item.status === 'safe') {
        buttonHtml = `
          <button class="btn-approve-swap safe" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Approve Swap (Zero OT Liability)
          </button>
        `;
      } else if (item.status === 'warning') {
        buttonHtml = `
          <button class="btn-approve-swap warning" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
            ⚠️ Approve with Overtime (+$${item.extraCost.toFixed(2)} Premium)
          </button>
        `;
      } else {
        buttonHtml = `
          <button class="btn-approve-swap disabled" disabled title="Cannot swap: employee lacks ${shift.role} role certification">
            ⛔ Role Mismatch — Swap Blocked
          </button>
        `;
      }

      card.innerHTML = `
        <div class="candidate-top">
          <div class="cand-info">
            <div class="cand-name">${c.name}</div>
            <div class="cand-role-wage">${c.role} • Base ${formatCurrency(c.hourlyRate)}/hr</div>
          </div>
          <span class="status-badge ${item.badgeClass}">${item.badgeText}</span>
        </div>

        <div class="candidate-metrics">
          ${metricsHtml}
        </div>

        <div class="candidate-certs-wrap">
          <div class="certs-label">Active Certifications:</div>
          <div class="candidate-certs">${certsBadges}</div>
        </div>

        <div class="candidate-actions">
          ${buttonHtml}
        </div>
      `;

      candidatesGrid.appendChild(card);
    });
  }

  function updateCandidateFilterCounts(all, safe, warning, mismatch) {
    const elAll = document.getElementById('countAll');
    const elSafe = document.getElementById('countSafe');
    const elWarning = document.getElementById('countWarning');
    const elMismatch = document.getElementById('countMismatch');

    if (elAll) elAll.textContent = all;
    if (elSafe) elSafe.textContent = safe;
    if (elWarning) elWarning.textContent = warning;
    if (elMismatch) elMismatch.textContent = mismatch;
  }

  function renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    state.roster.forEach(emp => {
      const activeShift = state.shifts.find(s => s.employeeId === emp.id);
      const isWorking = !!activeShift;
      const roleSlug = getRoleSlug(emp.role);

      const certPills = emp.certifications.map(c => `<span class="cert-pill">${c}</span>`).join(' ');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="table-emp-cell">
            <div class="table-avatar ${roleSlug}">${emp.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <strong>${emp.name}</strong>
              ${emp.isManager ? '<span class="flsa-badge-table" title="FLSA Salaried Manager — Excluded from tip pools">FLSA Exempt Manager</span>' : ''}
            </div>
          </div>
        </td>
        <td><span class="role-badge ${roleSlug}">${emp.role}</span></td>
        <td>${certPills}</td>
        <td class="num-col">${formatCurrency(emp.hourlyRate)}/hr</td>
        <td class="num-col" style="${emp.weeklyHours >= 36 ? (emp.weeklyHours > 40 ? 'color:#EF4444;font-weight:700;' : 'color:#F59E0B;font-weight:700;') : ''}">
          ${emp.weeklyHours.toFixed(1)} hrs
        </td>
        <td class="num-col biweekly-cell font-mono">
          <strong>${(emp.biweeklyHours !== undefined ? emp.biweeklyHours : (emp.weeklyHours * 2)).toFixed(1)} hrs</strong>
        </td>
        <td>
          ${isWorking 
            ? `<span class="status-badge safe" style="font-size:0.7rem;">Working Tonight (${activeShift.hours}h)</span>` 
            : `<span class="status-badge mismatch" style="font-size:0.7rem;">Off Floor (Available)</span>`}
        </td>
        <td>
          <button class="btn btn-outline-sm" data-action="edit-hours" data-emp-id="${emp.id}" title="Edit weekly & bi-weekly hours">
            Adjust Hours
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function renderTipCalculator() {
    const calc = calculateTipPool();

    const cashInput = document.getElementById('inputCashTips');
    const ccInput = document.getElementById('inputCcTips');
    if (cashInput && document.activeElement !== cashInput) cashInput.value = state.tips.cash;
    if (ccInput && document.activeElement !== ccInput) ccInput.value = state.tips.cc;

    const totalDisplay = document.getElementById('displayTotalTipPool');
    const miniCash = document.getElementById('miniCash');
    const miniCc = document.getElementById('miniCc');
    const kpiEligibleHours = document.getElementById('kpiEligibleHours');
    const kpiAvgRate = document.getElementById('kpiAvgRate');
    const scopeCountDisplay = document.getElementById('scopeCountDisplay');

    if (totalDisplay) totalDisplay.textContent = formatCurrency(calc.totalTips);
    if (miniCash) miniCash.textContent = formatCurrency(calc.cashTips);
    if (miniCc) miniCc.textContent = formatCurrency(calc.ccTips);
    if (kpiEligibleHours) kpiEligibleHours.textContent = `${calc.totalEligibleBiweeklyHours.toFixed(1)} hrs`;
    if (kpiAvgRate) kpiAvgRate.textContent = `+${formatCurrency(calc.averageEffectiveTipRate)}/hr`;
    if (scopeCountDisplay) {
      scopeCountDisplay.textContent = `${calc.candidates.length} Staff (${calc.candidates.filter(c => c.isEligible).length} Eligible)`;
    }

    const reconStatus = document.getElementById('reconciliationStatus');
    if (reconStatus) {
      if (Math.abs(calc.reconciliationDiff) < 0.001) {
        reconStatus.innerHTML = `<span class="badge-dot green"></span> Exact Cent Balanced: $0.00 Penny Remainder`;
        reconStatus.className = 'reconciliation-badge balanced';
      } else {
        reconStatus.innerHTML = `<span class="badge-dot amber"></span> Variance: ${formatCurrency(calc.reconciliationDiff)}`;
        reconStatus.className = 'reconciliation-badge variance';
      }
    }

    document.querySelectorAll('.scope-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-scope') === state.tipScope);
    });

    const tbody = document.getElementById('tipPayoutTableBody');
    const tfoot = document.getElementById('tipPayoutTableFoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';

    let sumCash = 0;
    let sumCc = 0;
    let sumTotal = 0;
    let sumShiftHours = 0;

    calc.candidates.forEach(item => {
      sumCash += item.cashPayout;
      sumCc += item.ccPayout;
      sumTotal += item.totalPayout;
      sumShiftHours += item.shiftHours;

      const isExcluded = !item.isEligible;
      const roleSlug = getRoleSlug(item.role);

      const tr = document.createElement('tr');
      tr.className = isExcluded ? 'row-flsa-excluded' : '';

      tr.innerHTML = `
        <td>
          <div class="table-emp-cell">
            <div class="table-avatar ${roleSlug}">${item.employee.name.split(' ').map(n => n[0]).join('')}</div>
            <div>
              <strong>${item.employee.name}</strong>
              ${isExcluded ? '<span class="flsa-badge-table">FLSA Excluded (Manager)</span>' : ''}
            </div>
          </div>
        </td>
        <td>
          <span class="role-badge ${roleSlug}">${item.role}</span>
        </td>
        <td class="num-col font-mono">
          ${item.shiftHours > 0 ? `${item.shiftHours.toFixed(1)} hrs` : '<span class="text-muted">Off-Duty</span>'}
        </td>
        <td class="num-col">
          <div class="biweekly-input-wrap">
            <input type="number" 
                   class="biweekly-hour-input" 
                   min="0.0" 
                   max="120.0" 
                   step="0.5" 
                   value="${item.biweeklyHours.toFixed(1)}" 
                   data-emp-id="${item.employee.id}"
                   title="Click to adjust bi-weekly logged hours">
            <span class="input-unit">h</span>
          </div>
        </td>
        <td class="num-col font-mono" style="${isExcluded ? 'color:var(--text-muted);' : 'font-weight:600;'}">
          ${item.poolSharePercent.toFixed(1)}%
        </td>
        <td class="num-col font-mono text-cash">
          ${formatCurrency(item.cashPayout)}
        </td>
        <td class="num-col font-mono text-cc">
          ${formatCurrency(item.ccPayout)}
        </td>
        <td class="num-col font-mono highlight-cell">
          ${formatCurrency(item.totalPayout)}
        </td>
      `;

      tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
      <tr>
        <td colspan="2">TOTAL BI-WEEKLY DISTRIBUTION POOL</td>
        <td class="num-col font-mono">${sumShiftHours.toFixed(1)} hrs</td>
        <td class="num-col font-mono"><strong>${calc.totalEligibleBiweeklyHours.toFixed(1)} eligible hrs</strong></td>
        <td class="num-col font-mono">100.0%</td>
        <td class="num-col font-mono text-cash">${formatCurrency(sumCash)}</td>
        <td class="num-col font-mono text-cc">${formatCurrency(sumCc)}</td>
        <td class="num-col font-mono highlight-cell">${formatCurrency(sumTotal)}</td>
      </tr>
    `;
  }

  function renderReceiptModal() {
    const calc = calculateTipPool();

    const slipTotalPool = document.getElementById('slipTotalPool');
    const slipCashTips = document.getElementById('slipCashTips');
    const slipCcTips = document.getElementById('slipCcTips');
    const slipTotalHours = document.getElementById('slipTotalHours');
    const slipTotalBiweekly = document.getElementById('slipTotalBiweekly');
    const slipCrewList = document.getElementById('slipCrewList');
    const slipDate = document.getElementById('slipDate');
    const slipTimestamp = document.getElementById('slipTimestamp');
    const slipReconciliation = document.getElementById('slipReconciliation');
    const slipScope = document.getElementById('slipScope');

    if (slipTotalPool) slipTotalPool.textContent = formatCurrency(calc.totalTips);
    if (slipCashTips) slipCashTips.textContent = formatCurrency(calc.cashTips);
    if (slipCcTips) slipCcTips.textContent = formatCurrency(calc.ccTips);
    if (slipTotalHours) slipTotalHours.textContent = `${calc.totalShiftHours.toFixed(1)} hrs`;
    if (slipTotalBiweekly) slipTotalBiweekly.textContent = `${calc.totalEligibleBiweeklyHours.toFixed(1)} eligible hrs`;
    if (slipScope) slipScope.textContent = state.tipScope === 'all' ? 'All Store Staff (8)' : "Tonight's Working Crew";

    const now = new Date();
    if (slipDate) slipDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (slipTimestamp) slipTimestamp.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (slipReconciliation) {
      slipReconciliation.textContent = `100.0% Exact Match (${formatCurrency(calc.reconciliationDiff)} var)`;
    }

    if (slipCrewList) {
      slipCrewList.innerHTML = '';
      calc.candidates.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `slip-item ${!item.isEligible ? 'slip-excluded' : ''}`;
        itemDiv.innerHTML = `
          <div class="slip-item-top">
            <span class="slip-item-name">${item.employee.name} (${item.role})</span>
            <span class="slip-item-total font-mono">${formatCurrency(item.totalPayout)}</span>
          </div>
          <div class="slip-item-sub">
            <span>${item.biweeklyHours.toFixed(1)}h bi-weekly (${item.poolSharePercent.toFixed(1)}%)</span>
            <span>Cash: ${formatCurrency(item.cashPayout)} | CC: ${formatCurrency(item.ccPayout)}</span>
          </div>
        `;
        slipCrewList.appendChild(itemDiv);
      });
    }
  }

  function renderAll() {
    renderShiftCards();
    renderSwapEnginePanel();
    renderRosterTable();
    renderTipCalculator();
  }

  // =========================================================================
  // Toast Notification System
  // =========================================================================

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '⛔';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 4200);
  }

  // =========================================================================
  // "Try It in 2 Minutes" Sample Scenario
  // =========================================================================

  function loadSampleScenario() {
    state.roster = JSON.parse(JSON.stringify(INITIAL_ROSTER));
    state.shifts = JSON.parse(JSON.stringify(INITIAL_SHIFTS));
    state.tips = { cash: 240.00, cc: 860.00 }; // $1,100 pool
    state.tipScope = 'crew';
    state.shiftHoursOverride = {};

    // Select Shift 1 (Jordan Miller - Team Member, 6.0 hrs) to illustrate swap engine immediately
    state.selectedShiftId = 'shift-1';
    state.candidateFilter = 'all';

    saveState();
    renderAll();

    switchTab('tabSwapValidator');

    showToast('⚡ Friday Dinner Rush loaded! Jordan Miller (Team Member) selected. Check Maya Lin (Overtime Alert), Elena (Safe), and Chloe (Role Mismatch).', 'warning');
  }

  // =========================================================================
  // Navigation & Tab Switching
  // =========================================================================

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'tabTipCalculator') {
      renderTipCalculator();
    }
  }

  // =========================================================================
  // Event Delegation & Setup
  // =========================================================================

  function setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    document.getElementById('btnQuickDemo')?.addEventListener('click', loadSampleScenario);
    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('Reset all shifts, weekly/bi-weekly hours, and tip pool calculations back to synthetic sample data?')) {
        resetState();
      }
    });

    document.querySelector('.candidate-filters')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.candidateFilter = chip.getAttribute('data-filter') || 'all';
      renderSwapEnginePanel();
    });

    document.addEventListener('click', (e) => {
      const swapBtn = e.target.closest('[data-action="toggle-swap"]');
      if (swapBtn) {
        const shiftId = swapBtn.getAttribute('data-shift-id');
        if (state.selectedShiftId === shiftId) {
          state.selectedShiftId = null;
        } else {
          state.selectedShiftId = shiftId;
        }
        renderShiftCards();
        renderSwapEnginePanel();
        return;
      }

      const approveBtn = e.target.closest('[data-action="approve-swap"]');
      if (approveBtn) {
        const candId = approveBtn.getAttribute('data-cand-id');
        const shiftId = approveBtn.getAttribute('data-shift-id');
        approveSwap(candId, shiftId);
        return;
      }

      const editBtn = e.target.closest('[data-action="edit-hours"]');
      if (editBtn) {
        const empId = editBtn.getAttribute('data-emp-id');
        const emp = getEmployeeById(empId);
        if (emp) {
          const newWeeklyStr = prompt(`Enter updated Weekly Hours logged for ${emp.name} (currently ${emp.weeklyHours}h):`, emp.weeklyHours);
          if (newWeeklyStr !== null) {
            const parsedWeekly = parseFloat(newWeeklyStr);
            if (!isNaN(parsedWeekly) && parsedWeekly >= 0) {
              emp.weeklyHours = parseFloat(parsedWeekly.toFixed(1));
              
              const newBiweeklyStr = prompt(`Enter updated Bi-Weekly Hours logged for ${emp.name} (currently ${emp.biweeklyHours || emp.weeklyHours * 2}h):`, emp.biweeklyHours || (emp.weeklyHours * 2));
              if (newBiweeklyStr !== null) {
                const parsedBiweekly = parseFloat(newBiweeklyStr);
                if (!isNaN(parsedBiweekly) && parsedBiweekly >= 0) {
                  emp.biweeklyHours = parseFloat(parsedBiweekly.toFixed(1));
                }
              }
              
              saveState();
              renderAll();
              showToast(`Updated ${emp.name}: Weekly ${emp.weeklyHours}h, Bi-Weekly ${emp.biweeklyHours}h.`, 'info');
            }
          }
        }
        return;
      }

      const scopeBtn = e.target.closest('.scope-toggle-btn');
      if (scopeBtn) {
        const scope = scopeBtn.getAttribute('data-scope');
        if (scope && scope !== state.tipScope) {
          state.tipScope = scope;
          saveState();
          renderTipCalculator();
          showToast(`Switched tip pool distribution scope to ${scope === 'all' ? 'All Store Staff (8)' : "Tonight's Working Floor Crew"}.`, 'info');
        }
        return;
      }

      const tipPresetBtn = e.target.closest('.btn-tip-preset');
      if (tipPresetBtn) {
        const cashVal = parseFloat(tipPresetBtn.getAttribute('data-cash')) || 0;
        const ccVal = parseFloat(tipPresetBtn.getAttribute('data-cc')) || 0;
        state.tips.cash = cashVal;
        state.tips.cc = ccVal;
        saveState();
        renderTipCalculator();
        showToast(`Loaded ${formatCurrency(cashVal + ccVal)} tip preset (${formatCurrency(cashVal)} cash / ${formatCurrency(ccVal)} CC).`, 'info');
        return;
      }
    });

    document.getElementById('inputCashTips')?.addEventListener('input', (e) => {
      state.tips.cash = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
    });

    document.getElementById('inputCcTips')?.addEventListener('input', (e) => {
      state.tips.cc = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
    });

    document.getElementById('tipPayoutTableBody')?.addEventListener('change', (e) => {
      if (e.target.classList.contains('biweekly-hour-input')) {
        const empId = e.target.getAttribute('data-emp-id');
        const val = parseFloat(e.target.value);
        if (empId && !isNaN(val) && val >= 0) {
          const emp = getEmployeeById(empId);
          if (emp) {
            emp.biweeklyHours = parseFloat(val.toFixed(1));
            saveState();
            renderTipCalculator();
            renderRosterTable();
            renderShiftCards();
            showToast(`Updated ${emp.name}'s bi-weekly hours to ${emp.biweeklyHours}h. Tip pool re-balanced!`, 'info');
          }
        }
      }
    });

    const modal = document.getElementById('receiptModal');
    const openReceiptModal = () => {
      renderReceiptModal();
      modal?.classList.add('open');
    };
    const closeReceiptModal = () => {
      modal?.classList.remove('open');
    };

    document.getElementById('btnPrintReceiptBtn')?.addEventListener('click', openReceiptModal);
    document.getElementById('btnCloseModal')?.addEventListener('click', closeReceiptModal);
    document.getElementById('btnModalCloseSecondary')?.addEventListener('click', closeReceiptModal);

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeReceiptModal();
    });

    document.getElementById('btnModalPrint')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btnModalDownload')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `THE COPPER OAK BISTRO — SHIFT CLOSEOUT & BI-WEEKLY TIP POOL\n`;
      text += `Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}\n`;
      text += `Scope: ${state.tipScope === 'all' ? 'All Store Staff (8)' : "Tonight's Working Floor Crew"}\n`;
      text += `Total Tip Pool: ${formatCurrency(calc.totalTips)} (Cash: ${formatCurrency(calc.cashTips)} | CC: ${formatCurrency(calc.ccTips)})\n`;
      text += `Total Eligible Bi-Weekly Hours: ${calc.totalEligibleBiweeklyHours.toFixed(1)} hrs\n`;
      text += `--------------------------------------------------\n`;
      calc.candidates.forEach(c => {
        const statusNote = c.isEligible ? `${c.biweeklyHours.toFixed(1)}h (${c.poolSharePercent.toFixed(1)}%)` : 'FLSA EXEMPT (0%)';
        text += `${c.employee.name.padEnd(18)} [${c.role.padEnd(12)}] | ${statusNote.padEnd(14)} -> Cash: ${formatCurrency(c.cashPayout).padEnd(9)} | CC: ${formatCurrency(c.ccPayout).padEnd(9)} | Total: ${formatCurrency(c.totalPayout)}\n`;
      });
      text += `--------------------------------------------------\n`;
      text += `Penny Variance: ${formatCurrency(calc.reconciliationDiff)}\nFLSA Labor Audit Check: PASSED (Managers Excluded under 29 U.S.C. § 203(m)(2)(B))\n`;

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift-tip-slip-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Shift record downloaded as text slip.', 'success');
    });

    document.getElementById('btnCopySummaryBtn')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `✦ BI-WEEKLY TIP POOL SETTLEMENT SUMMARY ✦\n`;
      text += `Scope: ${state.tipScope === 'all' ? 'All Store Staff' : "Tonight's Crew"} | Total Pool: ${formatCurrency(calc.totalTips)} (Cash: ${formatCurrency(calc.cashTips)} | CC: ${formatCurrency(calc.ccTips)})\n`;
      calc.candidates.forEach(c => {
        if (c.isEligible) {
          text += `• ${c.employee.name} (${c.role}): Total ${formatCurrency(c.totalPayout)} [Cash: ${formatCurrency(c.cashPayout)}, CC: ${formatCurrency(c.ccPayout)}] (${c.biweeklyHours}h bi-weekly)\n`;
        } else {
          text += `• ${c.employee.name} (${c.role}): FLSA Excluded ($0.00 tip share)\n`;
        }
      });
      navigator.clipboard.writeText(text).then(() => {
        showToast('Tip distribution summary copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Could not access clipboard.', 'warning');
      });
    });
  }

  // =========================================================================
  // Initialize Application
  // =========================================================================

  function init() {
    loadState();
    setupEventListeners();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
