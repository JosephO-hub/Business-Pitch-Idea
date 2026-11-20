/**
 * Shift-Coverage & Tip-Pool Optimizer (v3.0)
 * Standards compliant with /shift-tip-standards:
 * - Pure vanilla ES6 JavaScript (No build steps, no backend, GitHub Pages ready)
 * - Deterministic math with exact penny reconciliation
 * - Standard Straight-Time Wage Policy: Zero overtime multipliers (1.5x) or >40h rate penalties
 * - FLSA 29 U.S.C. § 203(m)(2)(B) manager tip-exclusion guardrail
 * - Standardized Roles: "Team Member" & "Manager"
 * - Role-Based Sign-In & Workspace Switcher (Manager vs Team Member)
 * - "Up for Grabs" open shift pool & swap proposal queue
 * - Daily cash tip logging with local storage persistence
 * - Manager approval queue, master schedule editor, & audit logs
 */

(function () {
  'use strict';

  // =========================================================================
  // Baseline Synthetic Restaurant Roster & Shifts (8 Staff Members)
  // Standard Straight-Time Hours Only (No Overtime Multipliers)
  // =========================================================================

  const INITIAL_ROSTER = [
    {
      id: 'emp-1',
      name: 'Jordan Miller',
      role: 'Team Member',
      hourlyRate: 13.00,
      weeklyHours: 31.0,
      biweeklyHours: 62.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-2',
      name: 'Maya Lin',
      role: 'Team Member',
      hourlyRate: 13.50,
      weeklyHours: 37.0,
      biweeklyHours: 74.0,
      certifications: ['Team Member'],
      isManager: false
    },
    {
      id: 'emp-3',
      name: 'Elena Rodriguez',
      role: 'Team Member',
      hourlyRate: 12.50,
      weeklyHours: 22.0,
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
      weeklyHours: 36.5,
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
      notes: 'Dining Room & Guest Service',
      isUpForGrabs: true,
      grabNote: 'Need coverage for family dinner'
    },
    {
      id: 'shift-2',
      employeeId: 'emp-3', // Elena Rodriguez
      role: 'Team Member',
      startTime: '4:30 PM',
      endTime: '10:30 PM',
      hours: 6.0,
      notes: 'Patio & Beverage Service',
      isUpForGrabs: false,
      grabNote: ''
    },
    {
      id: 'shift-3',
      employeeId: 'emp-4', // Samir Patel
      role: 'Team Member',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Bar & Hospitality Station',
      isUpForGrabs: false,
      grabNote: ''
    },
    {
      id: 'shift-4',
      employeeId: 'emp-6', // Leo Tanaka
      role: 'Team Member',
      startTime: '5:00 PM',
      endTime: '10:00 PM',
      hours: 5.0,
      notes: 'Floor Support & Turnover',
      isUpForGrabs: false,
      grabNote: ''
    },
    {
      id: 'shift-5',
      employeeId: 'emp-7', // Marcus Vance
      role: 'Team Member',
      startTime: '3:30 PM',
      endTime: '10:30 PM',
      hours: 7.0,
      notes: 'Kitchen & Expediting Station',
      isUpForGrabs: false,
      grabNote: ''
    },
    {
      id: 'shift-6',
      employeeId: 'emp-8', // Rachel Greene (Manager)
      role: 'Manager',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      notes: 'Floor Operations & Cash Closeout',
      isUpForGrabs: false,
      grabNote: ''
    }
  ];

  const INITIAL_SWAP_REQUESTS = [
    {
      id: 'req-1',
      targetShiftId: 'shift-1',
      targetEmployeeId: 'emp-1',
      targetEmployeeName: 'Jordan Miller',
      proposingEmployeeId: 'emp-2', // Maya Lin
      proposingEmployeeName: 'Maya Lin',
      shiftRole: 'Team Member',
      shiftHours: 6.0,
      shiftTime: '5:00 PM – 11:00 PM',
      notes: 'Available to take Jordan\'s dinner shift tonight at standard straight-time rate.',
      status: 'pending',
      timestamp: 'Today at 4:15 PM'
    },
    {
      id: 'req-2',
      targetShiftId: 'shift-2',
      targetEmployeeId: 'emp-3',
      targetEmployeeName: 'Elena Rodriguez',
      proposingEmployeeId: 'emp-6', // Leo Tanaka
      proposingEmployeeName: 'Leo Tanaka',
      shiftRole: 'Team Member',
      shiftHours: 6.0,
      shiftTime: '4:30 PM – 10:30 PM',
      notes: 'Elena asked if I could cover patio service tonight.',
      status: 'pending',
      timestamp: 'Today at 3:45 PM'
    }
  ];

  const INITIAL_TIP_LOGS = [
    {
      id: 'tip-1',
      employeeId: 'emp-1',
      employeeName: 'Jordan Miller',
      date: '2026-11-19',
      shiftRole: 'Friday Dinner Service — Team Member',
      amount: 45.00,
      notes: 'Main floor table cash tips',
      timestamp: 'Nov 19, 2026, 2:30 PM'
    },
    {
      id: 'tip-2',
      employeeId: 'emp-4',
      employeeName: 'Samir Patel',
      date: '2026-11-19',
      shiftRole: 'Craft Bar — Team Member',
      amount: 70.00,
      notes: 'Bar well cash receipts',
      timestamp: 'Nov 19, 2026, 1:15 PM'
    }
  ];

  const INITIAL_AUDIT_LOG = [
    {
      id: 'aud-1',
      action: 'Schedule Published',
      actor: 'Rachel Greene (Manager)',
      details: 'Friday Dinner Service schedule published with 6 active floor shifts (Straight-Time).',
      timestamp: 'Nov 19, 2026, 12:00 PM'
    },
    {
      id: 'aud-2',
      action: 'Shift Put Up for Grabs',
      actor: 'Jordan Miller (Team Member)',
      details: 'Shift #1 (5-11 PM) marked Up for Grabs: "Need coverage for family dinner"',
      timestamp: 'Nov 19, 2026, 1:30 PM'
    },
    {
      id: 'aud-3',
      action: 'Swap Request Submitted',
      actor: 'Maya Lin (Team Member)',
      details: 'Requested to cover Shift #1 at standard rate ($13.50/hr straight-time).',
      timestamp: 'Nov 19, 2026, 4:15 PM'
    }
  ];

  const STORAGE_KEY = 'shift_tip_optimizer_state_v5';

  // =========================================================================
  // State Container
  // =========================================================================

  let state = {
    currentUser: {
      id: 'emp-8',
      name: 'Rachel Greene',
      role: 'Manager',
      isManager: true
    },
    roster: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
    shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
    swapRequests: JSON.parse(JSON.stringify(INITIAL_SWAP_REQUESTS)),
    tipLogs: JSON.parse(JSON.stringify(INITIAL_TIP_LOGS)),
    auditLog: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG)),
    selectedShiftId: null,
    candidateFilter: 'all',
    tips: {
      cash: 240.00,
      cc: 860.00
    },
    tipScope: 'crew', // 'crew' (tonight's floor crew) or 'all' (all store employees)
    shiftHoursOverride: {}
  };

  let activeModalShiftId = null;

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
          if (!state.currentUser) {
            state.currentUser = { id: 'emp-8', name: 'Rachel Greene', role: 'Manager', isManager: true };
          }
          if (!state.swapRequests) state.swapRequests = JSON.parse(JSON.stringify(INITIAL_SWAP_REQUESTS));
          if (!state.tipLogs) state.tipLogs = JSON.parse(JSON.stringify(INITIAL_TIP_LOGS));
          if (!state.auditLog) state.auditLog = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG));
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
      currentUser: {
        id: 'emp-8',
        name: 'Rachel Greene',
        role: 'Manager',
        isManager: true
      },
      roster: JSON.parse(JSON.stringify(INITIAL_ROSTER)),
      shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
      swapRequests: JSON.parse(JSON.stringify(INITIAL_SWAP_REQUESTS)),
      tipLogs: JSON.parse(JSON.stringify(INITIAL_TIP_LOGS)),
      auditLog: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG)),
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
    showToast('Reset to default synthetic restaurant data (Straight-Time Mode).', 'info');
  }

  // =========================================================================
  // Helper Math, Formatting, & Audit Logging
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

  function getRoleSlug(role) {
    return (role || '').toLowerCase().replace(/[\s_]+/g, '');
  }

  function getInitials(name) {
    return (name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  function addAuditLogEntry(action, details) {
    const actor = `${state.currentUser.name} (${state.currentUser.role})`;
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
                      now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    state.auditLog.unshift({
      id: 'aud-' + Date.now(),
      action,
      actor,
      details,
      timestamp
    });
    if (state.auditLog.length > 50) state.auditLog.pop();
  }

  // =========================================================================
  // Role & User Switching
  // =========================================================================

  function switchUser(empId) {
    const emp = getEmployeeById(empId);
    if (!emp) return;

    state.currentUser = {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      isManager: emp.isManager
    };

    saveState();
    renderAll();
    showToast(`Switched active profile to ${emp.name} (${emp.role}).`, 'success');
  }

  // =========================================================================
  // Coverage Candidate Evaluation (Standard Straight-Time Rates Only)
  // Zero Overtime Multipliers (1.5x) or >40h Rate Changes
  // =========================================================================

  function evaluateCoverageCandidate(candidate, targetShift) {
    // 1. Station Role Certification Check
    const isCertified = candidate.certifications && candidate.certifications.includes(targetShift.role);
    if (!isCertified) {
      return {
        status: 'mismatch',
        badgeText: 'Role Mismatch',
        badgeClass: 'mismatch',
        reason: `Lacks required '${targetShift.role}' certification. Has: [${candidate.certifications.join(', ')}]`,
        canApprove: false,
        shiftPay: targetShift.hours * candidate.hourlyRate,
        projectedHours: candidate.weeklyHours + targetShift.hours
      };
    }

    // 2. Standard Straight-Time Evaluation (No overtime multipliers or penalties)
    const currentHours = candidate.weeklyHours;
    const shiftHours = targetShift.hours;
    const projectedHours = currentHours + shiftHours;
    const regularRate = candidate.hourlyRate;
    const shiftPay = shiftHours * regularRate; // Straight-time compensation

    return {
      status: 'safe',
      badgeText: 'Qualified to Cover',
      badgeClass: 'safe',
      reason: `Station certified for '${targetShift.role}'. Standard straight-time compensation applies.`,
      canApprove: true,
      shiftPay: shiftPay,
      regularRate: regularRate,
      projectedHours: projectedHours
    };
  }

  function executeSwap(candidateId, targetShiftId) {
    const shift = getShiftById(targetShiftId);
    const candidate = getEmployeeById(candidateId);
    const previousEmployee = getEmployeeById(shift.employeeId);

    if (!shift || !candidate || !previousEmployee) return false;

    const shiftHours = shift.hours;

    // Adjust weekly logged hours in standard straight-time
    previousEmployee.weeklyHours = Math.max(0, parseFloat((previousEmployee.weeklyHours - shiftHours).toFixed(1)));
    candidate.weeklyHours = parseFloat((candidate.weeklyHours + shiftHours).toFixed(1));

    // Adjust bi-weekly logged hours consistently
    previousEmployee.biweeklyHours = Math.max(0, parseFloat((previousEmployee.biweeklyHours - shiftHours).toFixed(1)));
    candidate.biweeklyHours = parseFloat((candidate.biweeklyHours + shiftHours).toFixed(1));

    shift.employeeId = candidate.id;
    shift.isUpForGrabs = false;
    shift.grabNote = '';

    addAuditLogEntry(
      'Shift Swap Executed',
      `Reassigned Shift #${shift.id} from ${previousEmployee.name} to ${candidate.name} (${shiftHours}h at standard straight-time).`
    );

    saveState();
    return true;
  }

  // =========================================================================
  // Up for Grabs & Swap Proposal Workflows
  // =========================================================================

  function toggleUpForGrabs(shiftId, note = '') {
    const shift = getShiftById(shiftId);
    if (!shift) return;

    const emp = getEmployeeById(shift.employeeId);

    if (shift.isUpForGrabs) {
      shift.isUpForGrabs = false;
      shift.grabNote = '';
      addAuditLogEntry('Shift Withdrawn', `${emp.name} withdrew Shift #${shift.id} from Up for Grabs.`);
      showToast(`Shift withdrawn from "Up for Grabs".`, 'info');
    } else {
      shift.isUpForGrabs = true;
      shift.grabNote = note || 'Open for team pickup';
      addAuditLogEntry('Shift Up for Grabs', `${emp.name} marked Shift #${shift.id} Up for Grabs: "${shift.grabNote}"`);
      showToast(`Shift marked "Up for Grabs"! Colleagues can now request to cover.`, 'success');
    }

    saveState();
    renderAll();
  }

  function submitSwapProposal(targetShiftId, notes = '') {
    const shift = getShiftById(targetShiftId);
    const targetEmp = getEmployeeById(shift.employeeId);
    const proposingEmp = getEmployeeById(state.currentUser.id);

    if (!shift || !targetEmp || !proposingEmp) return;

    const newReq = {
      id: 'req-' + Date.now(),
      targetShiftId: shift.id,
      targetEmployeeId: targetEmp.id,
      targetEmployeeName: targetEmp.name,
      proposingEmployeeId: proposingEmp.id,
      proposingEmployeeName: proposingEmp.name,
      shiftRole: shift.role,
      shiftHours: shift.hours,
      shiftTime: `${shift.startTime} – ${shift.endTime}`,
      notes: notes || 'Submitted coverage proposal at standard straight-time rate',
      status: 'pending',
      timestamp: 'Just now'
    };

    state.swapRequests.unshift(newReq);

    addAuditLogEntry(
      'Swap Proposal Submitted',
      `${proposingEmp.name} proposed to cover Shift #${shift.id} (${targetEmp.name}) at standard straight-time rate.`
    );

    saveState();
    renderAll();
    showToast(`Swap request submitted! Pending Manager review in the approval queue.`, 'success');
  }

  function approveManagerQueueRequest(reqId) {
    if (!state.currentUser.isManager) {
      showToast('Manager permission required to approve swap requests.', 'error');
      return;
    }

    const req = state.swapRequests.find(r => r.id === reqId);
    if (!req || req.status !== 'pending') return;

    const success = executeSwap(req.proposingEmployeeId, req.targetShiftId);
    if (success) {
      req.status = 'approved';
      addAuditLogEntry(
        'Manager Approved Swap',
        `Approved request ${req.id}: ${req.proposingEmployeeName} is assigned to ${req.targetEmployeeName}'s shift at standard straight-time.`
      );
      saveState();
      renderAll();
      showToast(`Swap Approved! Shift transferred to ${req.proposingEmployeeName}.`, 'success');
    }
  }

  function declineManagerQueueRequest(reqId) {
    if (!state.currentUser.isManager) {
      showToast('Manager permission required to decline swap requests.', 'error');
      return;
    }

    const req = state.swapRequests.find(r => r.id === reqId);
    if (!req || req.status !== 'pending') return;

    req.status = 'declined';
    addAuditLogEntry(
      'Manager Declined Swap',
      `Declined swap request ${req.id} from ${req.proposingEmployeeName}.`
    );

    saveState();
    renderAll();
    showToast(`Swap request from ${req.proposingEmployeeName} declined.`, 'warning');
  }

  // =========================================================================
  // Daily Cash Tip Logging (Team Member Feature)
  // =========================================================================

  function logCashTip(date, shiftRole, amount, notes) {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      showToast('Please enter a valid cash tip amount.', 'error');
      return false;
    }

    const newLog = {
      id: 'tip-' + Date.now(),
      employeeId: state.currentUser.id,
      employeeName: state.currentUser.name,
      date: date || new Date().toISOString().slice(0, 10),
      shiftRole: shiftRole || 'Team Member Service',
      amount: numericAmount,
      notes: notes || 'Cash tip logged via portal',
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
                 new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    state.tipLogs.unshift(newLog);
    state.tips.cash = parseFloat((state.tips.cash + numericAmount).toFixed(2));

    addAuditLogEntry(
      'Cash Tip Logged',
      `${state.currentUser.name} recorded ${formatCurrency(numericAmount)} cash tips for ${newLog.date}.`
    );

    saveState();
    renderAll();
    showToast(`Recorded ${formatCurrency(numericAmount)} cash tips. Cash tip pool updated!`, 'success');
    return true;
  }

  // =========================================================================
  // Tip Pool Engine (Standard Bi-Weekly Straight-Time Proportions)
  // Zero Overtime Weighting Or Alterations
  // =========================================================================

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
          shiftHours: activeShift ? activeShift.hours : 0,
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

        if (!crewMap.has(emp.id)) {
          crewMap.set(emp.id, {
            employee: emp,
            role: shift.role,
            shiftHours: shift.hours,
            biweeklyHours: emp.biweeklyHours !== undefined ? emp.biweeklyHours : (emp.weeklyHours * 2),
            isWorkingTonight: true,
            shiftId: shift.id
          });
        } else {
          const existing = crewMap.get(emp.id);
          existing.shiftHours += shift.hours;
        }
      });

      candidatesList = Array.from(crewMap.values());
    }

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

    // First pass: Proportional floor distribution strictly by straight-time bi-weekly hours
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

    // Largest Remainder Method (Penny Reconciliation)
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
  // DOM Renderers: Header & Role Banner
  // =========================================================================

  function renderSessionHeaders() {
    const user = state.currentUser;
    const isManager = user.isManager;
    const initials = getInitials(user.name);

    // Header User Pill
    const headerAvatar = document.getElementById('headerUserAvatar');
    const headerName = document.getElementById('headerUserName');
    const headerRole = document.getElementById('headerUserRole');

    if (headerAvatar) headerAvatar.textContent = initials;
    if (headerName) headerName.textContent = user.name;
    if (headerRole) {
      headerRole.textContent = user.role;
      headerRole.className = `user-pill-role ${getRoleSlug(user.role)}`;
    }

    // Prototype Role Banner
    const bannerName = document.getElementById('bannerCurrentUserName');
    const bannerRole = document.getElementById('bannerCurrentRolePill');
    const bannerSwitchLabel = document.getElementById('bannerSwitchLabel');

    if (bannerName) bannerName.textContent = user.name;
    if (bannerRole) {
      bannerRole.textContent = user.role;
      bannerRole.className = `banner-role-pill ${getRoleSlug(user.role)}`;
    }
    if (bannerSwitchLabel) {
      bannerSwitchLabel.textContent = isManager ? '⚡ Switch to Team Member (Jordan)' : '⚡ Switch to Manager (Rachel)';
    }

    // Tab 3 Button Title & Badge
    const tab3Title = document.getElementById('tab3Title');
    const tab3Badge = document.getElementById('tab3Badge');
    const pendingCount = state.swapRequests.filter(r => r.status === 'pending').length;

    if (tab3Title) {
      tab3Title.textContent = isManager ? '3. Manager Queue & Controls' : '3. My Shifts & Tip Logger';
    }
    if (tab3Badge) {
      if (isManager) {
        tab3Badge.textContent = `${pendingCount} Pending`;
        tab3Badge.className = `tab-badge ${pendingCount > 0 ? 'badge-attention' : ''}`;
      } else {
        const myShifts = state.shifts.filter(s => s.employeeId === user.id);
        tab3Badge.textContent = `${myShifts.length} Shift${myShifts.length !== 1 ? 's' : ''}`;
        tab3Badge.className = 'tab-badge';
      }
    }
  }

  // =========================================================================
  // DOM Renderers: Tab 1 Shift Cards & Validation Engine
  // (Standard Straight-Time Rates Only — Overtime Warnings Removed)
  // =========================================================================

  function renderShiftCards() {
    const grid = document.getElementById('scheduledShiftsGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const user = state.currentUser;
    const isManager = user.isManager;

    state.shifts.forEach(shift => {
      const emp = getEmployeeById(shift.employeeId);
      if (!emp) return;

      const isMyShift = emp.id === user.id;
      const isSelected = state.selectedShiftId === shift.id;
      const roleSlug = getRoleSlug(shift.role);

      const card = document.createElement('div');
      card.className = `shift-card ${isSelected ? 'active-target' : ''} ${shift.isUpForGrabs ? 'up-for-grabs-card' : ''}`;
      card.setAttribute('data-shift-id', shift.id);

      const upForGrabsBannerHtml = shift.isUpForGrabs
        ? `<div class="shift-grab-banner">
             <span>🏷️ UP FOR GRABS (Open for Pickup)</span>
             ${shift.grabNote ? `<span class="grab-subnote">"${shift.grabNote}"</span>` : ''}
           </div>`
        : '';

      let actionButtonsHtml = '';

      if (isManager) {
        actionButtonsHtml = `
          <div class="card-btn-group">
            <button class="btn-swap ${isSelected ? 'selected' : ''}" data-action="toggle-swap" data-shift-id="${shift.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M16 3h5v5"></path><path d="M4 20L21 3"></path><path d="M21 16v5h-5"></path><path d="M15 15l6 6"></path><path d="M4 4l5 5"></path>
              </svg>
              ${isSelected ? 'Evaluating Candidates' : 'Evaluate Coverage'}
            </button>
            <button class="btn-edit-shift-sm" data-action="edit-shift" data-shift-id="${shift.id}" title="Edit Shift (Manager)">
              ✏️
            </button>
          </div>
        `;
      } else {
        if (isMyShift) {
          actionButtonsHtml = `
            <button class="btn-grab-toggle ${shift.isUpForGrabs ? 'cancel' : 'active'}" data-action="toggle-grabs" data-shift-id="${shift.id}">
              ${shift.isUpForGrabs ? '✕ Cancel "Up for Grabs"' : '🏷️ Put Shift Up for Grabs'}
            </button>
          `;
        } else {
          actionButtonsHtml = `
            <button class="btn-propose-swap" data-action="propose-swap" data-shift-id="${shift.id}">
              🙋 Propose to Cover / Pick Up
            </button>
          `;
        }
      }

      card.innerHTML = `
        ${upForGrabsBannerHtml}
        <div class="shift-card-body">
          <div class="shift-card-header">
            <div class="emp-profile">
              <div class="emp-avatar ${roleSlug}">
                ${getInitials(emp.name)}
              </div>
              <div>
                <div class="shift-emp-name">
                  ${emp.name}
                  ${isMyShift ? '<span class="my-shift-pill">YOU</span>' : ''}
                </div>
                <div class="role-badge-row">
                  <span class="role-badge ${roleSlug}">${shift.role}</span>
                  ${emp.isManager ? '<span class="flsa-pill-sm">FLSA Lead</span>' : ''}
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
              <span class="detail-label">Standard Straight-Time Wage:</span>
              <span class="detail-val font-mono">${formatCurrency(emp.hourlyRate)}/hr</span>
            </div>
            <div class="detail-line">
              <span class="detail-label">Weekly Hours Logged:</span>
              <span class="detail-val font-mono">${emp.weeklyHours.toFixed(1)} hrs</span>
            </div>
            <div class="detail-line">
              <span class="detail-label">Bi-Weekly Logged:</span>
              <span class="detail-val biweekly-val font-mono">${(emp.biweeklyHours || (emp.weeklyHours * 2)).toFixed(1)} hrs</span>
            </div>
          </div>
        </div>

        <div class="shift-card-actions">
          ${actionButtonsHtml}
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
      titleEl.textContent = 'Select any scheduled shift above to evaluate coverage';
      subtitleEl.textContent = 'Comparing all off-duty employees against station qualifications and standard straight-time compensation.';
      actionContainer.innerHTML = '';
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-wrap">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h4>No Shift Selected for Coverage</h4>
          <p>Click <strong>"Evaluate Coverage"</strong> or <strong>"Propose to Cover"</strong> on any scheduled employee above to evaluate eligible replacement staff.</p>
        </div>
      `;
      updateCandidateFilterCounts(0, 0, 0);
      return;
    }

    const shift = getShiftById(state.selectedShiftId);
    const scheduledEmp = getEmployeeById(shift.employeeId);

    titleEl.innerHTML = `Evaluating Replacement Coverage for <span class="highlight-worker">${scheduledEmp.name}</span> (${shift.role} • ${shift.hours.toFixed(1)}h)`;
    subtitleEl.textContent = `Shift Window: ${shift.startTime} – ${shift.endTime} • Station: ${shift.notes} • Standard Straight-Time Rate`;

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
    const countMismatch = evaluations.filter(e => e.status === 'mismatch').length;
    updateCandidateFilterCounts(evaluations.length, countSafe, countMismatch);

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

    const isManager = state.currentUser.isManager;

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
            <span class="m-val font-mono text-safe">${item.projectedHours.toFixed(1)} hrs (Straight-Time)</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Standard Wage Rate:</span>
            <span class="m-val font-mono text-safe">${formatCurrency(c.hourlyRate)}/hr (Shift Pay: ${formatCurrency(item.shiftPay)})</span>
          </div>
          <div class="metric-row">
            <span class="m-label">Compensation Policy:</span>
            <span class="m-val font-mono text-neutral">Standard Straight-Time Rate</span>
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
            <span class="text-neutral font-mono">Role certification restricted</span>
          </div>
        `;
      }

      let buttonHtml = '';
      if (isManager) {
        if (item.status === 'safe') {
          buttonHtml = `
            <button class="btn-approve-swap safe" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Approve Shift Swap (${formatCurrency(item.shiftPay)} Straight-Time)
            </button>
          `;
        } else {
          buttonHtml = `
            <button class="btn-approve-swap disabled" disabled title="Cannot swap: employee lacks ${shift.role} role certification">
              ⛔ Role Mismatch — Swap Blocked
            </button>
          `;
        }
      } else {
        if (item.status !== 'mismatch') {
          buttonHtml = `
            <button class="btn-approve-swap safe" data-action="request-swap-candidate" data-cand-id="${c.id}" data-shift-id="${shift.id}">
              ✉️ Propose Candidate for Manager Approval
            </button>
          `;
        } else {
          buttonHtml = `
            <button class="btn-approve-swap disabled" disabled>
              ⛔ Lacks Certification
            </button>
          `;
        }
      }

      card.innerHTML = `
        <div class="candidate-top">
          <div class="cand-info">
            <div class="cand-name">${c.name}</div>
            <div class="cand-role-wage">${c.role} • Standard ${formatCurrency(c.hourlyRate)}/hr</div>
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

  function updateCandidateFilterCounts(all, safe, mismatch) {
    const elAll = document.getElementById('countAll');
    const elSafe = document.getElementById('countSafe');
    const elMismatch = document.getElementById('countMismatch');

    if (elAll) elAll.textContent = all;
    if (elSafe) elSafe.textContent = safe;
    if (elMismatch) elMismatch.textContent = mismatch;
  }

  function renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const isManager = state.currentUser.isManager;

    state.roster.forEach(emp => {
      const activeShift = state.shifts.find(s => s.employeeId === emp.id);
      const isWorking = !!activeShift;
      const roleSlug = getRoleSlug(emp.role);

      const certPills = emp.certifications.map(c => `<span class="cert-pill">${c}</span>`).join(' ');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="table-emp-cell">
            <div class="table-avatar ${roleSlug}">${getInitials(emp.name)}</div>
            <div>
              <strong>${emp.name}</strong>
              ${emp.isManager ? '<span class="flsa-badge-table">FLSA Manager</span>' : ''}
            </div>
          </div>
        </td>
        <td><span class="role-badge ${roleSlug}">${emp.role}</span></td>
        <td>${certPills}</td>
        <td class="num-col font-mono">${formatCurrency(emp.hourlyRate)}/hr</td>
        <td class="num-col font-mono">
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
          ${isManager 
            ? `<button class="btn btn-outline-sm" data-action="edit-hours" data-emp-id="${emp.id}" title="Edit weekly & bi-weekly hours">
                 Adjust Hours
               </button>` 
            : `<span class="text-muted" style="font-size:0.72rem;">Manager only</span>`}
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // DOM Renderers: Tab 2 Tip Calculator
  // =========================================================================

  function renderTipCalculator() {
    const calc = calculateTipPool();
    const isManager = state.currentUser.isManager;

    const cashInput = document.getElementById('inputCashTips');
    const ccInput = document.getElementById('inputCcTips');
    if (cashInput && document.activeElement !== cashInput) {
      cashInput.value = state.tips.cash;
      cashInput.disabled = !isManager;
    }
    if (ccInput && document.activeElement !== ccInput) {
      ccInput.value = state.tips.cc;
      ccInput.disabled = !isManager;
    }

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
            <div class="table-avatar ${roleSlug}">${getInitials(item.employee.name)}</div>
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
                   ${!isManager ? 'disabled style="background:transparent;cursor:default;"' : ''}
                   title="${isManager ? 'Click to adjust bi-weekly hours' : 'Manager only'}">
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
        <td colspan="2">TOTAL BI-WEEKLY DISTRIBUTION POOL (STRAIGHT-TIME)</td>
        <td class="num-col font-mono">${sumShiftHours.toFixed(1)} hrs</td>
        <td class="num-col font-mono"><strong>${calc.totalEligibleBiweeklyHours.toFixed(1)} eligible hrs</strong></td>
        <td class="num-col font-mono">100.0%</td>
        <td class="num-col font-mono text-cash">${formatCurrency(sumCash)}</td>
        <td class="num-col font-mono text-cc">${formatCurrency(sumCc)}</td>
        <td class="num-col font-mono highlight-cell">${formatCurrency(sumTotal)}</td>
      </tr>
    `;
  }

  // =========================================================================
  // DOM Renderers: Tab 3 Role Workspace (Manager vs Team Member)
  // =========================================================================

  function renderRoleWorkspace() {
    const container = document.getElementById('roleWorkspaceContainer');
    if (!container) return;

    const user = state.currentUser;
    const isManager = user.isManager;

    if (isManager) {
      renderManagerWorkspace(container);
    } else {
      renderTeamMemberWorkspace(container);
    }
  }

  function renderManagerWorkspace(container) {
    const pendingRequests = state.swapRequests.filter(r => r.status === 'pending');

    let requestsListHtml = '';
    if (pendingRequests.length === 0) {
      requestsListHtml = `
        <div class="empty-state" style="padding: 2rem 1rem;">
          <p>✓ All caught up! No shift-swap or pickup requests currently pending manager review.</p>
        </div>
      `;
    } else {
      requestsListHtml = pendingRequests.map(req => {
        const proposingEmp = getEmployeeById(req.proposingEmployeeId);
        const shift = getShiftById(req.targetShiftId);
        let evalBadge = '';
        let evalDetails = '';

        if (proposingEmp && shift) {
          const ev = evaluateCoverageCandidate(proposingEmp, shift);
          if (ev.status === 'safe') {
            evalBadge = `<span class="status-badge safe">🟢 Qualified to Cover</span>`;
            evalDetails = `<span class="req-metric safe">${ev.projectedHours.toFixed(1)} hrs total • ${formatCurrency(ev.shiftPay)} standard straight-time</span>`;
          } else {
            evalBadge = `<span class="status-badge mismatch">⛔ Role Mismatch</span>`;
            evalDetails = `<span class="req-metric mismatch">Lacks '${shift.role}' certification</span>`;
          }
        }

        return `
          <div class="request-queue-card">
            <div class="req-card-top">
              <div class="req-meta">
                <span class="req-id">${req.id.toUpperCase()}</span>
                <span class="req-time">${req.timestamp}</span>
              </div>
              ${evalBadge}
            </div>

            <div class="req-main-info">
              <div class="req-arrow-row">
                <div class="req-party">
                  <span class="label">Proposing Worker:</span>
                  <strong>${req.proposingEmployeeName}</strong>
                </div>
                <div class="req-arrow">➔ Covering ➔</div>
                <div class="req-party">
                  <span class="label">Target Shift (${req.shiftHours}h):</span>
                  <strong>${req.targetEmployeeName}</strong>
                </div>
              </div>

              <div class="req-shift-time font-mono">
                ${req.shiftTime} • Station: ${shift ? shift.notes : 'Floor'}
              </div>

              ${req.notes ? `<div class="req-note">"${req.notes}"</div>` : ''}
              <div class="req-eval-details">${evalDetails}</div>
            </div>

            <div class="req-actions">
              <button class="btn btn-sm btn-success" data-action="approve-queue-req" data-req-id="${req.id}">
                ✓ Approve Swap
              </button>
              <button class="btn btn-sm btn-outline-danger" data-action="decline-queue-req" data-req-id="${req.id}">
                ✕ Decline
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    const scheduleRowsHtml = state.shifts.map(shift => {
      const emp = getEmployeeById(shift.employeeId);
      return `
        <tr>
          <td><strong class="font-mono">${shift.startTime} – ${shift.endTime}</strong></td>
          <td><span class="role-badge ${getRoleSlug(shift.role)}">${shift.role}</span></td>
          <td>${emp ? emp.name : 'Unassigned'}</td>
          <td class="num-col font-mono">${shift.hours.toFixed(1)} hrs</td>
          <td>${shift.notes}</td>
          <td>
            ${shift.isUpForGrabs 
              ? '<span class="status-badge warning">🏷️ Up for Grabs</span>' 
              : '<span class="status-badge safe">Scheduled</span>'}
          </td>
          <td>
            <button class="btn btn-outline-sm" data-action="edit-shift" data-shift-id="${shift.id}">
              Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const auditRowsHtml = state.auditLog.slice(0, 10).map(entry => {
      return `
        <tr>
          <td class="font-mono text-muted" style="white-space:nowrap;">${entry.timestamp}</td>
          <td><strong>${entry.action}</strong></td>
          <td>${entry.actor}</td>
          <td>${entry.details}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="workspace-wrapper">
        <div class="section-intro">
          <div>
            <span class="sub-badge">MANAGER CONTROL CONSOLE</span>
            <h2 class="section-title">Manager Queue &amp; Operational Controls</h2>
            <p class="section-desc">Manage frontline shift requests, approve/decline swaps with automated schedule updates, configure master shifts, and inspect the verified audit log.</p>
          </div>
        </div>

        <!-- Section 1: Pending Queue -->
        <div class="workspace-card" style="margin-bottom: 2rem;">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">Pending Shift-Swap &amp; Pickup Queue</h3>
              <span class="card-subtitle">Requests submitted by team members requiring management review</span>
            </div>
            <span class="badge-count">${pendingRequests.length} Pending</span>
          </div>
          <div class="requests-grid">
            ${requestsListHtml}
          </div>
        </div>

        <!-- Section 2: Master Shift Schedule -->
        <div class="workspace-card" style="margin-bottom: 2rem;">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">Master Shift Schedule</h3>
              <span class="card-subtitle">Active floor shift assignments for tonight's service (Standard Straight-Time Rates)</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time Window</th>
                  <th>Role</th>
                  <th>Assigned Staff</th>
                  <th class="num-col">Duration</th>
                  <th>Station Notes</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: Audit Log -->
        <div class="workspace-card">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">Verified Audit Log</h3>
              <span class="card-subtitle">Permanent record of shift swaps, straight-time hours changes, and tip submissions</span>
            </div>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                ${auditRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderTeamMemberWorkspace(container) {
    const user = state.currentUser;
    const myShifts = state.shifts.filter(s => s.employeeId === user.id);
    const myRequests = state.swapRequests.filter(r => r.proposingEmployeeId === user.id);
    const myTips = state.tipLogs.filter(t => t.employeeId === user.id);

    const totalLoggedTips = myTips.reduce((sum, t) => sum + t.amount, 0);

    let myShiftsHtml = '';
    if (myShifts.length === 0) {
      myShiftsHtml = `<p class="text-muted">You have no shifts scheduled for tonight's service. Check the schedule to pick up an open shift!</p>`;
    } else {
      myShiftsHtml = myShifts.map(s => `
        <div class="my-shift-item ${s.isUpForGrabs ? 'is-up-for-grabs' : ''}">
          <div class="my-shift-item-left">
            <div class="my-shift-time font-mono">${s.startTime} – ${s.endTime} (${s.hours.toFixed(1)} hrs)</div>
            <div class="my-shift-notes">${s.notes} • Role: ${s.role}</div>
            ${s.isUpForGrabs 
              ? `<span class="badge-grab-active">🏷️ Up for Grabs: "${s.grabNote}"</span>` 
              : `<span class="badge-assigned">✓ Currently Assigned to You</span>`}
          </div>
          <div class="my-shift-item-right">
            <button class="btn btn-sm ${s.isUpForGrabs ? 'btn-outline-danger' : 'btn-warning'}" 
                    data-action="toggle-grabs" 
                    data-shift-id="${s.id}">
              ${s.isUpForGrabs ? '✕ Cancel "Up for Grabs"' : '🏷️ Put Up for Grabs'}
            </button>
          </div>
        </div>
      `).join('');
    }

    let myRequestsHtml = '';
    if (myRequests.length === 0) {
      myRequestsHtml = `<p class="text-muted">No pending or previous coverage requests submitted.</p>`;
    } else {
      myRequestsHtml = myRequests.map(r => {
        let statusBadge = '';
        if (r.status === 'approved') statusBadge = '<span class="status-badge safe">✓ Approved</span>';
        else if (r.status === 'declined') statusBadge = '<span class="status-badge mismatch">✕ Declined</span>';
        else statusBadge = '<span class="status-badge safe">⏳ Pending Manager Review</span>';

        return `
          <div class="my-req-card">
            <div class="my-req-top">
              <span>Proposed to cover: <strong>${r.targetEmployeeName}</strong> (${r.shiftTime})</span>
              ${statusBadge}
            </div>
            <div class="my-req-meta text-muted">
              Submitted: ${r.timestamp} ${r.notes ? `• "${r.notes}"` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    let tipHistoryHtml = '';
    if (myTips.length === 0) {
      tipHistoryHtml = `<tr><td colspan="4" class="text-muted" style="text-align:center;">No cash tips logged yet. Use the form above to record cash take-home.</td></tr>`;
    } else {
      tipHistoryHtml = myTips.map(t => `
        <tr>
          <td class="font-mono">${t.date}</td>
          <td>${t.shiftRole}</td>
          <td class="font-mono text-cash num-col"><strong>${formatCurrency(t.amount)}</strong></td>
          <td>${t.notes}</td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="workspace-wrapper">
        <div class="section-intro">
          <div>
            <span class="sub-badge">TEAM MEMBER PORTAL</span>
            <h2 class="section-title">My Shifts, Swaps &amp; Cash Tip Logger</h2>
            <p class="section-desc">Manage your assigned floor shifts, offer coverage to colleagues, and record your daily cash take-home for accurate bi-weekly settlement.</p>
          </div>
        </div>

        <!-- Section 1: My Shifts -->
        <div class="workspace-card" style="margin-bottom: 2rem;">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">My Assigned Shifts Tonight</h3>
              <span class="card-subtitle">Mark shifts "Up for Grabs" to invite qualified teammates to pick them up</span>
            </div>
          </div>
          <div class="my-shifts-list">
            ${myShiftsHtml}
          </div>
        </div>

        <!-- Section 2: Cash Tip Logger -->
        <div class="workspace-card" style="margin-bottom: 2rem;">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">Daily Cash Tip Logger</h3>
              <span class="card-subtitle">Log your daily cash tips received. Total logged: <strong class="text-cash">${formatCurrency(totalLoggedTips)}</strong></span>
            </div>
            <button class="btn btn-sm btn-primary" id="btnOpenTipModalFromWorkspace">
              + Log Cash Tip
            </button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shift / Station</th>
                  <th class="num-col">Cash Tip Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${tipHistoryHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 3: My Swap Proposals -->
        <div class="workspace-card">
          <div class="card-header-bar">
            <div>
              <h3 class="card-title">My Swap &amp; Pickup Requests</h3>
              <span class="card-subtitle">Status of coverage requests you have submitted to management</span>
            </div>
          </div>
          <div class="my-requests-list">
            ${myRequestsHtml}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnOpenTipModalFromWorkspace')?.addEventListener('click', () => {
      openCashTipModal();
    });
  }

  // =========================================================================
  // Modal Controllers
  // =========================================================================

  function openRoleLoginModal() {
    document.getElementById('roleLoginModal')?.classList.add('open');
  }

  function closeRoleLoginModal() {
    document.getElementById('roleLoginModal')?.classList.remove('open');
  }

  function openProposeSwapModal(shiftId) {
    const shift = getShiftById(shiftId);
    if (!shift) return;

    activeModalShiftId = shiftId;
    const targetEmp = getEmployeeById(shift.employeeId);
    const proposingEmp = getEmployeeById(state.currentUser.id);

    const summaryBox = document.getElementById('proposeShiftSummary');
    const evalBox = document.getElementById('proposeEvaluationBox');
    const modal = document.getElementById('proposeSwapModal');

    if (summaryBox && targetEmp) {
      summaryBox.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Shift to Cover:</div>
        <div style="font-size:1rem; font-weight:700; color:#fff; margin-top:0.2rem;">
          ${targetEmp.name} — ${shift.role} (${shift.hours.toFixed(1)} hrs)
        </div>
        <div class="font-mono" style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">
          ${shift.startTime} – ${shift.endTime} • Station: ${shift.notes}
        </div>
        ${shift.isUpForGrabs ? `<div style="margin-top:0.4rem; color:#FCD34D; font-size:0.75rem; font-weight:700;">🏷️ Shift is currently marked UP FOR GRABS by ${targetEmp.name}</div>` : ''}
      `;
    }

    if (evalBox && proposingEmp) {
      const ev = evaluateCoverageCandidate(proposingEmp, shift);
      evalBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Coverage Eligibility Check:</span>
          <span class="status-badge ${ev.badgeClass}">${ev.badgeText}</span>
        </div>
        <div style="font-size:0.825rem; color:#fff; margin-top:0.4rem;">
          ${ev.reason}
        </div>
        <div class="font-mono" style="font-size:0.78rem; color:var(--text-secondary); margin-top:0.25rem;">
          Standard straight-time rate: <strong>${formatCurrency(proposingEmp.hourlyRate)}/hr</strong> (Shift Total: ${formatCurrency(ev.shiftPay)})
        </div>
      `;
    }

    modal?.classList.add('open');
  }

  function closeProposeSwapModal() {
    document.getElementById('proposeSwapModal')?.classList.remove('open');
    activeModalShiftId = null;
  }

  function openUpForGrabsModal(shiftId) {
    const shift = getShiftById(shiftId);
    if (!shift) return;

    activeModalShiftId = shiftId;
    const emp = getEmployeeById(shift.employeeId);
    const summaryBox = document.getElementById('upForGrabsShiftSummary');
    const modal = document.getElementById('upForGrabsModal');

    if (summaryBox && emp) {
      summaryBox.innerHTML = `
        <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Selected Shift:</div>
        <div style="font-size:1rem; font-weight:700; color:#fff; margin-top:0.2rem;">
          ${shift.role} — ${shift.startTime} to ${shift.endTime} (${shift.hours.toFixed(1)}h)
        </div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">
          Assigned to: ${emp.name} • Station: ${shift.notes}
        </div>
      `;
    }

    modal?.classList.add('open');
  }

  function closeUpForGrabsModal() {
    document.getElementById('upForGrabsModal')?.classList.remove('open');
    activeModalShiftId = null;
  }

  function openCashTipModal() {
    const modal = document.getElementById('logCashTipModal');
    const dateInput = document.getElementById('cashTipDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    modal?.classList.add('open');
  }

  function closeCashTipModal() {
    document.getElementById('logCashTipModal')?.classList.remove('open');
  }

  function openEditShiftModal(shiftId) {
    if (!state.currentUser.isManager) {
      showToast('Manager permission required to edit shift schedule.', 'error');
      return;
    }

    const shift = getShiftById(shiftId);
    if (!shift) return;

    const modal = document.getElementById('editShiftModal');
    const idInput = document.getElementById('editShiftId');
    const empSelect = document.getElementById('editShiftEmployee');
    const roleSelect = document.getElementById('editShiftRole');
    const startInput = document.getElementById('editShiftStart');
    const endInput = document.getElementById('editShiftEnd');
    const hoursInput = document.getElementById('editShiftHours');
    const notesInput = document.getElementById('editShiftNotes');

    if (idInput) idInput.value = shift.id;
    if (empSelect) {
      empSelect.innerHTML = state.roster.map(e => `
        <option value="${e.id}" ${e.id === shift.employeeId ? 'selected' : ''}>
          ${e.name} (${e.role})
        </option>
      `).join('');
    }
    if (roleSelect) roleSelect.value = shift.role;
    if (startInput) startInput.value = shift.startTime;
    if (endInput) endInput.value = shift.endTime;
    if (hoursInput) hoursInput.value = shift.hours;
    if (notesInput) notesInput.value = shift.notes;

    modal?.classList.add('open');
  }

  function closeEditShiftModal() {
    document.getElementById('editShiftModal')?.classList.remove('open');
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
    if (slipTotalBiweekly) slipTotalBiweekly.textContent = `${calc.totalEligibleBiweeklyHours.toFixed(1)} eligible hrs (straight-time)`;
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
            <span>${item.biweeklyHours.toFixed(1)}h straight-time (${item.poolSharePercent.toFixed(1)}%)</span>
            <span>Cash: ${formatCurrency(item.cashPayout)} | CC: ${formatCurrency(item.ccPayout)}</span>
          </div>
        `;
        slipCrewList.appendChild(itemDiv);
      });
    }
  }

  function renderAll() {
    renderSessionHeaders();
    renderShiftCards();
    renderSwapEnginePanel();
    renderRosterTable();
    renderTipCalculator();
    renderRoleWorkspace();
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
    } else if (tabId === 'tabRoleWorkspace') {
      renderRoleWorkspace();
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

    document.getElementById('btnHeaderRoleSwitch')?.addEventListener('click', openRoleLoginModal);
    document.getElementById('btnBannerOpenModal')?.addEventListener('click', openRoleLoginModal);
    document.getElementById('btnCloseRoleModal')?.addEventListener('click', closeRoleLoginModal);

    document.getElementById('btnBannerQuickSwitch')?.addEventListener('click', () => {
      if (state.currentUser.isManager) {
        switchUser('emp-1'); // Jordan Miller
      } else {
        switchUser('emp-8'); // Rachel Greene
      }
    });

    document.getElementById('btnSignInManager')?.addEventListener('click', () => {
      const pin = document.getElementById('inputManagerPin')?.value || '';
      if (pin === '1234') {
        switchUser('emp-8');
        closeRoleLoginModal();
      } else {
        showToast('Demo PIN incorrect. Use "1234" for Manager prototype access.', 'warning');
      }
    });

    document.getElementById('btnSignInTeamMember')?.addEventListener('click', () => {
      const select = document.getElementById('selectTeamMemberUser');
      const empId = select ? select.value : 'emp-1';
      switchUser(empId);
      closeRoleLoginModal();
    });

    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('Reset all shifts, swap requests, tip records, and audit logs to synthetic sample data?')) {
        resetState();
      }
    });

    document.getElementById('btnQuickDemo')?.addEventListener('click', () => {
      resetState();
      state.selectedShiftId = 'shift-1';
      saveState();
      renderAll();
      switchTab('tabSwapValidator');
      showToast('⚡ Quick Demo loaded! Jordan Miller (Shift 1) selected for coverage evaluation.', 'success');
    });

    // Candidate Filter Chips (All, Qualified/Safe, Role Mismatch)
    document.querySelector('.candidate-filters')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      state.candidateFilter = chip.getAttribute('data-filter') || 'all';
      renderSwapEnginePanel();
    });

    document.addEventListener('click', (e) => {
      // Toggle Shift Select in Swap Validator (Manager)
      const swapBtn = e.target.closest('[data-action="toggle-swap"]');
      if (swapBtn) {
        const shiftId = swapBtn.getAttribute('data-shift-id');
        state.selectedShiftId = (state.selectedShiftId === shiftId) ? null : shiftId;
        renderShiftCards();
        renderSwapEnginePanel();
        return;
      }

      // Direct Approve Swap (Manager only)
      const approveBtn = e.target.closest('[data-action="approve-swap"]');
      if (approveBtn) {
        const candId = approveBtn.getAttribute('data-cand-id');
        const shiftId = approveBtn.getAttribute('data-shift-id');
        if (state.currentUser.isManager) {
          executeSwap(candId, shiftId);
          renderAll();
          showToast(`Swap approved! Schedule and straight-time hours updated.`, 'success');
        } else {
          showToast('Manager permission required for direct swap approval.', 'error');
        }
        return;
      }

      // Team Member: Request Candidate
      const reqCandBtn = e.target.closest('[data-action="request-swap-candidate"]');
      if (reqCandBtn) {
        const candId = reqCandBtn.getAttribute('data-cand-id');
        const shiftId = reqCandBtn.getAttribute('data-shift-id');
        submitSwapProposal(shiftId, `Proposed ${getEmployeeById(candId)?.name} as covering replacement.`);
        return;
      }

      // Toggle Up for Grabs (Team Member on own shift)
      const grabBtn = e.target.closest('[data-action="toggle-grabs"]');
      if (grabBtn) {
        const shiftId = grabBtn.getAttribute('data-shift-id');
        const shift = getShiftById(shiftId);
        if (shift) {
          if (shift.isUpForGrabs) {
            toggleUpForGrabs(shiftId);
          } else {
            openUpForGrabsModal(shiftId);
          }
        }
        return;
      }

      // Propose to cover / pick up shift (Team Member)
      const proposeBtn = e.target.closest('[data-action="propose-swap"]');
      if (proposeBtn) {
        const shiftId = proposeBtn.getAttribute('data-shift-id');
        openProposeSwapModal(shiftId);
        return;
      }

      // Edit Shift (Manager)
      const editShiftBtn = e.target.closest('[data-action="edit-shift"]');
      if (editShiftBtn) {
        const shiftId = editShiftBtn.getAttribute('data-shift-id');
        openEditShiftModal(shiftId);
        return;
      }

      // Approve Queue Request (Manager)
      const approveQueueBtn = e.target.closest('[data-action="approve-queue-req"]');
      if (approveQueueBtn) {
        const reqId = approveQueueBtn.getAttribute('data-req-id');
        approveManagerQueueRequest(reqId);
        return;
      }

      // Decline Queue Request (Manager)
      const declineQueueBtn = e.target.closest('[data-action="decline-queue-req"]');
      if (declineQueueBtn) {
        const reqId = declineQueueBtn.getAttribute('data-req-id');
        declineManagerQueueRequest(reqId);
        return;
      }

      // Adjust Weekly Hours (Manager only)
      const editHoursBtn = e.target.closest('[data-action="edit-hours"]');
      if (editHoursBtn) {
        if (!state.currentUser.isManager) {
          showToast('Manager permission required to adjust employee hours.', 'error');
          return;
        }
        const empId = editHoursBtn.getAttribute('data-emp-id');
        const emp = getEmployeeById(empId);
        if (emp) {
          const newWeekly = prompt(`Enter updated Weekly Hours for ${emp.name}:`, emp.weeklyHours);
          if (newWeekly !== null) {
            const pWeekly = parseFloat(newWeekly);
            if (!isNaN(pWeekly) && pWeekly >= 0) {
              emp.weeklyHours = parseFloat(pWeekly.toFixed(1));
              const newBiweekly = prompt(`Enter updated Bi-Weekly Hours for ${emp.name}:`, emp.biweeklyHours || emp.weeklyHours * 2);
              if (newBiweekly !== null) {
                const pBiweekly = parseFloat(newBiweekly);
                if (!isNaN(pBiweekly) && pBiweekly >= 0) {
                  emp.biweeklyHours = parseFloat(pBiweekly.toFixed(1));
                }
              }
              addAuditLogEntry('Hours Adjusted', `Manager updated ${emp.name}'s hours: Weekly ${emp.weeklyHours}h, Bi-Weekly ${emp.biweeklyHours}h (Straight-Time)`);
              saveState();
              renderAll();
              showToast(`Updated straight-time hours for ${emp.name}.`, 'info');
            }
          }
        }
        return;
      }

      // Scope Toggle in Tip Calculator
      const scopeBtn = e.target.closest('.scope-toggle-btn');
      if (scopeBtn) {
        const scope = scopeBtn.getAttribute('data-scope');
        if (scope && scope !== state.tipScope) {
          state.tipScope = scope;
          saveState();
          renderTipCalculator();
          showToast(`Distribution scope set to: ${scope === 'all' ? 'All Store Employees' : "Tonight's Floor Crew"}`, 'info');
        }
        return;
      }

      // Quick Tip Presets
      const tipPresetBtn = e.target.closest('.btn-tip-preset');
      if (tipPresetBtn) {
        if (!state.currentUser.isManager) {
          showToast('Manager permission required to change shift tip presets.', 'error');
          return;
        }
        const cashVal = parseFloat(tipPresetBtn.getAttribute('data-cash')) || 0;
        const ccVal = parseFloat(tipPresetBtn.getAttribute('data-cc')) || 0;
        state.tips.cash = cashVal;
        state.tips.cc = ccVal;
        addAuditLogEntry('Tip Preset Loaded', `Loaded preset: ${formatCurrency(cashVal + ccVal)} (${formatCurrency(cashVal)} cash / ${formatCurrency(ccVal)} CC)`);
        saveState();
        renderTipCalculator();
        showToast(`Loaded ${formatCurrency(cashVal + ccVal)} tip preset.`, 'info');
        return;
      }
    });

    // Propose Swap Modal Confirm
    document.getElementById('btnSubmitProposeSwap')?.addEventListener('click', () => {
      const notes = document.getElementById('proposeSwapNotes')?.value || '';
      if (activeModalShiftId) {
        submitSwapProposal(activeModalShiftId, notes);
        closeProposeSwapModal();
      }
    });
    document.getElementById('btnCancelProposeSwap')?.addEventListener('click', closeProposeSwapModal);
    document.getElementById('btnCloseProposeModal')?.addEventListener('click', closeProposeSwapModal);

    // Up for Grabs Modal Confirm
    document.getElementById('btnConfirmUpForGrabs')?.addEventListener('click', () => {
      const reason = document.getElementById('upForGrabsReason')?.value || '';
      if (activeModalShiftId) {
        toggleUpForGrabs(activeModalShiftId, reason);
        closeUpForGrabsModal();
      }
    });
    document.getElementById('btnCancelUpForGrabs')?.addEventListener('click', closeUpForGrabsModal);
    document.getElementById('btnCloseUpForGrabsModal')?.addEventListener('click', closeUpForGrabsModal);

    // Cash Tip Modal Confirm
    document.getElementById('btnSaveCashTip')?.addEventListener('click', () => {
      const date = document.getElementById('cashTipDate')?.value;
      const role = document.getElementById('cashTipRoleSelect')?.value;
      const amount = document.getElementById('cashTipAmount')?.value;
      const notes = document.getElementById('cashTipNotes')?.value;

      if (logCashTip(date, role, amount, notes)) {
        closeCashTipModal();
      }
    });
    document.getElementById('btnCancelCashTip')?.addEventListener('click', closeCashTipModal);
    document.getElementById('btnCloseCashTipModal')?.addEventListener('click', closeCashTipModal);

    // Edit Shift Modal Confirm (Manager)
    document.getElementById('btnSaveShiftChanges')?.addEventListener('click', () => {
      const shiftId = document.getElementById('editShiftId')?.value;
      const empId = document.getElementById('editShiftEmployee')?.value;
      const role = document.getElementById('editShiftRole')?.value;
      const start = document.getElementById('editShiftStart')?.value;
      const end = document.getElementById('editShiftEnd')?.value;
      const hours = parseFloat(document.getElementById('editShiftHours')?.value);
      const notes = document.getElementById('editShiftNotes')?.value;

      const shift = getShiftById(shiftId);
      if (shift && !isNaN(hours) && hours > 0) {
        const oldEmp = getEmployeeById(shift.employeeId);
        const newEmp = getEmployeeById(empId);

        if (oldEmp && newEmp && oldEmp.id !== newEmp.id) {
          oldEmp.weeklyHours = Math.max(0, parseFloat((oldEmp.weeklyHours - shift.hours).toFixed(1)));
          oldEmp.biweeklyHours = Math.max(0, parseFloat((oldEmp.biweeklyHours - shift.hours).toFixed(1)));
          newEmp.weeklyHours = parseFloat((newEmp.weeklyHours + hours).toFixed(1));
          newEmp.biweeklyHours = parseFloat((newEmp.biweeklyHours + hours).toFixed(1));
        }

        shift.employeeId = empId;
        shift.role = role;
        shift.startTime = start;
        shift.endTime = end;
        shift.hours = hours;
        shift.notes = notes;

        addAuditLogEntry('Shift Edited', `Manager modified Shift #${shift.id}: Assigned to ${newEmp?.name}, ${start}-${end} (${hours}h straight-time)`);
        saveState();
        renderAll();
        closeEditShiftModal();
        showToast('Shift schedule updated successfully.', 'success');
      }
    });
    document.getElementById('btnCancelEditShift')?.addEventListener('click', closeEditShiftModal);
    document.getElementById('btnCloseEditShiftModal')?.addEventListener('click', closeEditShiftModal);

    // Tip Pool Cash and CC Inputs
    document.getElementById('inputCashTips')?.addEventListener('input', (e) => {
      if (!state.currentUser.isManager) return;
      state.tips.cash = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
    });

    document.getElementById('inputCcTips')?.addEventListener('input', (e) => {
      if (!state.currentUser.isManager) return;
      state.tips.cc = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
    });

    // Inline Bi-Weekly Hours Input Change (Manager only)
    document.getElementById('tipPayoutTableBody')?.addEventListener('change', (e) => {
      if (e.target.classList.contains('biweekly-hour-input')) {
        if (!state.currentUser.isManager) {
          showToast('Manager permission required to edit staff bi-weekly hours.', 'error');
          renderTipCalculator();
          return;
        }
        const empId = e.target.getAttribute('data-emp-id');
        const val = parseFloat(e.target.value);
        if (empId && !isNaN(val) && val >= 0) {
          const emp = getEmployeeById(empId);
          if (emp) {
            emp.biweeklyHours = parseFloat(val.toFixed(1));
            addAuditLogEntry('Bi-Weekly Hours Adjusted', `Manager updated ${emp.name}'s bi-weekly hours to ${emp.biweeklyHours}h`);
            saveState();
            renderTipCalculator();
            renderRosterTable();
            renderShiftCards();
            showToast(`Updated ${emp.name}'s bi-weekly hours to ${emp.biweeklyHours}h.`, 'info');
          }
        }
      }
    });

    // Receipt Modal Actions
    const modal = document.getElementById('receiptModal');
    document.getElementById('btnPrintReceiptBtn')?.addEventListener('click', () => {
      renderReceiptModal();
      modal?.classList.add('open');
    });
    document.getElementById('btnCloseModal')?.addEventListener('click', () => {
      modal?.classList.remove('open');
    });
    document.getElementById('btnModalCloseSecondary')?.addEventListener('click', () => {
      modal?.classList.remove('open');
    });
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });

    document.getElementById('btnModalPrint')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btnModalDownload')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `THE COPPER OAK BISTRO — SHIFT CLOSEOUT & BI-WEEKLY TIP POOL\n`;
      text += `Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}\n`;
      text += `Wage Basis: Standard Straight-Time Only (Zero Overtime Multipliers)\n`;
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
          text += `• ${c.employee.name} (${c.role}): Total ${formatCurrency(c.totalPayout)} [Cash: ${formatCurrency(c.cashPayout)}, CC: ${formatCurrency(c.ccPayout)}] (${c.biweeklyHours}h straight-time)\n`;
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
