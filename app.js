/**
 * Service Ledger — Shift & Tip Optimizer (v1.0)
 * Juniper Kitchen Restaurant Operations System
 * Standards-compliant with /shift-tip-standards:
 * - Multi-Role Perspectives: Manager vs Employee
 * - Employee Claim & Swap Workflow with Manager Approval Queue
 * - PIN-Based Multi-Role Authentication (#143C33 Login Screen)
 * - Deterministic Math with Exact Penny Reconciliation & 1.5x Overtime Costing
 * - FLSA 29 U.S.C. § 203(m)(2)(B) Manager Tip Exclusion Guardrail
 */

(function () {
  'use strict';

  // =========================================================================
  // Baseline Data & Initial State
  // =========================================================================

  const INITIAL_USERS = [
    {
      id: 'usr-1',
      name: 'Paul Parajuli',
      role: 'Admin',
      pin: '1234',
      initials: 'PP',
      isPrimaryAdmin: true,
      certifications: ['General Manager', 'Shift Lead', 'Server', 'Bartender'],
      hourlyRate: 26.00,
      weeklyHours: 40.0
    },
    {
      id: 'usr-2',
      name: 'Maya Chen',
      role: 'Employee',
      pin: '1111',
      initials: 'MC',
      certifications: ['Server', 'Bartender'],
      hourlyRate: 12.50,
      weeklyHours: 37.0 // Triggers Overtime Warning on 6h shift
    },
    {
      id: 'usr-3',
      name: 'Jordan Ellis',
      role: 'Employee',
      pin: '2222',
      initials: 'JE',
      certifications: ['Bartender', 'Server'],
      hourlyRate: 14.50,
      weeklyHours: 31.0
    },
    {
      id: 'usr-4',
      name: 'Sofia Reyes',
      role: 'Employee',
      pin: '3333',
      initials: 'SR',
      certifications: ['Bartender'],
      hourlyRate: 15.00,
      weeklyHours: 33.0
    },
    {
      id: 'usr-5',
      name: 'Eli Brooks',
      role: 'Employee',
      pin: '4444',
      initials: 'EB',
      certifications: ['Busser', 'Server'],
      hourlyRate: 13.00,
      weeklyHours: 26.0
    },
    {
      id: 'usr-6',
      name: 'Noah Patel',
      role: 'Employee',
      pin: '5555',
      initials: 'NP',
      certifications: ['Line cook'],
      hourlyRate: 19.00,
      weeklyHours: 36.5
    },
    {
      id: 'usr-7',
      name: 'Ava Morgan',
      role: 'Manager',
      pin: '5678',
      initials: 'AM',
      certifications: ['Shift Lead', 'Server', 'Bartender'],
      hourlyRate: 22.00,
      weeklyHours: 35.0
    },
    {
      id: 'usr-8',
      name: 'Joseph',
      role: 'Employee',
      pin: '6666',
      initials: 'JO',
      certifications: ['Server', 'Bartender', 'Host'],
      hourlyRate: 13.50,
      weeklyHours: 20.0
    }
  ];

  const INITIAL_SHIFTS = [
    {
      id: 'shift-1',
      userId: null, // Unassigned
      role: 'Server',
      serviceName: 'Dinner service',
      scheduleDate: 'Fri, Nov 20',
      startTime: '4:00 PM',
      endTime: '10:00 PM',
      hours: 6.0,
      status: 'Open',
      statusClass: 'open',
      notes: 'Main Dining Room'
    },
    {
      id: 'shift-2',
      userId: 'usr-3', // Jordan Ellis
      role: 'Bartender',
      serviceName: 'Bar close',
      scheduleDate: 'Sat, Nov 21',
      startTime: '5:00 PM',
      endTime: '11:00 PM',
      hours: 6.0,
      status: 'Up for Grabs',
      statusClass: 'up-for-grabs',
      notes: 'Craft Bar & Lounge'
    },
    {
      id: 'shift-3',
      userId: null, // Unassigned
      role: 'Host',
      serviceName: 'Lunch service',
      scheduleDate: 'Sun, Nov 22',
      startTime: '10:00 AM',
      endTime: '3:00 PM',
      hours: 5.0,
      status: 'Open',
      statusClass: 'open',
      notes: 'Front Entrance & Reservations'
    },
    {
      id: 'shift-4',
      userId: 'usr-2', // Maya Chen
      role: 'Server',
      serviceName: 'Patio service',
      scheduleDate: 'Sun, Nov 22',
      startTime: '4:00 PM',
      endTime: '10:00 PM',
      hours: 6.0,
      status: 'Covered',
      statusClass: 'covered',
      notes: 'Patio & Section 2'
    },
    {
      id: 'shift-5',
      userId: 'usr-6', // Noah Patel
      role: 'Line cook',
      serviceName: 'Evening prep',
      scheduleDate: 'Mon, Nov 23',
      startTime: '3:00 PM',
      endTime: '9:00 PM',
      hours: 6.0,
      status: 'Covered',
      statusClass: 'covered',
      notes: 'Hot Line & Sautee'
    },
    {
      id: 'shift-6',
      userId: 'usr-7', // Ava Morgan
      role: 'Shift Lead',
      serviceName: 'Dinner service',
      scheduleDate: 'Fri, Nov 20',
      startTime: '4:00 PM',
      endTime: '12:00 AM',
      hours: 8.0,
      status: 'Covered',
      statusClass: 'covered',
      notes: 'Floor Lead & Cashier'
    }
  ];

  const INITIAL_APPROVALS = [
    {
      id: 'app-1',
      userId: 'usr-2', // Maya Chen
      name: 'Maya Chen',
      initials: 'MC',
      circleClass: 'mc',
      shiftId: 'shift-1',
      shiftRole: 'Server',
      shiftName: 'Dinner service',
      actionType: 'Claim',
      status: 'Awaiting manager review',
      date: 'Fri, Nov 20',
      note: 'Offered to pick up open dinner shift'
    },
    {
      id: 'app-2',
      userId: 'usr-4', // Sofia Reyes
      name: 'Sofia Reyes',
      initials: 'SR',
      circleClass: 'sr',
      shiftId: 'shift-2',
      shiftRole: 'Bartender',
      shiftName: 'Bar close',
      actionType: 'Swap',
      targetUserId: 'usr-3', // Jordan Ellis
      status: 'Awaiting manager review',
      date: 'Sat, Nov 21',
      note: 'Proposed swap with Jordan Ellis'
    }
  ];

  const DEFAULT_WEIGHTS = {
    'Bartender': 1.2,
    'Server': 1.0,
    'Host': 0.8,
    'Busser': 0.6,
    'Line cook': 0.0,
    'Shift Lead': 0.0 // FLSA 29 U.S.C. § 203(m)(2)(B) Locked
  };

  const STORAGE_KEY = 'service_ledger_state_v3';

  // =========================================================================
  // State Container
  // =========================================================================

  let state = {
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
    approvals: JSON.parse(JSON.stringify(INITIAL_APPROVALS)),
    currentUserId: 'usr-3', // Default demo: Jordan Ellis (Employee)
    currentView: 'view-overview',
    selectedShiftId: null,
    candidateFilter: 'all',
    employeeShiftFilter: 'all',
    tips: {
      cash: 284.50,
      cc: 1000.00
    },
    roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
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
        if (parsed.users && parsed.shifts) {
          state = parsed;
          state.roleWeights = Object.assign({}, DEFAULT_WEIGHTS, state.roleWeights);
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
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      shifts: JSON.parse(JSON.stringify(INITIAL_SHIFTS)),
      approvals: JSON.parse(JSON.stringify(INITIAL_APPROVALS)),
      currentUserId: 'usr-3', // Jordan Ellis (Employee)
      currentView: 'view-overview',
      selectedShiftId: null,
      candidateFilter: 'all',
      employeeShiftFilter: 'all',
      tips: {
        cash: 284.50,
        cc: 1000.00
      },
      roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
      shiftHoursOverride: {}
    };
    saveState();
    switchView('view-overview');
    updateAuthUi();
    showToast('Reset to default Juniper Kitchen restaurant data.', 'info');
  }

  // =========================================================================
  // Authentication & Session
  // =========================================================================

  function getCurrentUser() {
    if (!state.currentUserId) return null;
    return state.users.find(u => u.id === state.currentUserId) || null;
  }

  function isManagerUser() {
    const user = getCurrentUser();
    return user && (user.role === 'Admin' || user.role === 'Manager');
  }

  function authenticatePin(pinInput) {
    const trimmed = (pinInput || '').trim();
    if (trimmed.length !== 4) {
      return { success: false, message: 'Please enter a 4-digit PIN.' };
    }

    const matchedUser = state.users.find(u => u.pin === trimmed);
    if (!matchedUser) {
      return { success: false, message: 'Unrecognized PIN. Check your PIN or use demo chips below.' };
    }

    state.currentUserId = matchedUser.id;
    saveState();
    return { success: true, user: matchedUser };
  }

  function signOut() {
    state.currentUserId = null;
    saveState();
    updateAuthUi();
    const pinInput = document.getElementById('inputPin');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
    showToast('Signed out. Workspace locked.', 'info');
  }

  function updateAuthUi() {
    const loginScreen = document.getElementById('pinLoginScreen');
    const mainApp = document.getElementById('mainAppLayout');
    const user = getCurrentUser();

    if (!user) {
      loginScreen.style.display = 'flex';
      mainApp.style.display = 'none';
    } else {
      loginScreen.style.display = 'none';
      mainApp.style.display = 'flex';

      // Update Topbar
      const roleEl = document.getElementById('topbarUserRole');
      const avatarEl = document.getElementById('topbarUserAvatar');

      if (roleEl) roleEl.textContent = user.role;
      if (avatarEl) {
        avatarEl.textContent = user.initials || user.name.slice(0, 2).toUpperCase();
        avatarEl.title = `${user.name} (${user.role})`;
      }

      renderSidebarNavigation();
      renderAll();
    }
  }

  // =========================================================================
  // Role-Based Sidebar Navigation Rendering
  // =========================================================================

  function renderSidebarNavigation() {
    const nav = document.getElementById('sidebarNav');
    if (!nav) return;

    const isMgr = isManagerUser();
    const user = getCurrentUser();

    if (isMgr) {
      // MANAGER NAVIGATION
      nav.innerHTML = `
        <button class="nav-item ${state.currentView === 'view-overview' ? 'active' : ''}" data-view="view-overview">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>
          <span class="nav-label">Overview</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-shifts' ? 'active' : ''}" data-view="view-shifts">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
          <span class="nav-label">Shift coverage</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-tips' ? 'active' : ''}" data-view="view-tips">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></span>
          <span class="nav-label">Tip pool</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-approvals' ? 'active' : ''}" data-view="view-approvals">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></span>
          <span class="nav-label">Approvals</span>
          <span class="nav-counter" id="sidebarApprovalCount">${state.approvals.length}</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-roster' ? 'active' : ''}" data-view="view-roster">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
          <span class="nav-label">Team roster</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-audit' ? 'active' : ''}" data-view="view-audit">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg></span>
          <span class="nav-label">Audit log</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-access' ? 'active' : ''}" data-view="view-access">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg></span>
          <span class="nav-label">Manage access</span>
        </button>
      `;
    } else {
      // EMPLOYEE NAVIGATION (Exact copy of Screenshot 1, 2, 3)
      const myOpenRequestsCount = state.approvals.filter(a => a.userId === user.id).length;
      nav.innerHTML = `
        <button class="nav-item ${state.currentView === 'view-overview' ? 'active' : ''}" data-view="view-overview">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>
          <span class="nav-label">Overview</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-shifts' ? 'active' : ''}" data-view="view-shifts">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
          <span class="nav-label">Shift board</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-tips' ? 'active' : ''}" data-view="view-tips">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg></span>
          <span class="nav-label">Cash tips</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-approvals' ? 'active' : ''}" data-view="view-approvals">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></span>
          <span class="nav-label">My requests</span>
          ${myOpenRequestsCount > 0 ? `<span class="nav-counter">${myOpenRequestsCount}</span>` : ''}
        </button>
      `;
    }
  }

  // =========================================================================
  // Math & Helpers
  // =========================================================================

  function formatCurrency(num) {
    return '$' + (Number(num) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getUserById(userId) {
    return state.users.find(u => u.id === userId);
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
  // Deterministic Overtime & Certification Evaluation
  // =========================================================================

  function evaluateCoverageCandidate(candidate, targetShift) {
    const isCertified = candidate.certifications && candidate.certifications.includes(targetShift.role);
    if (!isCertified) {
      return {
        status: 'mismatch',
        badgeText: 'Role Mismatch',
        badgeClass: 'mismatch',
        reason: `Lacks required '${targetShift.role}' certification. Has: [${(candidate.certifications || []).join(', ')}]`,
        canApprove: false,
        otHours: 0,
        extraCost: 0,
        projectedHours: candidate.weeklyHours + targetShift.hours
      };
    }

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

    const otHours = currentHours >= 40.0 ? shiftHours : (projectedHours - 40.0);
    const regularRate = candidate.hourlyRate;
    const otRate = regularRate * 1.5;
    const extraOvertimeCost = otHours * (regularRate * 0.5);
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

  // =========================================================================
  // Employee Shift Actions (Claim & Propose Swap)
  // =========================================================================

  function handleEmployeeClaimShift(shiftId) {
    const user = getCurrentUser();
    const shift = getShiftById(shiftId);
    if (!user || !shift) return;

    // Check if user is certified for this station
    const isCertified = user.certifications && user.certifications.includes(shift.role);
    if (!isCertified) {
      alert(`You do not have the required station certification (${shift.role}) to claim this shift.`);
      return;
    }

    // Check if user already has an active pending request for this shift
    const existingReq = state.approvals.find(a => a.shiftId === shift.id && a.userId === user.id);
    if (existingReq) {
      showToast('You already have a pending claim for this shift awaiting manager review.', 'info');
      return;
    }

    // Create approval item for manager review
    const newApproval = {
      id: 'app-' + Date.now(),
      userId: user.id,
      name: user.name,
      initials: user.initials,
      circleClass: (user.initials || 'mc').toLowerCase(),
      shiftId: shift.id,
      shiftRole: shift.role,
      shiftName: shift.serviceName,
      actionType: 'Claim',
      status: 'Awaiting manager review',
      date: shift.scheduleDate,
      note: `${user.name} requested to claim ${shift.role} (${shift.serviceName})`
    };

    state.approvals.push(newApproval);
    saveState();
    renderAll();

    showToast(`Claim request submitted for ${shift.role} (${shift.scheduleDate})! Awaiting manager review.`, 'success');
  }

  function handleEmployeeOfferCoverage(shiftId) {
    const shift = getShiftById(shiftId);
    const user = getCurrentUser();
    if (!shift || !user || shift.userId !== user.id) return;

    shift.status = 'Up for Grabs';
    shift.statusClass = 'up-for-grabs';
    saveState();
    renderAll();
    showToast(`Your ${shift.role} shift is now offered up for grabs for colleagues to claim.`, 'info');
  }

  function handleEmployeeWithdrawCoverage(shiftId) {
    const shift = getShiftById(shiftId);
    const user = getCurrentUser();
    if (!shift || !user || shift.userId !== user.id) return;

    shift.status = 'Covered';
    shift.statusClass = 'covered';
    saveState();
    renderAll();
    showToast(`Coverage offer withdrawn. Shift remains scheduled to you.`, 'info');
  }

  // =========================================================================
  // Manager Approval Actions
  // =========================================================================

  function authorizeManagerApproval(appId) {
    const app = state.approvals.find(a => a.id === appId);
    if (!app) return;

    const shift = getShiftById(app.shiftId);
    const claimingUser = getUserById(app.userId);

    if (shift && claimingUser) {
      const shiftHours = shift.hours;

      // If shift previously had an employee assigned, deduct hours
      if (shift.userId) {
        const prevUser = getUserById(shift.userId);
        if (prevUser) {
          prevUser.weeklyHours = Math.max(0, parseFloat((prevUser.weeklyHours - shiftHours).toFixed(1)));
        }
      }

      // Assign shift to claiming employee & add hours
      shift.userId = claimingUser.id;
      shift.status = 'Covered';
      shift.statusClass = 'covered';
      claimingUser.weeklyHours = parseFloat((claimingUser.weeklyHours + shiftHours).toFixed(1));
    }

    // Remove from approvals queue
    state.approvals = state.approvals.filter(a => a.id !== appId);
    saveState();
    renderAll();

    showToast(`Authorized! ${app.name} is now officially assigned to ${app.shiftRole} (${app.shiftName}).`, 'success');
  }

  function dismissManagerApproval(appId) {
    const app = state.approvals.find(a => a.id === appId);
    if (!app) return;

    state.approvals = state.approvals.filter(a => a.id !== appId);
    saveState();
    renderAll();

    showToast(`Request from ${app.name} dismissed.`, 'info');
  }

  // =========================================================================
  // Tip Pool Engine (Deterministic Math & Penny Reconciliation)
  // =========================================================================

  function calculateTipPool() {
    const cashTips = parseFloat(state.tips.cash) || 0;
    const ccTips = parseFloat(state.tips.cc) || 0;
    const totalTips = cashTips + ccTips;

    const crewMap = new Map();

    state.shifts.forEach(shift => {
      if (!shift.userId) return;
      const user = getUserById(shift.userId);
      if (!user) return;

      const hoursWorked = getShiftActualHours(shift);
      const role = shift.role;
      let weight = state.roleWeights[role] !== undefined ? state.roleWeights[role] : 1.0;
      if (user.role === 'Admin' || user.role === 'Manager' || role === 'Shift Lead') {
        weight = 0.0;
      }

      if (!crewMap.has(user.id)) {
        crewMap.set(user.id, {
          user: user,
          role: role,
          hoursWorked: hoursWorked,
          weight: weight,
          shiftId: shift.id
        });
      } else {
        const existing = crewMap.get(user.id);
        existing.hoursWorked += hoursWorked;
      }
    });

    const crew = Array.from(crewMap.values());

    let totalWeightedHours = 0;
    let totalWorkingHours = 0;

    crew.forEach(item => {
      item.weightedHours = item.hoursWorked * item.weight;
      totalWeightedHours += item.weightedHours;
      totalWorkingHours += item.hoursWorked;
    });

    const totalCents = Math.round(totalTips * 100);
    const cashCents = Math.round(cashTips * 100);
    const ccCents = Math.round(ccTips * 100);

    let allocatedTotalCents = 0;
    let allocatedCashCents = 0;
    let allocatedCcCents = 0;

    crew.forEach(item => {
      if (totalWeightedHours > 0 && item.weightedHours > 0) {
        item.poolSharePercent = (item.weightedHours / totalWeightedHours) * 100;
        
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

    let pennyDiff = totalCents - allocatedTotalCents;
    if (pennyDiff > 0 && totalWeightedHours > 0) {
      const eligible = crew.filter(c => c.weight > 0);
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
  // View Renderers
  // =========================================================================

  function renderOverviewDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    const isMgr = isManagerUser();
    const calc = calculateTipPool();

    // 1. Hero Description & Actions
    const heroDescText = document.getElementById('heroDescText');
    const heroActionsContainer = document.getElementById('heroActionsContainer');

    if (isMgr) {
      if (heroDescText) heroDescText.textContent = 'Find qualified coverage, approve shift changes, and reconcile every cent of the tip pool.';
      if (heroActionsContainer) {
        heroActionsContainer.innerHTML = `
          <button class="btn btn-peach" id="heroReviewCoverageBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Review coverage</span>
          </button>
          <button class="btn btn-hero-outline" id="heroTryDemoBtn">
            <span class="icon-circle-q">?</span>
            <span>Try the demo</span>
          </button>
        `;
      }
    } else {
      // EMPLOYEE HERO (Screenshot 1)
      if (heroDescText) heroDescText.textContent = 'Pick up open shifts, request coverage, and record your pooled cash tips.';
      if (heroActionsContainer) {
        heroActionsContainer.innerHTML = `
          <button class="btn btn-peach" id="heroBrowseOpenShiftsBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Browse open shifts</span>
          </button>
          <button class="btn btn-hero-outline" id="heroTryDemoBtn">
            <span class="icon-circle-q">?</span>
            <span>Try the demo</span>
          </button>
        `;
      }
    }

    // 2. 4 KPI Cards Container (Role-Adaptive)
    const kpiGridContainer = document.getElementById('kpiGridContainer');
    if (kpiGridContainer) {
      if (isMgr) {
        // MANAGER KPIS
        const coverageNeeded = state.shifts.filter(s => s.status !== 'Covered').length;
        const eligibleStaffCount = calc.crew.filter(c => c.weight > 0).length;

        kpiGridContainer.innerHTML = `
          <div class="kpi-card" data-action="go-shifts">
            <div class="kpi-card-top"><span class="kpi-label">Coverage needed</span><span class="kpi-icon-wrap icon-peach">📅</span></div>
            <div class="kpi-value">${coverageNeeded}</div>
            <div class="kpi-subtext">Open or up for grabs</div>
          </div>
          <div class="kpi-card" data-action="go-approvals">
            <div class="kpi-card-top"><span class="kpi-label">Pending approvals</span><span class="kpi-icon-wrap icon-peach">📋</span></div>
            <div class="kpi-value">${state.approvals.length}</div>
            <div class="kpi-subtext">Awaiting manager review</div>
          </div>
          <div class="kpi-card" data-action="go-tips">
            <div class="kpi-card-top"><span class="kpi-label">Tip pool</span><span class="kpi-icon-wrap icon-mint">💳</span></div>
            <div class="kpi-value">${formatCurrency(calc.totalTips)}</div>
            <div class="kpi-subtext">Nov 2 &ndash; Nov 15</div>
          </div>
          <div class="kpi-card" data-action="go-tips">
            <div class="kpi-card-top"><span class="kpi-label">Eligible staff</span><span class="kpi-icon-wrap icon-mint">👥</span></div>
            <div class="kpi-value">${eligibleStaffCount}</div>
            <div class="kpi-subtext">With recorded pool hours</div>
          </div>
        `;
      } else {
        // EMPLOYEE KPIS (Exact from Screenshot 1)
        const claimableShiftsCount = state.shifts.filter(s => 
          s.status !== 'Covered' && 
          s.userId !== user.id && 
          (user.certifications || []).includes(s.role)
        ).length;

        const myAssignedShiftsCount = state.shifts.filter(s => s.userId === user.id).length;
        const myOpenRequestsCount = state.approvals.filter(a => a.userId === user.id).length;

        const userPayout = calc.crew.find(c => c.user.id === user.id);
        const myCashTips = userPayout ? userPayout.cashPayout : 0.00;

        kpiGridContainer.innerHTML = `
          <div class="kpi-card" data-action="go-shifts">
            <div class="kpi-card-top"><span class="kpi-label">Claimable shifts</span><span class="kpi-icon-wrap icon-peach">📅</span></div>
            <div class="kpi-value">${claimableShiftsCount}</div>
            <div class="kpi-subtext">Matches your certifications</div>
          </div>
          <div class="kpi-card" data-action="go-shifts">
            <div class="kpi-card-top"><span class="kpi-label">My assigned shifts</span><span class="kpi-icon-wrap icon-mint">⏱️</span></div>
            <div class="kpi-value">${myAssignedShiftsCount}</div>
            <div class="kpi-subtext">On the schedule</div>
          </div>
          <div class="kpi-card" data-action="go-approvals">
            <div class="kpi-card-top"><span class="kpi-label">My open requests</span><span class="kpi-icon-wrap icon-peach">📋</span></div>
            <div class="kpi-value">${myOpenRequestsCount}</div>
            <div class="kpi-subtext">Awaiting manager review</div>
          </div>
          <div class="kpi-card" data-action="go-tips">
            <div class="kpi-card-top"><span class="kpi-label">My pooled cash tips</span><span class="kpi-icon-wrap icon-mint">💵</span></div>
            <div class="kpi-value">${formatCurrency(myCashTips)}</div>
            <div class="kpi-subtext">${userPayout ? '1 verified shift' : '0 logged entries'}</div>
          </div>
        `;
      }
    }

    // 3. Lower Left: Overview Shift Board Table
    const shiftBoardBody = document.getElementById('overviewShiftBoardBody');
    if (shiftBoardBody) {
      shiftBoardBody.innerHTML = '';
      state.shifts.slice(0, 4).forEach(shift => {
        const u = getUserById(shift.userId);
        const isMine = u && u.id === user.id;
        const tr = document.createElement('tr');

        let actionBtnHtml = '';
        if (isMgr) {
          actionBtnHtml = `<button class="btn-validate-pill" data-action="validate-shift" data-shift-id="${shift.id}">Validate</button>`;
        } else {
          // Employee perspective
          if (shift.status !== 'Covered' && !isMine) {
            actionBtnHtml = `<button class="btn-action-claim" data-action="claim-shift" data-shift-id="${shift.id}">Claim</button>`;
          } else if (isMine) {
            actionBtnHtml = `<span style="font-size:0.75rem; color:#059669; font-weight:700;">Your shift</span>`;
          } else {
            actionBtnHtml = `<span style="color:#9CA3AF;">&mdash;</span>`;
          }
        }

        tr.innerHTML = `
          <td>
            <div class="td-main-bold">${shift.role}</div>
            <div class="td-sub-muted">${shift.serviceName} &bull; ${u ? u.name : 'Unassigned'}</div>
          </td>
          <td>
            <div class="td-main-bold">${shift.scheduleDate}</div>
            <div class="td-sub-muted">${shift.startTime} &ndash; ${shift.endTime}</div>
          </td>
          <td>
            <span class="status-pill ${shift.statusClass}">${shift.status}</span>
          </td>
          <td class="action-th">
            ${actionBtnHtml}
          </td>
        `;
        shiftBoardBody.appendChild(tr);
      });
    }

    // 4. Lower Right: Role-dependent Card
    const rightCol = document.getElementById('overviewRightCol');
    if (rightCol) {
      if (isMgr) {
        // Manager Approval Queue Card
        rightCol.innerHTML = `
          <div class="content-card approval-queue-card">
            <div class="content-card-header">
              <div>
                <h2 class="card-main-title">Approval queue</h2>
                <p class="card-main-sub">${state.approvals.length} awaiting review</p>
              </div>
              <span class="manager-badge">Manager</span>
            </div>
            <div class="approval-list" id="approvalQueueList"></div>
            <div class="approval-footer">
              <button class="btn btn-dark-full" id="btnReviewRequests">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                <span>Review requests</span>
              </button>
            </div>
          </div>
        `;

        const queueList = document.getElementById('approvalQueueList');
        if (queueList) {
          queueList.innerHTML = '';
          state.approvals.forEach(app => {
            const item = document.createElement('div');
            item.className = 'approval-item';
            item.innerHTML = `
              <div class="approval-user">
                <div class="user-circle ${app.circleClass}">${app.initials}</div>
                <div>
                  <div class="user-info-name">${app.name}</div>
                  <div class="user-info-role">${app.shiftName} &bull; ${app.shiftRole}</div>
                </div>
              </div>
              <button class="btn-action-outline" data-action="authorize-approval" data-app-id="${app.id}">
                ${app.actionType}
              </button>
            `;
            queueList.appendChild(item);
          });
        }
      } else {
        // EMPLOYEE "YOUR PROFILE" CARD (Screenshot 1)
        rightCol.innerHTML = `
          <div class="content-card">
            <div class="employee-profile-card">
              <div>
                <div class="profile-card-sub">Your profile</div>
                <div class="profile-card-sub" style="color:var(--text-muted); font-size:0.72rem; margin-top:0.15rem;">Demo team member</div>
                <div class="profile-card-name">${user.name}</div>
                <div class="profile-card-certs">Certified for ${(user.certifications || []).join(', ')}.</div>
              </div>
              <div>
                <button class="btn btn-dark-full" id="btnEmployeeLogCashTips">
                  <span>💵 Log cash tips</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  // =========================================================================
  // Shift Board View (Role-Adaptive)
  // =========================================================================

  function renderShiftBoardView() {
    const isMgr = isManagerUser();
    const user = getCurrentUser();

    const empCard = document.getElementById('employeeMasterScheduleCard');
    const mgrView = document.getElementById('managerShiftCoverageView');
    const headerRight = document.getElementById('shiftBoardHeaderRight');
    const subtitle = document.getElementById('shiftBoardSubtitle');

    if (isMgr) {
      if (empCard) empCard.style.display = 'none';
      if (mgrView) mgrView.style.display = 'block';
      if (subtitle) subtitle.textContent = 'Select any scheduled shift below to initiate coverage evaluation or analyze 1.5x overtime costs.';
      if (headerRight) headerRight.innerHTML = '';

      renderShiftCards();
      renderSwapEnginePanel();
    } else {
      // EMPLOYEE MASTER SCHEDULE (Screenshot 2 & 3)
      if (empCard) empCard.style.display = 'block';
      if (mgrView) mgrView.style.display = 'none';
      if (subtitle) subtitle.textContent = 'Claim open shifts, offer your own shifts, or propose a replacement.';
      if (headerRight) {
        headerRight.innerHTML = `
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Demo team member</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-dark);">${user.name}</div>
          </div>
        `;
      }

      renderEmployeeMasterSchedule();
    }
  }

  function renderEmployeeMasterSchedule() {
    const tbody = document.getElementById('employeeMasterScheduleBody');
    const countEl = document.getElementById('masterScheduleSubCount');
    const filterSelect = document.getElementById('employeeShiftFilterSelect');
    const user = getCurrentUser();

    if (!tbody || !user) return;

    const filter = filterSelect ? filterSelect.value : state.employeeShiftFilter;

    // Filter shifts
    let filtered = state.shifts;
    if (filter === 'my-shifts') {
      filtered = state.shifts.filter(s => s.userId === user.id);
    } else if (filter === 'claimable') {
      filtered = state.shifts.filter(s => 
        s.status !== 'Covered' && 
        s.userId !== user.id && 
        (user.certifications || []).includes(s.role)
      );
    }

    if (countEl) countEl.textContent = `${filtered.length} shifts shown`;

    tbody.innerHTML = '';

    filtered.forEach(shift => {
      const assignedUser = getUserById(shift.userId);
      const isMine = assignedUser && assignedUser.id === user.id;
      const isCertified = (user.certifications || []).includes(shift.role);

      // Check if user has an active claim pending for this shift
      const isPendingMyReview = state.approvals.some(a => a.shiftId === shift.id && a.userId === user.id);

      let actionButtons = '';
      let statusPillClass = shift.statusClass;
      let statusText = shift.status;

      if (isPendingMyReview) {
        statusPillClass = 'pending';
        statusText = 'Pending Approval';
        actionButtons = `<span style="font-size:0.75rem; color:#B45309; font-weight:700;">Claim Submitted</span>`;
      } else if (shift.status === 'Open' || shift.status === 'Up for Grabs') {
        if (!isMine) {
          if (isCertified) {
            actionButtons = `<button class="btn-action-claim" data-action="claim-shift" data-shift-id="${shift.id}">Claim</button>`;
          } else {
            actionButtons = `<span style="font-size:0.75rem; color:#9CA3AF;">Not Certified</span>`;
          }
        } else {
          // It's my shift and it's Up for Grabs
          actionButtons = `
            <div style="display:flex; gap:0.4rem; justify-content:flex-end;">
              <button class="btn-action-withdraw" data-action="withdraw-coverage" data-shift-id="${shift.id}">Withdraw</button>
              <button class="btn-action-swap" data-action="open-propose-swap" data-shift-id="${shift.id}">Propose swap</button>
            </div>
          `;
        }
      } else if (isMine) {
        // It's my shift and currently Covered
        actionButtons = `
          <button class="btn-action-swap" data-action="offer-coverage" data-shift-id="${shift.id}">
            Offer for coverage
          </button>
        `;
      } else {
        // Covered by someone else
        actionButtons = `<span style="color:#9CA3AF;">&mdash;</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="td-main-bold">${shift.role}</div>
          <div class="td-sub-muted">${shift.serviceName}</div>
        </td>
        <td>
          <div class="td-main-bold">${shift.scheduleDate}</div>
          <div class="td-sub-muted">${shift.startTime} &ndash; ${shift.endTime}</div>
        </td>
        <td>
          ${assignedUser ? `<span class="td-main-bold" style="${isMine ? 'color:#059669;' : ''}">${assignedUser.name}${isMine ? ' (You)' : ''}</span>` : '<span style="color:#6B7280;">Unassigned</span>'}
        </td>
        <td>
          <span class="status-pill ${statusPillClass}">${statusText}</span>
        </td>
        <td class="action-th">
          ${actionButtons}
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // =========================================================================
  // Manager Shift Cards & Validator
  // =========================================================================

  function renderShiftCards() {
    const grid = document.getElementById('scheduledShiftsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    state.shifts.forEach(shift => {
      const u = getUserById(shift.userId);
      const isSelected = state.selectedShiftId === shift.id;
      const roleClass = shift.role.toLowerCase().replace(/\s+/g, '');

      const weeklyHours = u ? u.weeklyHours : 0;
      const otPct = Math.min(100, (weeklyHours / 40.0) * 100);
      const isNearOt = weeklyHours >= 36.0 && weeklyHours <= 40.0;
      const isInOt = weeklyHours > 40.0;

      const card = document.createElement('div');
      card.className = `shift-card ${isSelected ? 'active-target' : ''}`;
      card.setAttribute('data-shift-id', shift.id);

      card.innerHTML = `
        <div>
          <div class="shift-card-header">
            <div>
              <div class="shift-emp-name">${u ? u.name : 'Unassigned Shift'}</div>
              <span class="role-badge ${roleClass}">${shift.role}</span>
            </div>
            <div style="text-align: right;">
              <span style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 800; color: #111827;">
                ${shift.hours.toFixed(1)} hrs
              </span>
            </div>
          </div>

          <div class="shift-details" style="margin-top: 0.75rem;">
            <div class="detail-line">
              <span>Shift Window:</span>
              <strong>${shift.scheduleDate} • ${shift.startTime} – ${shift.endTime}</strong>
            </div>
            <div class="detail-line">
              <span>Station Assignment:</span>
              <span>${shift.notes}</span>
            </div>
            <div class="detail-line">
              <span>Base Pay Rate:</span>
              <strong>${u ? formatCurrency(u.hourlyRate) : '$0.00'}/hr</strong>
            </div>
            <div class="detail-line" style="margin-top: 0.25rem;">
              <span>Weekly Hours Logged:</span>
              <strong style="${isInOt ? 'color:#EF4444;' : isNearOt ? 'color:#F59E0B;' : ''}">
                ${weeklyHours.toFixed(1)} / 40.0h
              </strong>
            </div>
            <div class="progress-bar-wrap" title="${weeklyHours.toFixed(1)} hrs logged this week">
              <div class="progress-fill ${isInOt ? 'in-ot' : isNearOt ? 'near-ot' : ''}" style="width: ${otPct}%;"></div>
            </div>
          </div>
        </div>

        <div>
          <button class="btn-swap" data-action="toggle-swap" data-shift-id="${shift.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 3h5v5"></path>
              <path d="M4 20L21 3"></path>
              <path d="M21 16v5h-5"></path>
              <path d="M15 15l6 6"></path>
              <path d="M4 4l5 5"></path>
            </svg>
            ${isSelected ? 'Evaluating Coverage' : 'Request Cover / Swap'}
          </button>
        </div>
      `;

      grid.appendChild(card);
    });
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
          <p>Click <strong>"Request Cover / Swap"</strong> on any scheduled employee above to evaluate eligible replacement staff.</p>
        </div>
      `;
      updateCandidateFilterCounts(0, 0, 0, 0);
      return;
    }

    const shift = getShiftById(state.selectedShiftId);
    const scheduledUser = getUserById(shift.userId);

    titleEl.innerHTML = `Evaluating Replacement Coverage for <span style="color:#113228;">${scheduledUser ? scheduledUser.name : 'Unassigned Shift'}</span> (${shift.role} • ${shift.hours.toFixed(1)}h)`;
    subtitleEl.textContent = `Shift: ${shift.scheduleDate} • ${shift.startTime} – ${shift.endTime} • Station: ${shift.notes}`;

    actionContainer.innerHTML = `
      <button class="btn btn-card-outline" id="btnCancelSwapSelect">
        ✕ Clear Selection
      </button>
    `;

    document.getElementById('btnCancelSwapSelect')?.addEventListener('click', () => {
      state.selectedShiftId = null;
      renderAll();
    });

    const candidates = state.users.filter(u => !scheduledUser || u.id !== scheduledUser.id);

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
          <p>No candidates match the filter <strong>"${state.candidateFilter.toUpperCase()}"</strong>.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const c = item.candidate;
      const card = document.createElement('div');
      card.className = `candidate-card status-${item.status}`;

      const certsBadges = (c.certifications || []).map(cert => {
        const matches = cert === shift.role;
        return `<span class="cert-pill" style="${matches ? 'background:#113228;color:#fff;' : ''}">${cert}</span>`;
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
            <strong style="color:#059669;">${item.projectedHours.toFixed(1)} / 40.0 hrs (Safe)</strong>
          </div>
          <div class="metric-row">
            <span>Extra Overtime Cost:</span>
            <strong style="color:#059669;">$0.00 (Standard Rate: ${formatCurrency(c.hourlyRate)}/hr)</strong>
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
            <span class="cert-pill" style="background:#FEE2E2;color:#991B1B;">Requires '${shift.role}'</span>
          </div>
          <div class="metric-row">
            <span>Current Station Badges:</span>
            <span>${(c.certifications || []).join(', ') || 'None'}</span>
          </div>
          <div class="metric-row">
            <span>Compliance Status:</span>
            <span style="color:#6B7280;">Station swap restricted</span>
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
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div class="cand-name">${c.name}</div>
            <div class="cand-role-wage">${c.role} • Base ${formatCurrency(c.hourlyRate)}/hr</div>
          </div>
          <span class="legend-badge ${item.badgeClass}">${item.badgeText}</span>
        </div>

        <div class="candidate-metrics">
          ${metricsHtml}
        </div>

        <div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.25rem;">Certifications:</div>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">${certsBadges}</div>
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

  // =========================================================================
  // Approvals & My Requests View (Role-Adaptive)
  // =========================================================================

  function renderApprovalsView() {
    const isMgr = isManagerUser();
    const user = getCurrentUser();
    const list = document.getElementById('approvalsFullList');
    const headingTitle = document.getElementById('approvalsHeadingTitle');
    const headingSubtitle = document.getElementById('approvalsHeadingSubtitle');
    const cardTitle = document.getElementById('approvalsCardHeaderTitle');
    const cardSub = document.getElementById('approvalsCardHeaderSub');

    if (!list || !user) return;

    if (isMgr) {
      if (headingTitle) headingTitle.textContent = 'Shift Change Approvals Queue';
      if (headingSubtitle) headingSubtitle.textContent = 'Manager oversight queue for coverage requests, emergency trades, and overtime authorizations.';
      if (cardTitle) cardTitle.innerHTML = `Pending Requests (<span id="approvalsHeadingCount">${state.approvals.length}</span>)`;
      if (cardSub) cardSub.textContent = 'Awaiting general manager or shift lead authorization';

      list.innerHTML = '';
      if (state.approvals.length === 0) {
        list.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted);">No pending requests awaiting approval.</div>`;
        return;
      }

      state.approvals.forEach(app => {
        const card = document.createElement('div');
        card.className = 'approval-card-item';
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:1rem;">
            <div class="user-circle ${app.circleClass}" style="width:42px;height:42px;font-size:0.9rem;">${app.initials}</div>
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--text-dark);">${app.name}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${app.shiftName} &bull; ${app.shiftRole} &bull; ${app.date}</div>
              <span class="status-pill open" style="margin-top:0.35rem;">${app.status}</span>
              ${app.note ? `<div style="font-size:0.75rem; color:#4B5563; margin-top:0.3rem;">"${app.note}"</div>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-peach" data-action="authorize-approval" data-app-id="${app.id}">
              ✓ Authorize ${app.actionType}
            </button>
            <button class="btn btn-card-outline" data-action="dismiss-approval" data-app-id="${app.id}">
              Dismiss
            </button>
          </div>
        `;
        list.appendChild(card);
      });
    } else {
      // EMPLOYEE VIEW: "MY REQUESTS"
      if (headingTitle) headingTitle.textContent = 'My Requests & Coverage Status';
      if (headingSubtitle) headingSubtitle.textContent = 'Track shift claims, trade proposals, and coverage requests submitted for manager authorization.';
      
      const myRequests = state.approvals.filter(a => a.userId === user.id);
      if (cardTitle) cardTitle.innerHTML = `Your Active Requests (${myRequests.length})`;
      if (cardSub) cardSub.textContent = 'Submitted to shift lead and manager for review';

      list.innerHTML = '';
      if (myRequests.length === 0) {
        list.innerHTML = `
          <div style="padding:2.5rem; text-align:center; color:var(--text-muted);">
            <p>You have no pending requests at this time.</p>
            <p style="font-size:0.8rem; margin-top:0.35rem;">Check the <strong>Shift board</strong> to browse open shifts or request coverage.</p>
          </div>
        `;
        return;
      }

      myRequests.forEach(app => {
        const card = document.createElement('div');
        card.className = 'approval-card-item';
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:1rem;">
            <div class="user-circle ${app.circleClass}" style="width:42px;height:42px;font-size:0.9rem;">${app.initials}</div>
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--text-dark);">${app.actionType}: ${app.shiftRole} (${app.shiftName})</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${app.date} &bull; Submitted by You</div>
              <span class="status-pill open" style="margin-top:0.35rem;">${app.status}</span>
            </div>
          </div>
          <div>
            <button class="btn btn-card-outline" data-action="cancel-my-request" data-app-id="${app.id}">
              Withdraw Request
            </button>
          </div>
        `;
        list.appendChild(card);
      });
    }
  }

  // =========================================================================
  // Tip Pool View
  // =========================================================================

  function renderTipCalculator() {
    const calc = calculateTipPool();
    const isMgr = isManagerUser();
    const user = getCurrentUser();

    const tipInputsRow = document.getElementById('tipInputsRow');
    const tipFormulaStrip = document.getElementById('tipFormulaStrip');
    const tipPoolHeading = document.getElementById('tipPoolHeading');
    const tipPoolSubheading = document.getElementById('tipPoolSubheading');
    const tipPoolHeaderActions = document.getElementById('tipPoolHeaderActions');

    if (!isMgr) {
      if (tipPoolHeading) tipPoolHeading.textContent = 'My Pooled Cash Tips & Earnings';
      if (tipPoolSubheading) tipPoolSubheading.textContent = 'Transparent breakdown of your weighted tip allocation based on verified hours logged tonight.';
    } else {
      if (tipPoolHeading) tipPoolHeading.textContent = 'End-of-Night Tip-Pool Split';
      if (tipPoolSubheading) tipPoolSubheading.textContent = 'Synchronized live with tonight\'s verified working floor crew. Enter tips and verify role multipliers for deterministic, penny-reconciled payouts.';
    }

    const cashInput = document.getElementById('inputCashTips');
    const ccInput = document.getElementById('inputCcTips');
    if (cashInput && document.activeElement !== cashInput) cashInput.value = state.tips.cash;
    if (ccInput && document.activeElement !== ccInput) ccInput.value = state.tips.cc;

    const totalDisplay = document.getElementById('displayTotalTipPool');
    const miniCash = document.getElementById('miniCash');
    const miniCc = document.getElementById('miniCc');

    if (totalDisplay) totalDisplay.textContent = formatCurrency(calc.totalTips);
    if (miniCash) miniCash.textContent = formatCurrency(calc.cashTips);
    if (miniCc) miniCc.textContent = formatCurrency(calc.ccTips);

    const reconStatus = document.getElementById('reconciliationStatus');
    if (reconStatus) {
      if (Math.abs(calc.reconciliationDiff) < 0.001) {
        reconStatus.innerHTML = `<span class="dot green"></span> Exact Cent Balanced: $0.00 Penny Remainder`;
      } else {
        reconStatus.innerHTML = `<span class="dot amber"></span> Variance: ${formatCurrency(calc.reconciliationDiff)}`;
      }
    }

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
      const isCurrent = user && user.id === item.user.id;

      const tr = document.createElement('tr');
      if (isCurrent && !isMgr) {
        tr.style.background = '#F0FDF4';
      }

      tr.innerHTML = `
        <td>
          <div class="td-main-bold">${item.user.name} ${isCurrent ? '<span style="color:#059669;font-weight:700;">(You)</span>' : ''}</div>
          ${item.user.role !== 'Employee' ? `<span class="manager-badge" style="font-size:0.65rem;">FLSA Excluded (${item.user.role})</span>` : ''}
        </td>
        <td>
          <span class="role-badge ${item.role.toLowerCase().replace(/\s+/g, '')}">${item.role}</span>
        </td>
        <td class="num-col">
          ${isMgr ? `
            <input type="number" 
                   class="shift-hour-input" 
                   min="0.5" 
                   max="16.0" 
                   step="0.5" 
                   value="${item.hoursWorked}" 
                   data-shift-id="${item.shiftId}">
          ` : `
            <strong>${item.hoursWorked.toFixed(1)} hrs</strong>
          `}
        </td>
        <td class="num-col" style="${isZero ? 'color:#9CA3AF;' : ''}">${item.weight.toFixed(1)}x</td>
        <td class="num-col" style="${isZero ? 'color:#9CA3AF;' : ''}">${item.weightedHours.toFixed(2)}</td>
        <td class="num-col" style="${isZero ? 'color:#9CA3AF;' : ''}">${item.poolSharePercent.toFixed(1)}%</td>
        <td class="num-col" style="color:#059669; font-weight:700;">${formatCurrency(item.cashPayout)}</td>
        <td class="num-col" style="color:#0284C7; font-weight:700;">${formatCurrency(item.ccPayout)}</td>
        <td class="num-col highlight-cell">${formatCurrency(item.totalPayout)}</td>
      `;

      tbody.appendChild(tr);
    });

    tfoot.innerHTML = `
      <tr>
        <td colspan="2"><strong>TOTAL WORKING FLOOR POOL</strong></td>
        <td class="num-col"><strong>${calc.totalWorkingHours.toFixed(1)} hrs</strong></td>
        <td class="num-col">&mdash;</td>
        <td class="num-col"><strong>${calc.totalWeightedHours.toFixed(2)} pts</strong></td>
        <td class="num-col"><strong>100.0%</strong></td>
        <td class="num-col" style="color:#059669; font-weight:800;">${formatCurrency(sumCash)}</td>
        <td class="num-col" style="color:#0284C7; font-weight:800;">${formatCurrency(sumCc)}</td>
        <td class="num-col highlight-cell" style="font-size:1rem;">${formatCurrency(sumTotal)}</td>
      </tr>
    `;
  }

  function renderRoleWeightSliders() {
    const container = document.getElementById('roleWeightsList');
    if (!container) return;

    container.innerHTML = '';
    const roles = ['Bartender', 'Server', 'Host', 'Busser', 'Line cook', 'Shift Lead'];

    roles.forEach(role => {
      const weight = state.roleWeights[role] !== undefined ? state.roleWeights[role] : 1.0;
      const isShiftLead = role === 'Shift Lead';
      const isMgr = isManagerUser();

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
                 ${(isShiftLead || !isMgr) ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
          <span class="weight-val-badge">${weight.toFixed(1)}x</span>
        </div>
      `;

      container.appendChild(row);
    });
  }

  function renderRosterTable() {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    state.users.forEach(u => {
      const activeShift = state.shifts.find(s => s.userId === u.id);
      const isWorking = !!activeShift;
      const certPills = (u.certifications || []).map(c => `<span class="cert-pill">${c}</span>`).join(' ');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="td-main-bold">${u.name}</div>
          ${u.role !== 'Employee' ? `<span class="manager-badge" style="font-size:0.65rem;">${u.role}</span>` : ''}
        </td>
        <td>${(u.certifications && u.certifications[0]) || u.role}</td>
        <td>${certPills}</td>
        <td class="num-col">${formatCurrency(u.hourlyRate)}/hr</td>
        <td class="num-col" style="${u.weeklyHours >= 36 ? (u.weeklyHours > 40 ? 'color:#EF4444;font-weight:800;' : 'color:#F59E0B;font-weight:800;') : ''}">
          ${u.weeklyHours.toFixed(1)} hrs
        </td>
        <td>
          ${isWorking 
            ? `<span class="status-pill safe">Working (${activeShift.hours}h)</span>` 
            : `<span class="status-pill up-for-grabs">Off Floor</span>`}
        </td>
        <td class="action-th">
          <button class="btn-card-outline" style="padding:0.25rem 0.55rem;font-size:0.75rem;" data-action="edit-hours" data-user-id="${u.id}">
            Adjust Hours
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function renderManageAccessView() {
    const container = document.getElementById('accessUsersList');
    if (!container) return;

    container.innerHTML = '';
    state.users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'access-user-row';
      row.setAttribute('data-user-id', user.id);

      const isPrimary = user.isPrimaryAdmin;

      row.innerHTML = `
        <div class="access-user-left">
          <span class="access-name">${user.name}</span>
        </div>

        <div class="access-user-controls">
          <select class="access-role-select" data-user-id="${user.id}" ${isPrimary ? 'disabled style="opacity:0.75;"' : ''}>
            <option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option>
            <option value="Manager" ${user.role === 'Manager' ? 'selected' : ''}>Manager</option>
            <option value="Employee" ${user.role === 'Employee' ? 'selected' : ''}>Employee</option>
          </select>

          <input 
            type="password" 
            class="access-pin-input" 
            maxlength="4" 
            placeholder="New PIN" 
            data-user-id="${user.id}" 
            title="Enter a new 4-digit PIN for ${user.name}">

          <button class="btn-access-save" data-action="save-access-user" data-user-id="${user.id}">
            Save
          </button>

          ${!isPrimary ? `
            <button class="btn-access-edit" data-action="edit-profile" data-user-id="${user.id}">
              Edit profile
            </button>
            <button class="btn-access-remove" data-action="remove-user" data-user-id="${user.id}">
              Remove
            </button>
          ` : `
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; padding: 0.2rem 0.5rem;">Primary Admin</span>
          `}
        </div>
      `;

      container.appendChild(row);
    });
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
            <span>${item.user.name} (${item.role})</span>
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
    renderOverviewDashboard();
    renderShiftBoardView();
    renderRosterTable();
    renderRoleWeightSliders();
    renderTipCalculator();
    renderApprovalsView();
    renderManageAccessView();
  }

  // =========================================================================
  // Toast Notifications
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
      <span style="font-weight:800;">${icon}</span>
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
  // View Routing
  // =========================================================================

  const viewTitlesManager = {
    'view-overview': 'Overview',
    'view-shifts': 'Shift coverage',
    'view-tips': 'Tip pool',
    'view-approvals': 'Approvals',
    'view-roster': 'Team roster',
    'view-audit': 'Audit log',
    'view-access': 'Manage access'
  };

  const viewTitlesEmployee = {
    'view-overview': 'Overview',
    'view-shifts': 'Shift board',
    'view-tips': 'Cash tips',
    'view-approvals': 'My requests'
  };

  function switchView(viewId) {
    state.currentView = viewId;
    const isMgr = isManagerUser();

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === viewId);
    });

    const crumbCurrent = document.getElementById('breadcrumbCurrent');
    if (crumbCurrent) {
      const titles = isMgr ? viewTitlesManager : viewTitlesEmployee;
      crumbCurrent.textContent = titles[viewId] || 'Workspace';
    }

    document.getElementById('sidebar')?.classList.remove('open');

    if (viewId === 'view-shifts') {
      renderShiftBoardView();
    } else if (viewId === 'view-tips') {
      renderTipCalculator();
    } else if (viewId === 'view-approvals') {
      renderApprovalsView();
    } else if (viewId === 'view-access') {
      renderManageAccessView();
    }
  }

  // =========================================================================
  // Event Delegation & Setup
  // =========================================================================

  let activeSwapShiftId = null;

  function openProposeSwapModal(shiftId) {
    const shift = getShiftById(shiftId);
    const user = getCurrentUser();
    if (!shift || !user) return;

    activeSwapShiftId = shiftId;

    const modal = document.getElementById('proposeSwapModal');
    const titleEl = document.getElementById('swapModalMyShiftTitle');
    const timeEl = document.getElementById('swapModalMyShiftTime');
    const selectEl = document.getElementById('swapTargetUserSelect');

    if (titleEl) titleEl.textContent = `${shift.role} (${shift.serviceName})`;
    if (timeEl) timeEl.textContent = `${shift.scheduleDate} • ${shift.startTime} – ${shift.endTime} (${shift.hours.toFixed(1)}h)`;

    // Populate qualified colleagues
    if (selectEl) {
      selectEl.innerHTML = '';
      const qualified = state.users.filter(u => 
        u.id !== user.id && 
        u.role === 'Employee' && 
        (u.certifications || []).includes(shift.role)
      );

      if (qualified.length === 0) {
        selectEl.innerHTML = `<option value="">No other employees currently certified for ${shift.role}</option>`;
      } else {
        qualified.forEach(q => {
          const opt = document.createElement('option');
          opt.value = q.id;
          opt.textContent = `${q.name} (${q.role} • ${q.weeklyHours}h logged)`;
          selectEl.appendChild(opt);
        });
      }
    }

    modal?.classList.add('open');
  }

  function setupEventListeners() {
    // PIN Login Form
    const pinForm = document.getElementById('pinLoginForm');
    const pinInput = document.getElementById('inputPin');
    const pinError = document.getElementById('pinErrorMessage');

    pinForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = authenticatePin(pinInput.value);
      if (res.success) {
        if (pinError) pinError.style.display = 'none';
        updateAuthUi();
        showToast(`Welcome, ${res.user.name} (${res.user.role})! Workspace unlocked.`, 'success');
      } else {
        if (pinError) {
          pinError.textContent = res.message;
          pinError.style.display = 'block';
        }
        pinInput.focus();
        pinInput.select();
      }
    });

    document.querySelectorAll('.chip-pin').forEach(chip => {
      chip.addEventListener('click', () => {
        const pin = chip.getAttribute('data-pin');
        if (pinInput) {
          pinInput.value = pin;
          pinForm?.dispatchEvent(new Event('submit'));
        }
      });
    });

    document.getElementById('btnSignOut')?.addEventListener('click', signOut);

    // Sidebar navigation clicks
    document.getElementById('sidebarNav')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (!btn) return;
      const viewId = btn.getAttribute('data-view');
      if (viewId) switchView(viewId);
    });

    document.getElementById('btnToggleSidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Hero buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('#heroReviewCoverageBtn') || e.target.closest('#heroBrowseOpenShiftsBtn') || e.target.closest('#btnViewSchedule')) {
        switchView('view-shifts');
        return;
      }

      if (e.target.closest('#btnEmployeeLogCashTips')) {
        switchView('view-tips');
        return;
      }

      if (e.target.closest('#btnReviewRequests')) {
        switchView('view-approvals');
        return;
      }

      if (e.target.closest('#heroTryDemoBtn')) {
        const isMgr = isManagerUser();
        if (isMgr) {
          state.selectedShiftId = 'shift-1';
          saveState();
          renderAll();
          switchView('view-shifts');
          showToast('⚡ Friday Dinner Rush loaded! Server shift selected for coverage check.', 'warning');
        } else {
          switchView('view-shifts');
          showToast('⚡ Shift board loaded! Click "Claim" on an open shift to submit a request for manager approval.', 'info');
        }
        return;
      }
    });

    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('Reset all changes back to initial Juniper Kitchen restaurant data?')) {
        resetState();
      }
    });

    // KPI Card navigation
    document.querySelectorAll('.kpi-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.getAttribute('data-action');
        if (action === 'go-shifts') switchView('view-shifts');
        else if (action === 'go-approvals') switchView('view-approvals');
        else if (action === 'go-tips') switchView('view-tips');
      });
    });

    // Employee Shift Filter Dropdown (All shifts, My shifts, Claimable shifts)
    document.getElementById('employeeShiftFilterSelect')?.addEventListener('change', (e) => {
      state.employeeShiftFilter = e.target.value;
      renderEmployeeMasterSchedule();
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

    // Propose Swap Modal
    const proposeModal = document.getElementById('proposeSwapModal');
    const closeProposeModal = () => proposeModal?.classList.remove('open');
    document.getElementById('btnCloseSwapModal')?.addEventListener('click', closeProposeModal);
    document.getElementById('btnCancelSwapModal')?.addEventListener('click', closeProposeModal);

    document.getElementById('proposeSwapForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const targetUserId = document.getElementById('swapTargetUserSelect').value;
      const note = document.getElementById('swapNoteInput').value.trim();
      const user = getCurrentUser();
      const shift = getShiftById(activeSwapShiftId);
      const targetUser = getUserById(targetUserId);

      if (!shift || !user || !targetUser) return;

      const newApproval = {
        id: 'app-' + Date.now(),
        userId: user.id,
        name: user.name,
        initials: user.initials,
        circleClass: (user.initials || 'mc').toLowerCase(),
        shiftId: shift.id,
        shiftRole: shift.role,
        shiftName: shift.serviceName,
        actionType: 'Swap',
        targetUserId: targetUser.id,
        status: 'Awaiting manager review',
        date: shift.scheduleDate,
        note: note || `Proposed trade with ${targetUser.name}`
      };

      state.approvals.push(newApproval);
      shift.status = 'Up for Grabs';
      shift.statusClass = 'up-for-grabs';

      saveState();
      renderAll();
      closeProposeModal();

      showToast(`Swap proposal sent to ${targetUser.name}! Submitted for manager review.`, 'success');
    });

    // Global Click Delegation
    document.addEventListener('click', (e) => {
      // Employee Claim shift
      const claimBtn = e.target.closest('[data-action="claim-shift"]');
      if (claimBtn) {
        const shiftId = claimBtn.getAttribute('data-shift-id');
        handleEmployeeClaimShift(shiftId);
        return;
      }

      // Employee Offer shift for coverage
      const offerBtn = e.target.closest('[data-action="offer-coverage"]');
      if (offerBtn) {
        const shiftId = offerBtn.getAttribute('data-shift-id');
        handleEmployeeOfferCoverage(shiftId);
        return;
      }

      // Employee Withdraw shift offer
      const withdrawBtn = e.target.closest('[data-action="withdraw-coverage"]');
      if (withdrawBtn) {
        const shiftId = withdrawBtn.getAttribute('data-shift-id');
        handleEmployeeWithdrawCoverage(shiftId);
        return;
      }

      // Employee Propose swap
      const propSwapBtn = e.target.closest('[data-action="open-propose-swap"]');
      if (propSwapBtn) {
        const shiftId = propSwapBtn.getAttribute('data-shift-id');
        openProposeSwapModal(shiftId);
        return;
      }

      // Employee Cancel My Request
      const cancelReqBtn = e.target.closest('[data-action="cancel-my-request"]');
      if (cancelReqBtn) {
        const appId = cancelReqBtn.getAttribute('data-app-id');
        state.approvals = state.approvals.filter(a => a.id !== appId);
        saveState();
        renderAll();
        showToast('Your request has been withdrawn.', 'info');
        return;
      }

      // Manager Authorize Approval
      const authBtn = e.target.closest('[data-action="authorize-approval"]');
      if (authBtn) {
        const appId = authBtn.getAttribute('data-app-id');
        authorizeManagerApproval(appId);
        return;
      }

      // Manager Dismiss Approval
      const disBtn = e.target.closest('[data-action="dismiss-approval"]');
      if (disBtn) {
        const appId = disBtn.getAttribute('data-app-id');
        dismissManagerApproval(appId);
        return;
      }

      // Manager Validate shift
      const valBtn = e.target.closest('[data-action="validate-shift"]');
      if (valBtn) {
        const shiftId = valBtn.getAttribute('data-shift-id');
        state.selectedShiftId = shiftId;
        switchView('view-shifts');
        renderShiftCards();
        renderSwapEnginePanel();
        showToast('Shift selected in Coverage Validator.', 'info');
        return;
      }

      // Manager Toggle swap
      const swapBtn = e.target.closest('[data-action="toggle-swap"]');
      if (swapBtn) {
        const shiftId = swapBtn.getAttribute('data-shift-id');
        state.selectedShiftId = state.selectedShiftId === shiftId ? null : shiftId;
        renderShiftCards();
        renderSwapEnginePanel();
        return;
      }

      // Manager Approve swap from engine
      const approveSwapBtn = e.target.closest('[data-action="approve-swap"]');
      if (approveSwapBtn) {
        const candId = approveSwapBtn.getAttribute('data-cand-id');
        const shiftId = approveSwapBtn.getAttribute('data-shift-id');
        const shift = getShiftById(shiftId);
        const candidate = getUserById(candId);
        if (shift && candidate) {
          const shiftHours = shift.hours;
          if (shift.userId) {
            const prev = getUserById(shift.userId);
            if (prev) prev.weeklyHours = Math.max(0, parseFloat((prev.weeklyHours - shiftHours).toFixed(1)));
          }
          shift.userId = candidate.id;
          shift.status = 'Covered';
          shift.statusClass = 'covered';
          candidate.weeklyHours = parseFloat((candidate.weeklyHours + shiftHours).toFixed(1));
          saveState();
          renderAll();
          showToast(`Swap Approved: ${candidate.name} is now covering ${shift.role}.`, 'success');
        }
        return;
      }

      // Manage Access: Save User
      const saveAccessBtn = e.target.closest('[data-action="save-access-user"]');
      if (saveAccessBtn) {
        const userId = saveAccessBtn.getAttribute('data-user-id');
        const user = getUserById(userId);
        if (!user) return;

        const row = saveAccessBtn.closest('.access-user-row');
        const roleSelect = row.querySelector('.access-role-select');
        const pinInput = row.querySelector('.access-pin-input');

        let updatedMsg = [];
        if (roleSelect && roleSelect.value !== user.role) {
          user.role = roleSelect.value;
          updatedMsg.push(`Role: ${user.role}`);
        }

        const newPin = (pinInput?.value || '').trim();
        if (newPin) {
          if (newPin.length !== 4) {
            alert('PIN must be exactly 4 digits.');
            return;
          }
          const conflict = state.users.find(u => u.pin === newPin && u.id !== user.id);
          if (conflict) {
            alert(`PIN ${newPin} is already assigned to ${conflict.name}.`);
            return;
          }
          user.pin = newPin;
          pinInput.value = '';
          updatedMsg.push(`PIN updated`);
        }

        if (updatedMsg.length > 0) {
          saveState();
          renderAll();
          showToast(`Saved changes for ${user.name}: ${updatedMsg.join(', ')}.`, 'success');
        } else {
          showToast(`No changes made for ${user.name}.`, 'info');
        }
        return;
      }

      // Manage Access: Edit profile
      const editProfileBtn = e.target.closest('[data-action="edit-profile"]');
      if (editProfileBtn) {
        const userId = editProfileBtn.getAttribute('data-user-id');
        const user = getUserById(userId);
        if (user) {
          const newName = prompt(`Edit name for ${user.name}:`, user.name);
          if (newName && newName.trim()) {
            user.name = newName.trim();
            user.initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            saveState();
            renderAll();
            showToast(`Updated name to ${user.name}.`, 'info');
          }
        }
        return;
      }

      // Manage Access: Remove user
      const removeUserBtn = e.target.closest('[data-action="remove-user"]');
      if (removeUserBtn) {
        const userId = removeUserBtn.getAttribute('data-user-id');
        const user = getUserById(userId);
        if (user && confirm(`Remove ${user.name} from the access directory?`)) {
          state.users = state.users.filter(u => u.id !== userId);
          saveState();
          renderAll();
          showToast(`Removed ${user.name} from directory.`, 'warning');
        }
        return;
      }
    });

    // Tip Pool Inputs
    document.getElementById('inputCashTips')?.addEventListener('input', (e) => {
      state.tips.cash = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
      renderOverviewDashboard();
    });

    document.getElementById('inputCcTips')?.addEventListener('input', (e) => {
      state.tips.cc = parseFloat(e.target.value) || 0;
      saveState();
      renderTipCalculator();
      renderOverviewDashboard();
    });

    document.getElementById('btnResetWeights')?.addEventListener('click', () => {
      state.roleWeights = JSON.parse(JSON.stringify(DEFAULT_WEIGHTS));
      saveState();
      renderRoleWeightSliders();
      renderTipCalculator();
      showToast('Role multipliers reset to restaurant standards.', 'info');
    });

    document.getElementById('roleWeightsList')?.addEventListener('input', (e) => {
      if (e.target.classList.contains('range-slider')) {
        const role = e.target.getAttribute('data-role');
        const val = parseFloat(e.target.value);
        if (role && !isNaN(val)) {
          state.roleWeights[role] = val;
          const badge = e.target.parentElement.querySelector('.weight-val-badge');
          if (badge) badge.textContent = `${val.toFixed(1)}x`;
          saveState();
          renderTipCalculator();
        }
      }
    });

    // Modals
    const modal = document.getElementById('receiptModal');
    document.getElementById('btnPrintReceiptBtn')?.addEventListener('click', () => {
      renderReceiptModal();
      modal?.classList.add('open');
    });
    document.getElementById('btnCloseModal')?.addEventListener('click', () => modal?.classList.remove('open'));
    document.getElementById('btnModalCloseSecondary')?.addEventListener('click', () => modal?.classList.remove('open'));
    document.getElementById('btnModalPrint')?.addEventListener('click', () => window.print());

    document.getElementById('btnCopySummaryBtn')?.addEventListener('click', () => {
      const calc = calculateTipPool();
      let text = `✦ JUNIPER KITCHEN • TIP POOL SUMMARY ✦\n`;
      text += `Total Pool: ${formatCurrency(calc.totalTips)} (Cash: ${formatCurrency(calc.cashTips)} | CC: ${formatCurrency(calc.ccTips)})\n`;
      calc.crew.forEach(c => {
        text += `• ${c.user.name} (${c.role}): Total ${formatCurrency(c.totalPayout)} (Cash ${formatCurrency(c.cashPayout)}, CC ${formatCurrency(c.ccPayout)})\n`;
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
    updateAuthUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
