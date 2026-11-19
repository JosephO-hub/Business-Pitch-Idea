/**
 * Shift-Coverage & Tip-Pool Optimizer (v1.0)
 * Standards compliant with /shift-tip-standards:
 * - Pure vanilla ES6 JavaScript (No build steps, no backend)
 * - Deterministic math with exact penny reconciliation
 * - 1.5x Overtime financial liability calculation
 * - FLSA 29 U.S.C. § 203(m)(2)(B) manager tip-exclusion guardrail
 * - LocalStorage state persistence with instant reset
 */

(function () {
  'use strict';

  // =========================================================================
  // Baseline Synthetic Data
  // =========================================================================

  const INITIAL_ROSTER = [
    {
      id: 'emp-1',
      name: 'Jordan Miller',
      role: 'Server',
      hourlyRate: 12.00,
      weeklyHours: 31.0,
      certifications: ['Server'],
      isManager: false
    },
    {
      id: 'emp-2',
      name: 'Maya Lin',
      role: 'Server',
      hourlyRate: 12.50,
      weeklyHours: 37.0, // High hours -> triggers 3.0h Overtime Warning on 6h shift
      certifications: ['Server', 'Bartender'],
      isManager: false
    },
    {
      id: 'emp-3',
      name: 'Elena Rodriguez',
      role: 'Server',
      hourlyRate: 11.50,
      weeklyHours: 22.0, // Safe candidate (22 + 6 = 28 <= 40)
      certifications: ['Server', 'Busser'],
      isManager: false
    },
    {
      id: 'emp-4',
      name: 'Samir Patel',
      role: 'Bartender',
      hourlyRate: 15.00,
      weeklyHours: 33.0,
      certifications: ['Bartender', 'Server'],
      isManager: false
    },
    {
      id: 'emp-5',
      name: 'Chloe Bennett',
      role: 'Bartender',
      hourlyRate: 14.50,
      weeklyHours: 18.0,
      certifications: ['Bartender'], // Role mismatch if covering Server or Line Cook
      isManager: false
    },
    {
      id: 'emp-6',
      name: 'Leo Tanaka',
      role: 'Busser',
      hourlyRate: 13.00,
      weeklyHours: 26.0,
      certifications: ['Busser'],
      isManager: false
    },
    {
      id: 'emp-7',
      name: 'Marcus Vance',
      role: 'Line Cook',
      hourlyRate: 19.00,
      weeklyHours: 36.5, // High hours -> triggers Overtime Warning on Kitchen shift
      certifications: ['Line Cook'],
      isManager: false
    },
    {
      id: 'emp-8',
      name: 'Rachel Greene',
      role: 'Shift Lead',
      hourlyRate: 22.00,
      weeklyHours: 35.0,
      certifications: ['Shift Lead', 'Server', 'Bartender'],
      isManager: true // FLSA Tip Exclusion Rule applies
    }
  ];

  const INITIAL_SHIFTS = [
    {
      id: 'shift-1',
      employeeId: 'emp-1', // Jordan Miller
      role: 'Server',
      startTime: '5:00 PM',
      endTime: '11:00 PM',
      hours: 6.0,
      notes: 'Main Dining Room'
    },
    {
      id: 'shift-2',
      employeeId: 'emp-3', // Elena Rodriguez
      role: 'Server',
      startTime: '4:30 PM',
      endTime: '10:30 PM',
      hours: 6.0,
      notes: 'Patio & Lounge'
    },
    {
      id: 'shift-3',
      employeeId: 'emp-4', // Samir Patel
      role: 'Bartender',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Main Craft Bar'
    },
    {
      id: 'shift-4',
      employeeId: 'emp-6', // Leo Tanaka
      role: 'Busser',
      startTime: '5:00 PM',
      endTime: '10:00 PM',
      hours: 5.0,
      notes: 'Floor Turnover & Water'
    },
    {
      id: 'shift-5',
      employeeId: 'emp-7', // Marcus Vance
      role: 'Line Cook',
      startTime: '3:30 PM',
      endTime: '10:30 PM',
      hours: 7.0,
      notes: 'Sautee & Grill Station'
    },
    {
      id: 'shift-6',
      employeeId: 'emp-8', // Rachel Greene
      role: 'Shift Lead',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Floor Supervision & Cashier'
    }
  ];

  const DEFAULT_WEIGHTS = {
    'Bartender': 1.2,
    'Server': 1.0,
    'Busser': 0.6,
    'Line Cook': 0.0,
    'Shift Lead': 0.0 // Strictly 0.0 for FLSA compliance
  };

  const STORAGE_KEY = 'shift_tip_optimizer_state_v1';

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
    roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
    shiftHoursOverride: {} // Map shiftId -> hours worked tonight
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
          // Ensure weights have all defaults
          state.roleWeights = Object.assign({}, DEFAULT_WEIGHTS, state.roleWeights);
          // Strictly enforce Shift Lead 0 weight for FLSA
          state.roleWeights['Shift Lead'] = 0.0;
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
      roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
      shiftHoursOverride: {}
    };
    saveState();
    renderAll();
    showToast('Reset to default 8-person restaurant roster & schedule.', 'info');
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
    // 1. Check Station Role Certification
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
        reason: `Stays at ${projectedHours.toFixed(1)} hrs (<= 40.0h). Standard wage apply.`,
        canApprove: true,
        otHours: 0,
        extraCost: 0,
        projectedHours: projectedHours
      };
    }

    // 3. Overtime Alert Calculation
    // Overtime hours triggered by this shift:
    // If candidate was already at or above 40, entire shift is OT.
    // If candidate was below 40, portion above 40 is OT.
    const otHours = currentHours >= 40.0 
      ? shiftHours 
      : (projectedHours - 40.0);
    
    // Regular wage rate
    const regularRate = candidate.hourlyRate;
    // Overtime rate is 1.5x
    const otRate = regularRate * 1.5;
    // Extra cost beyond regular pay = otHours * (0.5 * regularRate)
    const extraOvertimeCost = otHours * (regularRate * 0.5);
    // Total pay for those OT hours = otHours * otRate
    const totalOtPay = otHours * otRate;

    return {
      status: 'warning',
      badgeText: `Overtime Alert (+${otHours.toFixed(1)}h OT)`,
      badgeClass: 'warning',
      reason: `Pushes weekly total to ${projectedHours.toFixed(1)} hrs (> 40.0h). Requires 1.5x overtime wage.`,
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

    // Adjust weekly logged hours in deterministic compliance
    const shiftHours = shift.hours;
    previousEmployee.weeklyHours = Math.max(0, parseFloat((previousEmployee.weeklyHours - shiftHours).toFixed(1)));
    candidate.weeklyHours = parseFloat((candidate.weeklyHours + shiftHours).toFixed(1));

    // Assign shift to candidate
    shift.employeeId = candidate.id;

    saveState();
    renderAll();

    showToast(`Swap Approved! ${candidate.name} is now assigned to tonight's ${shift.role} shift.`, 'success');
  }

  // =========================================================================
  // Tip Pool Engine (Deterministic Weighted Math & Penny Reconciliation)
  // =========================================================================

  function calculateTipPool() {
    const cashTips = parseFloat(state.tips.cash) || 0;
    const ccTips = parseFloat(state.tips.cc) || 0;
    const totalTips = cashTips + ccTips;

    // Compile active working crew from tonight's shifts
    // A person might only work 1 shift, but if multiple, aggregate their hours
    const crewMap = new Map();

    state.shifts.forEach(shift => {
      const emp = getEmployeeById(shift.employeeId);
      if (!emp) return;

      const hoursWorked = getShiftActualHours(shift);
      const role = shift.role;
      // Shift lead / managers are strictly 0 weight per FLSA
      let weight = state.roleWeights[role] !== undefined ? state.roleWeights[role] : 1.0;
      if (emp.isManager || role === 'Shift Lead') {
        weight = 0.0;
      }

      if (!crewMap.has(emp.id)) {
        crewMap.set(emp.id, {
          employee: emp,
          role: role,
          hoursWorked: hoursWorked,
          weight: weight,
          shiftId: shift.id
        });
      } else {
        const existing = crewMap.get(emp.id);
        existing.hoursWorked += hoursWorked;
      }
    });

    const crew = Array.from(crewMap.values());

    // Calculate weighted hours per employee
    let totalWeightedHours = 0;
    let totalWorkingHours = 0;

    crew.forEach(item => {
      item.weightedHours = item.hoursWorked * item.weight;
      totalWeightedHours += item.weightedHours;
      totalWorkingHours += item.hoursWorked;
    });

    // Exact cent calculations
    const totalCents = Math.round(totalTips * 100);
    const cashCents = Math.round(cashTips * 100);
    const ccCents = Math.round(ccTips * 100);

    let allocatedTotalCents = 0;
    let allocatedCashCents = 0;
    let allocatedCcCents = 0;

    // First pass: Proportional floor distribution
    crew.forEach(item => {
      if (totalWeightedHours > 0 && item.weightedHours > 0) {
        item.poolSharePercent = (item.weightedHours / totalWeightedHours) * 100;
        
        // Exact cent proportion
        const exactStaffTotalCents = (totalCents * item.weightedHours) / totalWeightedHours;
        const exactStaffCashCents = totalTips > 0 ? (cashCents * item.weightedHours) / totalWeightedHours : 0;
        
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
    if (pennyDiff > 0 && totalWeightedHours > 0) {
      // Sort crew by largest decimal remainder among tipped staff
      const eligible = crew.filter(c => c.weight > 0);
      eligible.sort((a, b) => b.remainder - a.remainder);

      for (let i = 0; i < pennyDiff && i < eligible.length; i++) {
        eligible[i].totalCents += 1;
        // Distribute remainder cent into cash if cash has remainder, else CC
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

    // Convert back to dollar decimals
    crew.forEach(item => {
      item.totalPayout = item.totalCents / 100;
      item.cashPayout = item.cashCents / 100;
      item.ccPayout = item.ccCents / 100;
    });

    return {
      crew,
      totalTips,
      cashTips,
      ccTips,
      totalWorkingHours,
      totalWeightedHours,
      reconciliationDiff: (totalCents - allocatedTotalCents) / 100
    };
  }

  // =========================================================================
  // DOM Renderers
  // =========================================================================

  function renderShiftCards() {
    const grid = document.getElementById('scheduledShiftsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    state.shifts.forEach(shift => {
      const emp = getEmployeeById(shift.employeeId);
      if (!emp) return;

      const isSelected = state.selectedShiftId === shift.id;
      const roleClass = shift.role.toLowerCase().replace(/\s+/g, '');

      // Check current weekly progress
      const otPct = Math.min(100, (emp.weeklyHours / 40.0) * 100);
      const isNearOt = emp.weeklyHours >= 36.0 && emp.weeklyHours <= 40.0;
      const isInOt = emp.weeklyHours > 40.0;

      const card = document.createElement('div');
      card.className = `shift-card ${isSelected ? 'active-target' : ''}`;
      card.setAttribute('data-shift-id', shift.id);

      card.innerHTML = `
        <div>
          <div class="shift-card-header">
            <div>
              <div class="shift-emp-name">${emp.name}</div>
              <span class="role-badge ${roleClass}">${shift.role}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 700; color: #fff;">
                ${shift.hours.toFixed(1)} hrs
              </span>
            </div>
          </div>

          <div class="shift-details">
            <div class="detail-line">
              <span>Scheduled Time:</span>
              <strong>${shift.startTime} – ${shift.endTime}</strong>
            </div>
            <div class="detail-line">
              <span>Station Assignment:</span>
              <span>${shift.notes}</span>
            </div>
            <div class="detail-line">
              <span>Base Pay Rate:</span>
              <strong>${formatCurrency(emp.hourlyRate)}/hr</strong>
            </div>
            <div class="detail-line" style="margin-top: 0.25rem;">
              <span>Weekly Hours Logged:</span>
              <strong style="${isInOt ? 'color:#EF4444;' : isNearOt ? 'color:#F59E0B;' : ''}">
                ${emp.weeklyHours.toFixed(1)} / 40.0h
              </strong>
            </div>
            <div class="progress-bar-wrap" title="${emp.weeklyHours.toFixed(1)} hrs logged this week">
              <div class="progress-fill ${isInOt ? 'in-ot' : isNearOt ? 'near-ot' : ''}" style="width: ${otPct}%;"></div>
            </div>
          </div>
        </div>

        <div class="shift-card-actions">
          <button class="btn-swap" data-action="toggle-swap" data-shift-id="${shift.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3h5v5"></path>
              <path d="M4 20L21 3"></path>
              <path d="M21 16v5h-5"></path>
              <path d="M15 15l6 6"></path>
              <path d="M4 4l5 5"></path>
            </svg>
            ${isSelected ? 'Currently Evaluating Coverage' : 'Request Cover / Swap'}
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Update status indicators
    const countEl = document.getElementById('activeCrewCount');
    if (countEl) countEl.textContent = `${state.shifts.length} Staff`;
  }

  function renderSwapEnginePanel() {
    const panel = document.getElementById('swapEnginePanel');
    const titleEl = document.getElementById('swapTargetTitle');
    const subtitleEl = document.getElementById('swapTargetSubtitle');
    const actionContainer = document.getElementById('swapTargetActionContainer');
    const candidatesGrid = document.getElementById('swapCandidatesGrid');

    if (!panel || !titleEl || !candidatesGrid) return;

    if (!state.selectedShiftId) {
      titleEl.textContent = 'Select a shift above to request coverage';
      subtitleEl.textContent = 'Comparing all off-duty employees against station certifications and 40.0-hour overtime limits.';
      actionContainer.innerHTML = '';
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Click <strong>"Request Cover / Swap"</strong> on any scheduled employee above to evaluate eligible replacement staff.</p>
        </div>
      `;
      updateCandidateFilterCounts(0, 0, 0, 0);
      return;
    }

    const shift = getShiftById(state.selectedShiftId);
    const scheduledEmp = getEmployeeById(shift.employeeId);

    titleEl.innerHTML = `Evaluating Replacement Coverage for <span style="color:#60A5FA;">${scheduledEmp.name}</span> (${shift.role} • ${shift.hours.toFixed(1)}h)`;
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

    // Find all other staff members (not the person currently on the shift)
    const candidates = state.roster.filter(e => e.id !== scheduledEmp.id);

    // Evaluate each candidate
    const evaluations = candidates.map(c => {
      const evalResult = evaluateCoverageCandidate(c, shift);
      return {
        candidate: c,
        ...evalResult
      };
    });

    // Update filter counts
    const countSafe = evaluations.filter(e => e.status === 'safe').length;
    const countWarning = evaluations.filter(e => e.status === 'warning').length;
    const countMismatch = evaluations.filter(e => e.status === 'mismatch').length;
    updateCandidateFilterCounts(evaluations.length, countSafe, countWarning, countMismatch);

    // Filter according to current active tab
    const filtered = evaluations.filter(e => {
      if (state.candidateFilter === 'all') return true;
      return e.status === state.candidateFilter;
    });

    candidatesGrid.innerHTML = '';

    if (filtered.length === 0) {
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <p>No candidates match the filter <strong>"${state.candidateFilter.toUpperCase()}"</strong>.</p>
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
        return `<span class="cert-pill" style="${matches ? 'background:#1D4ED8;color:#fff;' : ''}">${cert}</span>`;
      }).join(' ');

      let metricsHtml = '';
      if (item.status === 'safe') {
        metricsHtml = `
          <div class="metric-row">
            <span>Current Weekly Hours:</span>
            <strong>${c.weeklyHours.toFixed(1)} hrs</strong>
          </div>
          <div class="metric-row">
            <span>Projected with Shift:</span>
            <strong style="color:#10B981;">${item.projectedHours.toFixed(1)} / 40.0 hrs (Safe)</strong>
          </div>
          <div class="metric-row">
            <span>Extra Overtime Cost:</span>
            <strong style="color:#10B981;">$0.00 (Standard Wage: ${formatCurrency(c.hourlyRate)}/hr)</strong>
          </div>
        `;
      } else if (item.status === 'warning') {
        metricsHtml = `
          <div class="metric-row">
            <span>Current Weekly Hours:</span>
            <strong>${c.weeklyHours.toFixed(1)} hrs</strong>
          </div>
          <div class="metric-row highlight-ot">
            <span>Projected Weekly Total:</span>
            <strong>${item.projectedHours.toFixed(1)} hrs (> 40h)</strong>
          </div>
          <div class="metric-row highlight-ot">
            <span>Overtime Triggered:</span>
            <strong>+${item.otHours.toFixed(1)} hrs at 1.5x (${formatCurrency(c.hourlyRate * 1.5)}/hr)</strong>
          </div>
          <div class="metric-row highlight-ot">
            <span>Overtime Cost Impact:</span>
            <span>+${formatCurrency(item.extraCost)} premium (${formatCurrency(item.totalOtPay)} total OT pay)</span>
          </div>
        `;
      } else {
        metricsHtml = `
          <div class="metric-row">
            <span>Required Certification:</span>
            <span class="cert-pill missing">Requires '${shift.role}'</span>
          </div>
          <div class="metric-row">
            <span>Current Station Badges:</span>
            <span>${c.certifications.join(', ') || 'None'}</span>
          </div>
          <div class="metric-row">
            <span>Compliance Status:</span>
            <span style="color:#94A3B8;">Station swap restricted</span>
          </div>
        `;
      }

      let buttonHtml = '';
      if (item.status === 'safe') {
        buttonHtml = `
          <button class="btn-approve-swap safe" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
            ✓ Approve Swap (No OT Cost)
          </button>
        `;
      } else if (item.status === 'warning') {
        buttonHtml = `
          <button class="btn-approve-swap warning" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
            ⚠️ Approve with Overtime (+$${item.extraCost.toFixed(2)})
          </button>
        `;
      } else {
        buttonHtml = `
          <button class="btn-approve-swap disabled" disabled title="Cannot swap: employee lacks station certification">
            ⛔ Role Mismatch — Blocked
          </button>
        `;
      }

      card.innerHTML = `
        <div class="candidate-top">
          <div>
            <div class="cand-name">${c.name}</div>
            <div class="cand-role-wage">${c.role} • Base ${formatCurrency(c.hourlyRate)}/hr</div>
          </div>
          <span class="status-badge ${item.badgeClass}">${item.badgeText}</span>
        </div>

        <div class="candidate-metrics">
          ${metricsHtml}
        </div>

        <div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.25rem;">Certifications:</div>
          <div class="candidate-certs">${certsBadges}</div>
        </div>

        <div>
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

      const certPills = emp.certifications.map(c => `<span class="cert-pill">${c}</span>`).join(' ');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${emp.name}</strong>
          ${emp.isManager ? '<span class="flsa-badge-table" title="FLSA Salaried/Lead — Excluded from tip pools">FLSA Exempt Lead</span>' : ''}
        </td>
        <td>${emp.role}</td>
        <td>${certPills}</td>
        <td class="num-col">${formatCurrency(emp.hourlyRate)}/hr</td>
        <td class="num-col" style="${emp.weeklyHours >= 36 ? (emp.weeklyHours > 40 ? 'color:#EF4444;font-weight:700;' : 'color:#F59E0B;font-weight:700;') : ''}">
          ${emp.weeklyHours.toFixed(1)} hrs
        </td>
        <td>
          ${isWorking 
            ? `<span class="status-badge safe" style="font-size:0.65rem;">Working Tonight (${activeShift.hours}h)</span>` 
            : `<span class="status-badge mismatch" style="font-size:0.65rem;">Off Floor (Available)</span>`}
        </td>
        <td>
          <button class="btn btn-outline" style="padding:0.25rem 0.5rem;font-size:0.75rem;" data-action="edit-hours" data-emp-id="${emp.id}">
            Adjust Hours
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function renderRoleWeightSliders() {
    const container = document.getElementById('roleWeightsList');
    if (!container) return;

    container.innerHTML = '';

    const roles = ['Bartender', 'Server', 'Busser', 'Line Cook', 'Shift Lead'];

    roles.forEach(role => {
      const weight = state.roleWeights[role] !== undefined ? state.roleWeights[role] : 1.0;
      const isShiftLead = role === 'Shift Lead';

      const row = document.createElement('div');
      row.className = 'weight-row';
      row.innerHTML = `
        <div class="weight-info">
          <div class="weight-role-name">${role}</div>
          <span style="font-size:0.7rem; color:var(--text-muted);">
            ${isShiftLead ? 'FLSA Excluded (Manager)' : (weight === 0 ? 'Non-tipped' : 'Weighted Share')}
          </span>
        </div>
        <div class="weight-slider-wrap">
          <input type="range" 
                 class="range-slider" 
                 min="0.0" 
                 max="2.0" 
                 step="0.1" 
                 value="${weight}" 
                 data-role="${role}" 
                 ${isShiftLead ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>
          <span class="weight-val-badge">${weight.toFixed(1)}x</span>
        </div>
      `;

      container.appendChild(row);
    });
  }

  function renderTipCalculator() {
    const calc = calculateTipPool();

    // Inputs
    const cashInput = document.getElementById('inputCashTips');
    const ccInput = document.getElementById('inputCcTips');
    if (cashInput && document.activeElement !== cashInput) cashInput.value = state.tips.cash;
    if (ccInput && document.activeElement !== ccInput) ccInput.value = state.tips.cc;

    // Summary Banners
    const totalDisplay = document.getElementById('displayTotalTipPool');
    const miniCash = document.getElementById('miniCash');
    const miniCc = document.getElementById('miniCc');

    if (totalDisplay) totalDisplay.textContent = formatCurrency(calc.totalTips);
    if (miniCash) miniCash.textContent = formatCurrency(calc.cashTips);
    if (miniCc) miniCc.textContent = formatCurrency(calc.ccTips);

    // Cent reconciliation
    const reconStatus = document.getElementById('reconciliationStatus');
    if (reconStatus) {
      if (Math.abs(calc.reconciliationDiff) < 0.001) {
        reconStatus.innerHTML = `<span class="badge-dot green"></span> Exact Cent Balanced: $0.00 Penny Remainder`;
        reconStatus.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      } else {
        reconStatus.innerHTML = `<span class="badge-dot amber"></span> Variance: ${formatCurrency(calc.reconciliationDiff)}`;
      }
    }

    // Table Body
    const tbody = document.getElementById('tipPayoutTableBody');
    const tfoot = document.getElementById('tipPayoutTableFoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';

    let sumCash = 0;
    let sumCc = 0;
    let sumTotal = 0;

    calc.crew.forEach(item => {
      sumCash += item.cashPayout;
      sumCc += item.ccPayout;
      sumTotal += item.totalPayout;

      const isZero = item.weight === 0;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <strong>${item.employee.name}</strong>
          ${item.employee.isManager ? '<span class="flsa-badge-table">FLSA Excluded</span>' : ''}
        </td>
        <td>
          <span class="role-badge ${item.role.toLowerCase().replace(/\s+/g, '')}">${item.role}</span>
        </td>
        <td class="num-col">
          <input type="number" 
                 class="shift-hour-input" 
                 min="0.5" 
                 max="16.0" 
                 step="0.5" 
                 value="${item.hoursWorked}" 
                 data-shift-id="${item.shiftId}">
        </td>
        <td class="num-col" style="${isZero ? 'color:#64748B;' : ''}">${item.weight.toFixed(1)}x</td>
        <td class="num-col" style="${isZero ? 'color:#64748B;' : ''}">${item.weightedHours.toFixed(2)}</td>
        <td class="num-col" style="${isZero ? 'color:#64748B;' : ''}">${item.poolSharePercent.toFixed(1)}%</td>
        <td class="num-col" style="color:#34D399;">${formatCurrency(item.cashPayout)}</td>
        <td class="num-col" style="color:#93C5FD;">${formatCurrency(item.ccPayout)}</td>
        <td class="num-col highlight-cell">${formatCurrency(item.totalPayout)}</td>
      `;

      tbody.appendChild(tr);
    });

    // Totals row in tfoot
    tfoot.innerHTML = `
      <tr>
        <td colspan="2">TOTAL WORKING FLOOR POOL</td>
        <td class="num-col">${calc.totalWorkingHours.toFixed(1)} hrs</td>
        <td class="num-col">—</td>
        <td class="num-col">${calc.totalWeightedHours.toFixed(2)} pts</td>
        <td class="num-col">100.0%</td>
        <td class="num-col" style="color:#34D399;">${formatCurrency(sumCash)}</td>
        <td class="num-col" style="color:#93C5FD;">${formatCurrency(sumCc)}</td>
        <td class="num-col highlight-cell">${formatCurrency(sumTotal)}</td>
      </tr>
    `;
  }

  function renderReceiptModal() {
    const calc = calculateTipPool();

    const slipTotalPool = document.getElementById('slipTotalPool');
    const slipCashTips = document.getElementById('slipCashTips');
    const slipCcTips = document.getElementById('slipCcTips');
    const slipTotalHours = document.getElementById('slipTotalHours');
    const slipTotalWeighted = document.getElementById('slipTotalWeighted');
    const slipCrewList = document.getElementById('slipCrewList');
    const slipDate = document.getElementById('slipDate');
    const slipTimestamp = document.getElementById('slipTimestamp');
    const slipReconciliation = document.getElementById('slipReconciliation');

    if (slipTotalPool) slipTotalPool.textContent = formatCurrency(calc.totalTips);
    if (slipCashTips) slipCashTips.textContent = formatCurrency(calc.cashTips);
    if (slipCcTips) slipCcTips.textContent = formatCurrency(calc.ccTips);
    if (slipTotalHours) slipTotalHours.textContent = `${calc.totalWorkingHours.toFixed(1)} hrs`;
    if (slipTotalWeighted) slipTotalWeighted.textContent = `${calc.totalWeightedHours.toFixed(2)} pts`;

    const now = new Date();
    if (slipDate) slipDate.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (slipTimestamp) slipTimestamp.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (slipReconciliation) {
      slipReconciliation.textContent = `100.0% Exact Match (${formatCurrency(calc.reconciliationDiff)} var)`;
    }

    if (slipCrewList) {
      slipCrewList.innerHTML = '';
      calc.crew.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'slip-item';
        itemDiv.innerHTML = `
          <div class="slip-item-top">
            <span>${item.employee.name} (${item.role})</span>
            <span>${formatCurrency(item.totalPayout)}</span>
          </div>
          <div class="slip-item-sub">
            <span>${item.hoursWorked}h × ${item.weight.toFixed(1)}w = ${item.weightedHours.toFixed(1)} pts (${item.poolSharePercent.toFixed(1)}%)</span>
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
    renderRoleWeightSliders();
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
      <span style="font-weight:700;">${icon}</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 4000);
  }

  // =========================================================================
  // "Try It in 2 Minutes" Sample Scenario
  // =========================================================================

  function loadSampleScenario() {
    // Reset to clean baseline
    state.roster = JSON.parse(JSON.stringify(INITIAL_ROSTER));
    state.shifts = JSON.parse(JSON.stringify(INITIAL_SHIFTS));
    state.tips = { cash: 240.00, cc: 860.00 }; // $1,100 pool
    state.roleWeights = JSON.parse(JSON.stringify(DEFAULT_WEIGHTS));
    state.shiftHoursOverride = {};

    // Select Shift 1 (Jordan Miller - Server, 6.0 hrs) to illustrate swap engine immediately
    state.selectedShiftId = 'shift-1';
    state.candidateFilter = 'all';

    saveState();
    renderAll();

    // Switch to Tab 1 to see the swap engine in action
    switchTab('tabSwapValidator');

    showToast('⚡ Friday Dinner Rush loaded! Jordan Miller (Server) needs coverage. Check Maya Lin (Overtime Alert) & Elena (Safe).', 'warning');
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
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // Demo Scenario & Reset Buttons
    document.getElementById('btnQuickDemo')?.addEventListener('click', loadSampleScenario);
    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('Reset all shifts, roster weekly hours, and tip calculations back to original sample data?')) {
        resetState();
      }
    });

    // Candidate Filter Chips
    document.querySelector('.candidate-filters')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.candidateFilter = chip.getAttribute('data-filter') || 'all';
      renderSwapEnginePanel();
    });

    // Shift Card Clicks & Swap Approvals Delegation
    document.addEventListener('click', (e) => {
      // Toggle Swap Request
      const swapBtn = e.target.closest('[data-action="toggle-swap"]');
      if (swapBtn) {
        const shiftId = swapBtn.getAttribute('data-shift-id');
        if (state.selectedShiftId === shiftId) {
          state.selectedShiftId = null; // deselect
        } else {
          state.selectedShiftId = shiftId;
        }
        renderShiftCards();
        renderSwapEnginePanel();
        return;
      }

      // Approve Swap
      const approveBtn = e.target.closest('[data-action="approve-swap"]');
      if (approveBtn) {
        const candId = approveBtn.getAttribute('data-cand-id');
        const shiftId = approveBtn.getAttribute('data-shift-id');
        approveSwap(candId, shiftId);
        return;
      }

      // Edit Weekly Hours from Roster table
      const editBtn = e.target.closest('[data-action="edit-hours"]');
      if (editBtn) {
        const empId = editBtn.getAttribute('data-emp-id');
        const emp = getEmployeeById(empId);
        if (emp) {
          const newHoursStr = prompt(`Enter updated weekly hours logged for ${emp.name}:`, emp.weeklyHours);
          if (newHoursStr !== null) {
            const parsed = parseFloat(newHoursStr);
            if (!isNaN(parsed) && parsed >= 0) {
              emp.weeklyHours = parseFloat(parsed.toFixed(1));
              saveState();
              renderAll();
              showToast(`Updated ${emp.name}'s weekly hours to ${emp.weeklyHours}h.`, 'info');
            }
          }
        }
        return;
      }
    });

    // Tip Pool Inputs
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

    // Reset Weights
    document.getElementById('btnResetWeights')?.addEventListener('click', () => {
      state.roleWeights = JSON.parse(JSON.stringify(DEFAULT_WEIGHTS));
      saveState();
      renderRoleWeightSliders();
      renderTipCalculator();
      showToast('Role multipliers reset to restaurant standards.', 'info');
    });

    // Weight slider changes
    document.getElementById('roleWeightsList')?.addEventListener('input', (e) => {
      if (e.target.classList.contains('range-slider')) {
        const role = e.target.getAttribute('data-role');
        const val = parseFloat(e.target.value);
        if (role && !isNaN(val)) {
          state.roleWeights[role] = val;
          // Update badge next to slider
          const badge = e.target.parentElement.querySelector('.weight-val-badge');
          if (badge) badge.textContent = `${val.toFixed(1)}x`;
          saveState();
          renderTipCalculator();
        }
      }
    });

    // Actual Shift Hours Override (Late in/Early out)
    document.getElementById('tipPayoutTableBody')?.addEventListener('change', (e) => {
      if (e.target.classList.contains('shift-hour-input')) {
        const shiftId = e.target.getAttribute('data-shift-id');
        const val = parseFloat(e.target.value);
        if (shiftId && !isNaN(val) && val > 0) {
          state.shiftHoursOverride[shiftId] = val;
          saveState();
          renderTipCalculator();
          showToast(`Shift hours adjusted to ${val} hrs for tip allocation.`, 'info');
        }
      }
    });

    // Modal Actions (Print Slip)
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

    // Download text record
    document.getElementById('btnModalDownload')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `THE COPPER OAK BISTRO — SHIFT CLOSEOUT & TIP POOL\n`;
      text += `Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}\n`;
      text += `Total Tip Pool: ${formatCurrency(calc.totalTips)} (Cash: ${formatCurrency(calc.cashTips)} | CC: ${formatCurrency(calc.ccTips)})\n`;
      text += `--------------------------------------------------\n`;
      calc.crew.forEach(c => {
        text += `${c.employee.name.padEnd(18)} [${c.role.padEnd(10)}] | ${c.hoursWorked}h (${c.poolSharePercent.toFixed(1)}%) -> Cash: ${formatCurrency(c.cashPayout)} | CC: ${formatCurrency(c.ccPayout)} | Total: ${formatCurrency(c.totalPayout)}\n`;
      });
      text += `--------------------------------------------------\n`;
      text += `Penny Variance: ${formatCurrency(calc.reconciliationDiff)}\nFLSA Compliance: Passed (Managers Excluded)\n`;

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

    // Copy Summary to clipboard
    document.getElementById('btnCopySummaryBtn')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `✦ SHIFT TIP POOL SUMMARY ✦\n`;
      text += `Total Pool: ${formatCurrency(calc.totalTips)} (Cash: ${formatCurrency(calc.cashTips)} | CC: ${formatCurrency(calc.ccTips)})\n`;
      calc.crew.forEach(c => {
        text += `• ${c.employee.name} (${c.role}): Total ${formatCurrency(c.totalPayout)} (Cash ${formatCurrency(c.cashPayout)}, CC ${formatCurrency(c.ccPayout)})\n`;
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

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
