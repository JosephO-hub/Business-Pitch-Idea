/**
 * Service Ledger — Shift & Tip Optimizer (v2.0)
 * Juniper Kitchen Restaurant Operations System
 * Standards-compliant with /shift-tip-standards:
 * - Multi-Role Perspectives: Manager vs Employee
 * - Manager-Only Schedule Builder (Bi-Weekly & Monthly Generator)
 * - Single Source of Truth: Unified Schedule Data Array in localStorage
 * - Real-Time Sync with Manager-Approved Shift Coverage Changes
 * - Subtle "Covered / Swapped" Status Badges & Verified Audit Trail
 * - Standard Straight-Time Wage Policy (Zero Overtime Multipliers)
 * - FLSA 29 U.S.C. § 203(m)(2)(B) Manager Tip Exclusion Guardrail
 */

(function () {
  'use strict';

  // =========================================================================
  // Baseline Data & Helper Utilities
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
      weeklyHours: 36.0
    },
    {
      id: 'usr-3',
      name: 'Jordan Ellis',
      role: 'Employee',
      pin: '2222',
      initials: 'JE',
      certifications: ['Bartender', 'Server'],
      hourlyRate: 14.50,
      weeklyHours: 32.0
    },
    {
      id: 'usr-4',
      name: 'Sofia Reyes',
      role: 'Employee',
      pin: '3333',
      initials: 'SR',
      certifications: ['Bartender'],
      hourlyRate: 15.00,
      weeklyHours: 30.0
    },
    {
      id: 'usr-5',
      name: 'Eli Brooks',
      role: 'Employee',
      pin: '4444',
      initials: 'EB',
      certifications: ['Busser', 'Server'],
      hourlyRate: 13.00,
      weeklyHours: 25.0
    },
    {
      id: 'usr-6',
      name: 'Noah Patel',
      role: 'Employee',
      pin: '5555',
      initials: 'NP',
      certifications: ['Line cook'],
      hourlyRate: 19.00,
      weeklyHours: 36.0
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
      weeklyHours: 24.0
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

  const STORAGE_KEY = 'service_ledger_state_v4';

  function formatDateDisplay(d) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }

  function formatDateIso(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatRangeDisplay(startDateStr, totalDays) {
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(start.getTime() + (totalDays - 1) * 86400000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[start.getMonth()]} ${start.getDate()} \u2013 ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  // =========================================================================
  // Schedule Generator Engine (Bi-Weekly & Monthly Starter Templates)
  // =========================================================================

  function generateStarterShifts(periodType = 'biweekly', startDateStr = '2026-11-20') {
    const totalDays = periodType === 'monthly' ? 30 : 14;
    const start = new Date(startDateStr + 'T00:00:00');
    const shifts = [];

    // Service template pattern across the rotation
    const dailyPatterns = [
      // Day pattern 0 (Friday)
      [
        { role: 'Server', service: 'Dinner service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Main Dining Room', user: null, status: 'Open', statusClass: 'open' },
        { role: 'Bartender', service: 'Bar close', start: '5:00 PM', end: '11:00 PM', hours: 6.0, notes: 'Craft Bar', user: 'usr-4', status: 'Covered', statusClass: 'covered' },
        { role: 'Line cook', service: 'Evening prep', start: '3:00 PM', end: '9:00 PM', hours: 6.0, notes: 'Hot Line', user: 'usr-6', status: 'Covered', statusClass: 'covered' },
        { role: 'Shift Lead', service: 'Dinner service', start: '4:00 PM', end: '12:00 AM', hours: 8.0, notes: 'Floor Lead', user: 'usr-7', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 1 (Saturday)
      [
        { role: 'Server', service: 'Dinner service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Dining Room', user: 'usr-2', status: 'Covered', statusClass: 'covered' },
        { role: 'Bartender', service: 'Bar close', start: '5:00 PM', end: '11:00 PM', hours: 6.0, notes: 'Craft Bar & Lounge', user: 'usr-3', status: 'Up for Grabs', statusClass: 'up-for-grabs' },
        { role: 'Host', service: 'Lunch service', start: '10:00 AM', end: '3:00 PM', hours: 5.0, notes: 'Front Door', user: 'usr-8', status: 'Covered', statusClass: 'covered' },
        { role: 'Line cook', service: 'Kitchen prep', start: '3:00 PM', end: '9:00 PM', hours: 6.0, notes: 'Sautee Station', user: 'usr-6', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 2 (Sunday)
      [
        { role: 'Host', service: 'Brunch service', start: '10:00 AM', end: '3:00 PM', hours: 5.0, notes: 'Entrance & Reservations', user: null, status: 'Open', statusClass: 'open' },
        { role: 'Server', service: 'Patio service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Patio & Section 2', user: 'usr-2', status: 'Covered', statusClass: 'covered' },
        { role: 'Bartender', service: 'Main bar', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Bar Section', user: 'usr-4', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 3 (Monday - includes Swapped shift demonstration)
      [
        { role: 'Server', service: 'Dinner service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Dining Room', user: 'usr-2', status: 'Covered', statusClass: 'swapped', isSwapped: true, swappedFrom: 'Jordan Ellis', swapApprovedAt: 'Nov 20, 2026, 02:30 PM' },
        { role: 'Line cook', service: 'Evening prep', start: '3:00 PM', end: '9:00 PM', hours: 6.0, notes: 'Hot Line & Sautee', user: 'usr-6', status: 'Covered', statusClass: 'covered' },
        { role: 'Busser', service: 'Evening busser', start: '5:00 PM', end: '10:00 PM', hours: 5.0, notes: 'Floor Support', user: 'usr-5', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 4 (Tuesday)
      [
        { role: 'Server', service: 'Dinner service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Section 1', user: 'usr-3', status: 'Covered', statusClass: 'covered' },
        { role: 'Bartender', service: 'Bar service', start: '4:30 PM', end: '10:30 PM', hours: 6.0, notes: 'Lounge Bar', user: 'usr-4', status: 'Covered', statusClass: 'covered' },
        { role: 'Host', service: 'Dinner host', start: '4:00 PM', end: '9:00 PM', hours: 5.0, notes: 'Host Stand', user: 'usr-8', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 5 (Wednesday)
      [
        { role: 'Server', service: 'Dinner turnover', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Main Floor', user: 'usr-5', status: 'Covered', statusClass: 'covered' },
        { role: 'Line cook', service: 'Line service', start: '3:00 PM', end: '9:00 PM', hours: 6.0, notes: 'Kitchen Sautee', user: 'usr-6', status: 'Covered', statusClass: 'covered' },
        { role: 'Shift Lead', service: 'Floor lead', start: '4:00 PM', end: '11:00 PM', hours: 7.0, notes: 'Floor Management', user: 'usr-7', status: 'Covered', statusClass: 'covered' }
      ],
      // Day pattern 6 (Thursday)
      [
        { role: 'Server', service: 'Dinner service', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Dining Room', user: 'usr-2', status: 'Covered', statusClass: 'covered' },
        { role: 'Bartender', service: 'Bar turnover', start: '4:00 PM', end: '10:00 PM', hours: 6.0, notes: 'Main Bar', user: 'usr-3', status: 'Covered', statusClass: 'covered' },
        { role: 'Host', service: 'Evening host', start: '4:30 PM', end: '9:30 PM', hours: 5.0, notes: 'Front Desk', user: 'usr-8', status: 'Covered', statusClass: 'covered' }
      ]
    ];

    let shiftCounter = 1;

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const currentDay = new Date(start.getTime() + dayIndex * 86400000);
      const dateDisplay = formatDateDisplay(currentDay);
      const dateIso = formatDateIso(currentDay);
      const patternIndex = dayIndex % dailyPatterns.length;
      const pattern = dailyPatterns[patternIndex];

      pattern.forEach(tpl => {
        shifts.push({
          id: `shift-${shiftCounter++}`,
          userId: tpl.user,
          role: tpl.role,
          serviceName: tpl.service,
          scheduleDate: dateDisplay,
          dateIso: dateIso,
          startTime: tpl.start,
          endTime: tpl.end,
          hours: tpl.hours,
          status: tpl.status,
          statusClass: tpl.statusClass,
          notes: tpl.notes,
          isSwapped: !!tpl.isSwapped,
          swappedFrom: tpl.swappedFrom || null,
          swapApprovedAt: tpl.swapApprovedAt || null
        });
      });
    }

    return shifts;
  }

  const INITIAL_AUDIT_LOG = [
    {
      id: 'audit-1',
      timestamp: 'Nov 20, 2026, 09:00 AM',
      action: 'Schedule Published',
      details: 'Bi-Weekly schedule generated & published by Paul Parajuli (Admin). 28 shifts created.',
      type: 'schedule',
      status: 'PUBLISHED'
    },
    {
      id: 'audit-2',
      timestamp: 'Nov 20, 2026, 02:30 PM',
      action: 'Shift Swap Authorized',
      details: 'Maya Chen covered Server shift (Mon, Nov 23, 6.0h). Previously assigned to: Jordan Ellis.',
      type: 'coverage',
      status: 'APPROVED'
    },
    {
      id: 'audit-3',
      timestamp: 'Nov 20, 2026, 04:15 PM',
      action: 'Shift Put Up for Grabs',
      details: 'Jordan Ellis placed Sat, Nov 21 Bartender shift (6.0h) Up for Grabs.',
      type: 'coverage',
      status: 'POSTED'
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
      shiftId: 'shift-6',
      shiftRole: 'Bartender',
      shiftName: 'Bar close',
      actionType: 'Swap',
      targetUserId: 'usr-3', // Jordan Ellis
      status: 'Awaiting manager review',
      date: 'Sat, Nov 21',
      note: 'Agreed to trade Bar close shift with Jordan Ellis'
    }
  ];

  // =========================================================================
  // State Container & LocalStorage Single Source of Truth
  // =========================================================================

  let state = {
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    shifts: generateStarterShifts('biweekly', '2026-11-20'),
    approvals: JSON.parse(JSON.stringify(INITIAL_APPROVALS)),
    auditLog: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG)),
    scheduleSettings: {
      periodType: 'biweekly',
      startDate: '2026-11-20',
      isPublished: true,
      publishedAt: '2026-11-20T09:00:00Z'
    },
    scheduleViewPeriod: 'biweekly', // 'biweekly' or 'monthly'
    scheduleFilter: 'all', // 'all', 'my-shifts', 'grabs', 'swapped'
    scheduleDateFilter: 'all',
    currentUserId: 'usr-3', // Default demo: Jordan Ellis (Employee)
    currentView: 'view-overview',
    selectedShiftId: null,
    candidateFilter: 'all',
    tips: {
      cash: 284.50,
      cc: 1000.00
    },
    roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
    shiftHoursOverride: {}
  };

  function recalculateUserHoursFromSchedule() {
    state.users.forEach(u => {
      let totalHours = 0;
      state.shifts.forEach(s => {
        if (s.userId === u.id) {
          totalHours += getShiftActualHours(s);
        }
      });
      u.weeklyHours = parseFloat(totalHours.toFixed(1));
    });
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.users && parsed.shifts && parsed.shifts.length > 0) {
          state = parsed;
          state.roleWeights = Object.assign({}, DEFAULT_WEIGHTS, state.roleWeights);
          state.roleWeights['Shift Lead'] = 0.0;
          if (!state.auditLog) state.auditLog = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG));
          if (!state.scheduleSettings) {
            state.scheduleSettings = {
              periodType: 'biweekly',
              startDate: '2026-11-20',
              isPublished: true,
              publishedAt: '2026-11-20T09:00:00Z'
            };
          }
          if (!state.scheduleViewPeriod) state.scheduleViewPeriod = 'biweekly';
          if (!state.scheduleFilter) state.scheduleFilter = 'all';
          if (!state.scheduleDateFilter) state.scheduleDateFilter = 'all';
        }
      }
    } catch (e) {
      console.warn('Could not load localStorage state:', e);
    }
    recalculateUserHoursFromSchedule();
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
      shifts: generateStarterShifts('biweekly', '2026-11-20'),
      approvals: JSON.parse(JSON.stringify(INITIAL_APPROVALS)),
      auditLog: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG)),
      scheduleSettings: {
        periodType: 'biweekly',
        startDate: '2026-11-20',
        isPublished: true,
        publishedAt: '2026-11-20T09:00:00Z'
      },
      scheduleViewPeriod: 'biweekly',
      scheduleFilter: 'all',
      scheduleDateFilter: 'all',
      currentUserId: 'usr-3', // Jordan Ellis (Employee)
      currentView: 'view-overview',
      selectedShiftId: null,
      candidateFilter: 'all',
      tips: {
        cash: 284.50,
        cc: 1000.00
      },
      roleWeights: JSON.parse(JSON.stringify(DEFAULT_WEIGHTS)),
      shiftHoursOverride: {}
    };
    recalculateUserHoursFromSchedule();
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
      if (loginScreen) loginScreen.style.display = 'flex';
      if (mainApp) mainApp.style.display = 'none';
    } else {
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';

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
      nav.innerHTML = `
        <button class="nav-item ${state.currentView === 'view-overview' ? 'active' : ''}" data-view="view-overview">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>
          <span class="nav-label">Overview</span>
        </button>

        <button class="nav-item ${state.currentView === 'view-shifts' ? 'active' : ''}" data-view="view-shifts">
          <span class="nav-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>
          <span class="nav-label">Master schedule</span>
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
  // Standard Straight-Time Evaluation (No Overtime Multipliers)
  // =========================================================================

  function evaluateCoverageCandidate(candidate, targetShift) {
    const isCertified = candidate.certifications && candidate.certifications.includes(targetShift.role);
    const shiftHours = targetShift.hours;
    const shiftPay = shiftHours * candidate.hourlyRate;
    const projectedHours = candidate.weeklyHours + shiftHours;

    if (!isCertified) {
      return {
        status: 'mismatch',
        badgeText: 'Role Mismatch',
        badgeClass: 'mismatch',
        reason: `Lacks required '${targetShift.role}' certification. Has: [${(candidate.certifications || []).join(', ')}]`,
        canApprove: false,
        shiftPay: shiftPay,
        projectedHours: projectedHours
      };
    }

    return {
      status: 'safe',
      badgeText: 'Qualified to Cover',
      badgeClass: 'safe',
      reason: `Station certified. Standard straight-time wage applies (${formatCurrency(shiftPay)}).`,
      canApprove: true,
      shiftPay: shiftPay,
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

    const isCertified = user.certifications && user.certifications.includes(shift.role);
    if (!isCertified) {
      alert(`You do not have the required station certification (${shift.role}) to claim this shift.`);
      return;
    }

    const existingReq = state.approvals.find(a => a.shiftId === shift.id && a.userId === user.id);
    if (existingReq) {
      showToast('You already have a pending claim for this shift awaiting manager review.', 'info');
      return;
    }

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

    state.auditLog.unshift({
      id: 'audit-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      action: 'Shift Put Up for Grabs',
      details: `${user.name} placed ${shift.role} (${shift.scheduleDate}, ${shift.hours.toFixed(1)}h) Up for Grabs.`,
      type: 'coverage',
      status: 'POSTED'
    });

    saveState();
    renderAll();
    showToast(`Your ${shift.role} shift is now offered Up for Grabs for colleagues to claim.`, 'info');
  }

  function handleEmployeeWithdrawCoverage(shiftId) {
    const shift = getShiftById(shiftId);
    const user = getCurrentUser();
    if (!shift || !user || shift.userId !== user.id) return;

    shift.status = 'Covered';
    shift.statusClass = shift.isSwapped ? 'swapped' : 'covered';
    saveState();
    renderAll();
    showToast(`Coverage offer withdrawn. Shift remains scheduled to you.`, 'info');
  }

  // =========================================================================
  // Manager Approval Actions (Real-Time Sync with Schedule & Tip-Pool)
  // =========================================================================

  function authorizeManagerApproval(appId) {
    const app = state.approvals.find(a => a.id === appId);
    if (!app) return;

    const shift = getShiftById(app.shiftId);
    const claimingUser = getUserById(app.userId);

    if (shift && claimingUser) {
      const prevUserId = shift.userId;
      const prevUser = prevUserId ? getUserById(prevUserId) : null;
      const prevName = prevUser ? prevUser.name : 'Unassigned / Open';

      // 1. Update Shift in Unified Schedule (Single Source of Truth)
      shift.userId = claimingUser.id;
      shift.status = 'Covered';
      shift.statusClass = 'swapped';
      shift.isSwapped = true;
      shift.swappedFrom = prevName;
      shift.swapApprovedAt = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // 2. Record Verified Audit Log Entry
      state.auditLog.unshift({
        id: 'audit-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        action: app.actionType === 'Swap' ? 'Shift Swap Authorized' : 'Shift Claim Authorized',
        details: `${claimingUser.name} officially assigned to ${shift.role} (${shift.scheduleDate}, ${shift.hours.toFixed(1)}h). Previously assigned to: ${prevName}.`,
        type: 'coverage',
        status: 'APPROVED'
      });

      // 3. Recalculate Worker Hours across Schedule
      recalculateUserHoursFromSchedule();
    }

    // Remove from approvals queue
    state.approvals = state.approvals.filter(a => a.id !== appId);
    saveState();
    renderAll();

    showToast(`Authorized! ${app.name} is now officially assigned to ${app.shiftRole}. Schedule and Tip Pool updated.`, 'success');
  }

  function dismissManagerApproval(appId) {
    const app = state.approvals.find(a => a.id === appId);
    if (!app) return;

    state.auditLog.unshift({
      id: 'audit-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      action: 'Shift Request Declined',
      details: `Request by ${app.name} for ${app.shiftRole} (${app.shiftName}) was declined by manager.`,
      type: 'coverage',
      status: 'DECLINED'
    });

    state.approvals = state.approvals.filter(a => a.id !== appId);
    saveState();
    renderAll();

    showToast(`Request from ${app.name} dismissed.`, 'info');
  }

  // =========================================================================
  // Viewport-Constrained Modal Helpers & Accessibility
  // =========================================================================

  function openModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.classList.remove('modal-open');
    }
  }

  // =========================================================================
  // Manager Schedule Builder & Generator Engine
  // =========================================================================

  function openScheduleBuilderModal() {
    if (!isManagerUser()) {
      showToast('Manager credentials required to open Schedule Builder.', 'error');
      return;
    }

    const startInput = document.getElementById('builderStartDate');
    if (startInput) {
      startInput.value = state.scheduleSettings?.startDate || '2026-11-20';
    }

    updateBuilderPreviewMetrics();
    openModal('scheduleBuilderModal');
  }

  function closeScheduleBuilderModal() {
    closeModal('scheduleBuilderModal');
  }

  function updateBuilderPreviewMetrics() {
    const periodRadio = document.querySelector('input[name="builderPeriod"]:checked');
    const periodType = periodRadio ? periodRadio.value : 'biweekly';
    const startInput = document.getElementById('builderStartDate');
    const startDateStr = startInput ? startInput.value : '2026-11-20';
    const totalDays = periodType === 'monthly' ? 30 : 14;

    const rangeHelp = document.getElementById('builderPeriodHelp');
    if (rangeHelp) {
      rangeHelp.textContent = `Coverage range: ${formatRangeDisplay(startDateStr, totalDays)} (${totalDays} days)`;
    }

    const previewShifts = document.getElementById('builderPreviewShifts');
    const previewHours = document.getElementById('builderPreviewHours');
    const previewStaff = document.getElementById('builderPreviewStaff');

    const estShifts = periodType === 'monthly' ? 60 : 28;
    const estHours = (estShifts * 6.0).toFixed(1) + 'h';

    if (previewShifts) previewShifts.textContent = estShifts;
    if (previewHours) previewHours.textContent = estHours;
    if (previewStaff) previewStaff.textContent = '8';
  }

  function handlePublishSchedule() {
    if (!isManagerUser()) {
      showToast('Manager credentials required to publish schedule.', 'error');
      return;
    }

    const periodRadio = document.querySelector('input[name="builderPeriod"]:checked');
    const periodType = periodRadio ? periodRadio.value : 'biweekly';
    const startInput = document.getElementById('builderStartDate');
    const startDateStr = startInput ? startInput.value : '2026-11-20';

    const newShifts = generateStarterShifts(periodType, startDateStr);

    state.shifts = newShifts;
    state.scheduleSettings = {
      periodType: periodType,
      startDate: startDateStr,
      isPublished: true,
      publishedAt: new Date().toISOString()
    };
    state.scheduleViewPeriod = periodType;

    const mgr = getCurrentUser();
    const periodName = periodType === 'monthly' ? 'Monthly (30 Days)' : 'Bi-Weekly (14 Days)';

    state.auditLog.unshift({
      id: 'audit-' + Date.now(),
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      action: 'Schedule Published',
      details: `${periodName} master schedule published by ${mgr ? mgr.name : 'Manager'} (${newShifts.length} shifts, ${formatRangeDisplay(startDateStr, periodType === 'monthly' ? 30 : 14)}).`,
      type: 'schedule',
      status: 'PUBLISHED'
    });

    recalculateUserHoursFromSchedule();
    saveState();
    closeScheduleBuilderModal();
    renderAll();

    showToast(`✓ Published ${periodName} schedule with ${newShifts.length} shifts! Unified with swap queue & tip pool.`, 'success');
  }

  // =========================================================================
  // Manager Add / Edit Shift Engine
  // =========================================================================

  function openShiftEditModal(shiftId = null) {
    if (!isManagerUser()) {
      showToast('Manager credentials required to edit shifts.', 'error');
      return;
    }

    const modal = document.getElementById('shiftEditModal');
    const titleEl = document.getElementById('shiftEditModalTitle');
    const idInput = document.getElementById('editShiftId');
    const dateInput = document.getElementById('editShiftDate');
    const serviceInput = document.getElementById('editShiftServiceName');
    const roleSelect = document.getElementById('editShiftRole');
    const hoursInput = document.getElementById('editShiftHours');
    const startInput = document.getElementById('editShiftStartTime');
    const endInput = document.getElementById('editShiftEndTime');
    const assigneeSelect = document.getElementById('editShiftAssignee');
    const notesInput = document.getElementById('editShiftNotes');
    const statusSelect = document.getElementById('editShiftStatus');

    // Populate Assignee Select with all users + Unassigned
    if (assigneeSelect) {
      assigneeSelect.innerHTML = `<option value="">Unassigned / Open Shift</option>`;
      state.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = `${u.name} (${u.role})`;
        assigneeSelect.appendChild(opt);
      });
    }

    if (shiftId) {
      const shift = getShiftById(shiftId);
      if (!shift) return;
      if (titleEl) titleEl.textContent = 'Edit Scheduled Shift';
      if (idInput) idInput.value = shift.id;
      if (dateInput) dateInput.value = shift.dateIso || '2026-11-20';
      if (serviceInput) serviceInput.value = shift.serviceName;
      if (roleSelect) roleSelect.value = shift.role;
      if (hoursInput) hoursInput.value = shift.hours;
      if (startInput) startInput.value = shift.startTime;
      if (endInput) endInput.value = shift.endTime;
      if (assigneeSelect) assigneeSelect.value = shift.userId || '';
      if (notesInput) notesInput.value = shift.notes || '';
      if (statusSelect) statusSelect.value = shift.status || 'Covered';
    } else {
      if (titleEl) titleEl.textContent = 'Add New Shift';
      if (idInput) idInput.value = '';
      if (dateInput) dateInput.value = state.scheduleSettings?.startDate || '2026-11-20';
      if (serviceInput) serviceInput.value = 'Dinner service';
      if (roleSelect) roleSelect.value = 'Server';
      if (hoursInput) hoursInput.value = '6.0';
      if (startInput) startInput.value = '4:00 PM';
      if (endInput) endInput.value = '10:00 PM';
      if (assigneeSelect) assigneeSelect.value = '';
      if (notesInput) notesInput.value = 'Main Dining Room';
      if (statusSelect) statusSelect.value = 'Open';
    }

    openModal('shiftEditModal');
  }

  function closeShiftEditModal() {
    closeModal('shiftEditModal');
  }

  function handleSaveShiftSubmit(e) {
    e.preventDefault();
    if (!isManagerUser()) {
      showToast('Manager credentials required.', 'error');
      return;
    }

    const idInput = document.getElementById('editShiftId');
    const dateInput = document.getElementById('editShiftDate');
    const serviceInput = document.getElementById('editShiftServiceName');
    const roleSelect = document.getElementById('editShiftRole');
    const hoursInput = document.getElementById('editShiftHours');
    const startInput = document.getElementById('editShiftStartTime');
    const endInput = document.getElementById('editShiftEndTime');
    const assigneeSelect = document.getElementById('editShiftAssignee');
    const notesInput = document.getElementById('editShiftNotes');
    const statusSelect = document.getElementById('editShiftStatus');

    const shiftId = idInput?.value;
    const dateIso = dateInput?.value || '2026-11-20';
    const dateObj = new Date(dateIso + 'T00:00:00');
    const dateDisplay = formatDateDisplay(dateObj);

    const shiftData = {
      role: roleSelect.value,
      serviceName: serviceInput.value.trim(),
      scheduleDate: dateDisplay,
      dateIso: dateIso,
      startTime: startInput.value.trim(),
      endTime: endInput.value.trim(),
      hours: parseFloat(hoursInput.value) || 6.0,
      userId: assigneeSelect.value || null,
      notes: notesInput.value.trim(),
      status: statusSelect.value,
      statusClass: statusSelect.value.toLowerCase().replace(/\s+/g, '-')
    };

    if (shiftId) {
      // Update existing
      const existing = getShiftById(shiftId);
      if (existing) {
        Object.assign(existing, shiftData);
        state.auditLog.unshift({
          id: 'audit-' + Date.now(),
          timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          action: 'Shift Modified',
          details: `Manager modified ${existing.role} on ${existing.scheduleDate} (${existing.hours}h). Assigned to: ${existing.userId ? getUserById(existing.userId)?.name : 'Open'}.`,
          type: 'schedule',
          status: 'UPDATED'
        });
        showToast(`Updated shift: ${existing.role} (${existing.scheduleDate}).`, 'success');
      }
    } else {
      // Add new shift
      const newShift = {
        id: 'shift-' + Date.now(),
        ...shiftData,
        isSwapped: false,
        swappedFrom: null,
        swapApprovedAt: null
      };
      state.shifts.push(newShift);
      state.auditLog.unshift({
        id: 'audit-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: 'Shift Created',
        details: `Manager created new ${newShift.role} shift on ${newShift.scheduleDate} (${newShift.hours}h).`,
        type: 'schedule',
        status: 'CREATED'
      });
      showToast(`Added new shift: ${newShift.role} (${newShift.scheduleDate}).`, 'success');
    }

    recalculateUserHoursFromSchedule();
    saveState();
    closeShiftEditModal();
    renderAll();
  }

  function handleDeleteShift(shiftId) {
    if (!isManagerUser()) {
      showToast('Manager credentials required to delete shifts.', 'error');
      return;
    }

    const shift = getShiftById(shiftId);
    if (!shift) return;

    if (confirm(`Delete the ${shift.role} shift on ${shift.scheduleDate} (${shift.serviceName})?`)) {
      state.shifts = state.shifts.filter(s => s.id !== shiftId);
      state.approvals = state.approvals.filter(a => a.shiftId !== shiftId);

      state.auditLog.unshift({
        id: 'audit-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: 'Shift Removed',
        details: `Manager removed ${shift.role} shift on ${shift.scheduleDate}.`,
        type: 'schedule',
        status: 'DELETED'
      });

      recalculateUserHoursFromSchedule();
      saveState();
      renderAll();
      showToast(`Shift removed from schedule.`, 'info');
    }
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

    const heroDescText = document.getElementById('heroDescText');
    const heroActionsContainer = document.getElementById('heroActionsContainer');

    if (isMgr) {
      if (heroDescText) heroDescText.textContent = 'Manage schedules, approve shift coverage changes, and reconcile every cent of the tip pool.';
      if (heroActionsContainer) {
        heroActionsContainer.innerHTML = `
          <button class="btn btn-peach" id="heroReviewCoverageBtn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Master Schedule</span>
          </button>
          <button class="btn btn-hero-outline" id="heroOpenScheduleBuilderBtn">
            <span>📅 Schedule Builder</span>
          </button>
        `;
      }
    } else {
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

    const kpiGridContainer = document.getElementById('kpiGridContainer');
    if (kpiGridContainer) {
      if (isMgr) {
        const coverageNeeded = state.shifts.filter(s => s.status !== 'Covered').length;
        const eligibleStaffCount = calc.crew.filter(c => c.weight > 0).length;
        const periodLabel = state.scheduleSettings?.periodType === 'monthly' ? 'Monthly (30D)' : 'Bi-Weekly (14D)';

        kpiGridContainer.innerHTML = `
          <div class="kpi-card" data-action="go-shifts" role="button" tabindex="0" title="Click to view shift coverage">
            <div class="kpi-card-top"><span class="kpi-label">Coverage needed</span><span class="kpi-icon-wrap icon-peach">📅</span></div>
            <div class="kpi-value">${coverageNeeded}</div>
            <div class="kpi-subtext">Open or up for grabs</div>
          </div>
          <div class="kpi-card" data-action="go-approvals" role="button" tabindex="0" title="Click to view pending approvals">
            <div class="kpi-card-top"><span class="kpi-label">Pending approvals</span><span class="kpi-icon-wrap icon-peach">📋</span></div>
            <div class="kpi-value">${state.approvals.length}</div>
            <div class="kpi-subtext">Awaiting manager review</div>
          </div>
          <div class="kpi-card" data-action="go-tips" role="button" tabindex="0" title="Click to view tip pool breakdown">
            <div class="kpi-card-top"><span class="kpi-label">Tip pool (${periodLabel})</span><span class="kpi-icon-wrap icon-mint">💳</span></div>
            <div class="kpi-value">${formatCurrency(calc.totalTips)}</div>
            <div class="kpi-subtext">${formatRangeDisplay(state.scheduleSettings?.startDate || '2026-11-20', state.scheduleSettings?.periodType === 'monthly' ? 30 : 14)}</div>
          </div>
          <div class="kpi-card" data-action="go-tips" role="button" tabindex="0" title="Click to view eligible staff">
            <div class="kpi-card-top"><span class="kpi-label">Eligible staff</span><span class="kpi-icon-wrap icon-mint">👥</span></div>
            <div class="kpi-value">${eligibleStaffCount}</div>
            <div class="kpi-subtext">With scheduled pool hours</div>
          </div>
        `;
      } else {
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
          <div class="kpi-card" data-action="go-claimable-shifts" role="button" tabindex="0" title="Click to view claimable shifts">
            <div class="kpi-card-top"><span class="kpi-label">Claimable shifts</span><span class="kpi-icon-wrap icon-peach">📅</span></div>
            <div class="kpi-value">${claimableShiftsCount}</div>
            <div class="kpi-subtext">Matches your certifications</div>
          </div>
          <div class="kpi-card" data-action="go-my-shifts" role="button" tabindex="0" title="Click to view your assigned shifts">
            <div class="kpi-card-top"><span class="kpi-label">My assigned shifts</span><span class="kpi-icon-wrap icon-mint">⏱️</span></div>
            <div class="kpi-value">${myAssignedShiftsCount}</div>
            <div class="kpi-subtext">On published schedule</div>
          </div>
          <div class="kpi-card" data-action="go-approvals" role="button" tabindex="0" title="Click to view open requests">
            <div class="kpi-card-top"><span class="kpi-label">My open requests</span><span class="kpi-icon-wrap icon-peach">📋</span></div>
            <div class="kpi-value">${myOpenRequestsCount}</div>
            <div class="kpi-subtext">Awaiting manager review</div>
          </div>
          <div class="kpi-card" data-action="go-tips" role="button" tabindex="0" title="Click to view pooled cash tips">
            <div class="kpi-card-top"><span class="kpi-label">My pooled cash tips</span><span class="kpi-icon-wrap icon-mint">💵</span></div>
            <div class="kpi-value">${formatCurrency(myCashTips)}</div>
            <div class="kpi-subtext">${userPayout ? `${userPayout.hoursWorked.toFixed(1)} scheduled hrs` : '0 logged entries'}</div>
          </div>
        `;
      }
    }

    // Lower Left Shift Board Table
    const shiftBoardBody = document.getElementById('overviewShiftBoardBody');
    if (shiftBoardBody) {
      shiftBoardBody.innerHTML = '';
      state.shifts.slice(0, 5).forEach(shift => {
        const u = getUserById(shift.userId);
        const isMine = u && u.id === user.id;
        const tr = document.createElement('tr');

        let actionBtnHtml = '';
        if (isMgr) {
          actionBtnHtml = `<button class="btn-validate-pill" data-action="validate-shift" data-shift-id="${shift.id}">Validate</button>`;
        } else {
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
            <div class="td-sub-muted">${shift.startTime} &ndash; ${shift.endTime} (${shift.hours.toFixed(1)}h)</div>
          </td>
          <td>
            <span class="status-pill ${shift.statusClass}">${shift.isSwapped ? '🔄 Covered / Swapped' : shift.status}</span>
          </td>
          <td class="action-th">
            ${actionBtnHtml}
          </td>
        `;
        shiftBoardBody.appendChild(tr);
      });
    }

    // Lower Right
    const rightCol = document.getElementById('overviewRightCol');
    if (rightCol) {
      if (isMgr) {
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
                  <span>💵 Cash tips</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  // =========================================================================
  // Master Schedule & Coverage View (Unified for Manager & Employee)
  // =========================================================================

  function renderShiftBoardView() {
    const isMgr = isManagerUser();
    const user = getCurrentUser();
    if (!user) return;

    // 1. Period Toggle Buttons & Range Badge
    const btnBiweekly = document.getElementById('btnToggleBiweekly');
    const btnMonthly = document.getElementById('btnToggleMonthly');
    const rangeBadge = document.getElementById('scheduleRangeBadge');
    const viewPeriod = state.scheduleViewPeriod || 'biweekly';
    const totalDays = viewPeriod === 'monthly' ? 30 : 14;
    const startDateStr = state.scheduleSettings?.startDate || '2026-11-20';

    if (btnBiweekly) btnBiweekly.classList.toggle('active', viewPeriod === 'biweekly');
    if (btnMonthly) btnMonthly.classList.toggle('active', viewPeriod === 'monthly');

    if (rangeBadge) {
      rangeBadge.textContent = `📅 ${formatRangeDisplay(startDateStr, totalDays)} (${totalDays} Days)`;
    }

    // 2. Manager-Only Schedule Builder Actions
    const mgrActions = document.getElementById('managerScheduleActions');
    if (mgrActions) {
      mgrActions.style.display = isMgr ? 'flex' : 'none';
    }

    // 3. Header Subtitle
    const subtitle = document.getElementById('shiftBoardSubtitle');
    if (subtitle) {
      if (isMgr) {
        subtitle.textContent = 'Manage schedules, add shifts, validate coverage replacements, and track published shifts.';
      } else {
        subtitle.textContent = 'View published schedule, claim open shifts, offer your shifts for coverage, or propose a swap.';
      }
    }

    // 4. Header Right Profile Pill
    const headerRight = document.getElementById('shiftBoardHeaderRight');
    if (headerRight) {
      headerRight.innerHTML = `
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">
            ${isMgr ? 'Manager Mode' : 'Team Member Mode'}
          </div>
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-dark);">${user.name}</div>
        </div>
      `;
    }

    // 5. Filter Shifts by View Period Window (Bi-Weekly = 14 days, Monthly = 30 days)
    const startTimestamp = new Date(startDateStr + 'T00:00:00').getTime();
    const endTimestamp = startTimestamp + totalDays * 86400000;

    const periodShifts = state.shifts.filter(s => {
      if (!s.dateIso) return true;
      const shiftTime = new Date(s.dateIso + 'T00:00:00').getTime();
      return shiftTime >= startTimestamp && shiftTime < endTimestamp;
    });

    // Populate Date Filter Dropdown
    const dateSelect = document.getElementById('scheduleDateSelect');
    if (dateSelect) {
      const currentSelected = state.scheduleDateFilter || 'all';
      const uniqueDates = Array.from(new Set(periodShifts.map(s => s.scheduleDate)));

      dateSelect.innerHTML = `<option value="all">All Days in Period (${uniqueDates.length} Days)</option>`;
      uniqueDates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        const count = periodShifts.filter(s => s.scheduleDate === d).length;
        opt.textContent = `${d} (${count} shifts)`;
        if (d === currentSelected) opt.selected = true;
        dateSelect.appendChild(opt);
      });
    }

    // 6. Update Filter Counts
    const countAll = periodShifts.length;
    const countMine = periodShifts.filter(s => s.userId === user.id).length;
    const countGrabs = periodShifts.filter(s => s.status === 'Up for Grabs' || !s.userId).length;
    const countSwapped = periodShifts.filter(s => s.isSwapped || s.statusClass === 'swapped').length;

    const elCountAll = document.getElementById('schedCountAll');
    const elCountMine = document.getElementById('schedCountMine');
    const elCountGrabs = document.getElementById('schedCountGrabs');
    const elCountSwapped = document.getElementById('schedCountSwapped');

    if (elCountAll) elCountAll.textContent = countAll;
    if (elCountMine) elCountMine.textContent = countMine;
    if (elCountGrabs) elCountGrabs.textContent = countGrabs;
    if (elCountSwapped) elCountSwapped.textContent = countSwapped;

    // 7. Apply Filters (Status + Day)
    const activeFilter = state.scheduleFilter || 'all';
    const activeDay = state.scheduleDateFilter || 'all';

    let displayShifts = periodShifts;

    if (activeFilter === 'my-shifts') {
      displayShifts = displayShifts.filter(s => s.userId === user.id);
    } else if (activeFilter === 'grabs') {
      displayShifts = displayShifts.filter(s => s.status === 'Up for Grabs' || !s.userId);
    } else if (activeFilter === 'swapped') {
      displayShifts = displayShifts.filter(s => s.isSwapped || s.statusClass === 'swapped');
    }

    if (activeDay !== 'all') {
      displayShifts = displayShifts.filter(s => s.scheduleDate === activeDay);
    }

    // 8. Render Master Schedule Table Grouped by Date
    const tbody = document.getElementById('masterScheduleBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (displayShifts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            <div style="font-weight: 800; font-size: 1rem; color: var(--text-dark); margin-bottom: 0.25rem;">
              No shifts match this filter.
            </div>
            <div style="font-size: 0.85rem;">
              Try switching between "All Shifts" or resetting the date filter.
            </div>
          </td>
        </tr>
      `;
    } else {
      // Group shifts by scheduleDate
      const grouped = {};
      displayShifts.forEach(s => {
        if (!grouped[s.scheduleDate]) grouped[s.scheduleDate] = [];
        grouped[s.scheduleDate].push(s);
      });

      Object.keys(grouped).forEach(dateKey => {
        const groupShifts = grouped[dateKey];

        // Day Group Header row
        const headerTr = document.createElement('tr');
        headerTr.className = 'day-group-header';
        headerTr.innerHTML = `
          <td colspan="5">
            📅 ${dateKey} &bull; <span style="font-weight:600; color:var(--text-muted); font-size:0.8rem;">${groupShifts.length} Shift${groupShifts.length === 1 ? '' : 's'}</span>
          </td>
        `;
        tbody.appendChild(headerTr);

        groupShifts.forEach(shift => {
          const assignedUser = getUserById(shift.userId);
          const isMine = assignedUser && assignedUser.id === user.id;
          const isCertified = (user.certifications || []).includes(shift.role);
          const isSelected = state.selectedShiftId === shift.id;
          const isPendingMyReview = state.approvals.some(a => a.shiftId === shift.id && a.userId === user.id);

          let statusBadgeHtml = '';
          if (shift.isSwapped) {
            statusBadgeHtml = `
              <span class="status-pill swapped" title="${shift.swappedFrom ? `Covered from ${shift.swappedFrom}` : 'Approved swap'}">
                🔄 Covered / Swapped
              </span>
            `;
          } else if (shift.status === 'Up for Grabs') {
            statusBadgeHtml = `<span class="status-pill up-for-grabs">Up for Grabs</span>`;
          } else if (shift.status === 'Open' || !shift.userId) {
            statusBadgeHtml = `<span class="status-pill open">Open</span>`;
          } else {
            statusBadgeHtml = `<span class="status-pill covered">Covered</span>`;
          }

          let actionButtons = '';

          if (isMgr) {
            // Manager Actions
            actionButtons = `
              <div class="shift-actions-cell">
                <button class="btn-shift-action validate" data-action="validate-shift" data-shift-id="${shift.id}" title="Evaluate replacement coverage for this shift">
                  ${isSelected ? '✓ Validating' : 'Validate'}
                </button>
                <button class="btn-shift-action" data-action="edit-shift" data-shift-id="${shift.id}" title="Edit shift details">
                  ✏️ Edit
                </button>
                <button class="btn-shift-action danger" data-action="delete-shift" data-shift-id="${shift.id}" title="Delete shift from schedule">
                  🗑️
                </button>
              </div>
            `;
          } else {
            // Employee Actions
            if (isPendingMyReview) {
              actionButtons = `<span style="font-size:0.75rem; color:#B45309; font-weight:700;">Claim Pending</span>`;
            } else if (shift.status === 'Open' || shift.status === 'Up for Grabs') {
              if (!isMine) {
                if (isCertified) {
                  actionButtons = `<button class="btn-action-claim" data-action="claim-shift" data-shift-id="${shift.id}">Claim</button>`;
                } else {
                  actionButtons = `<span style="font-size:0.75rem; color:#9CA3AF;">Not Certified</span>`;
                }
              } else {
                actionButtons = `
                  <div class="shift-actions-cell">
                    <button class="btn-action-withdraw" data-action="withdraw-coverage" data-shift-id="${shift.id}">Withdraw</button>
                    <button class="btn-action-swap" data-action="open-propose-swap" data-shift-id="${shift.id}">Propose swap</button>
                  </div>
                `;
              }
            } else if (isMine) {
              actionButtons = `
                <button class="btn-action-swap" data-action="offer-coverage" data-shift-id="${shift.id}">
                  Offer coverage
                </button>
              `;
            } else {
              actionButtons = `<span style="color:#9CA3AF;">&mdash;</span>`;
            }
          }

          const tr = document.createElement('tr');
          if (isSelected) tr.style.background = '#F0FDF4';

          tr.innerHTML = `
            <td>
              <div class="td-main-bold">${shift.role}</div>
              <div class="td-sub-muted">${shift.serviceName} &bull; ${shift.notes || 'Station'}</div>
            </td>
            <td>
              <div class="td-main-bold">${shift.startTime} &ndash; ${shift.endTime}</div>
              <div class="td-sub-muted font-mono">${shift.hours.toFixed(1)} hrs</div>
            </td>
            <td>
              ${assignedUser ? `
                <div style="display:flex; align-items:center; gap:0.5rem;">
                  <span class="user-circle ${(assignedUser.initials || 'mc').toLowerCase()}" style="width:28px;height:28px;font-size:0.7rem;">${assignedUser.initials}</span>
                  <span class="td-main-bold" style="${isMine ? 'color:#059669;' : ''}">
                    ${assignedUser.name}${isMine ? ' (You)' : ''}
                  </span>
                </div>
              ` : '<span style="color:#D97706; font-weight:700;">Open (Unassigned)</span>'}
            </td>
            <td>
              ${statusBadgeHtml}
            </td>
            <td class="action-th">
              ${actionButtons}
            </td>
          `;

          tbody.appendChild(tr);
        });
      });
    }

    // 9. Render Coverage Engine Panel if a shift is selected
    renderSwapEnginePanel();
  }

  // =========================================================================
  // Manager Coverage Validator Panel (Straight-Time Calculations)
  // =========================================================================

  function renderSwapEnginePanel() {
    const panel = document.getElementById('swapEnginePanel');
    const titleEl = document.getElementById('swapTargetTitle');
    const subtitleEl = document.getElementById('swapTargetSubtitle');
    const actionContainer = document.getElementById('swapTargetActionContainer');
    const candidatesGrid = document.getElementById('swapCandidatesGrid');

    if (!panel || !titleEl || !candidatesGrid) return;

    if (!state.selectedShiftId) {
      titleEl.textContent = 'Select any scheduled shift above to evaluate replacement coverage';
      subtitleEl.textContent = 'Comparing all off-duty employees against station certifications and straight-time wage policies.';
      actionContainer.innerHTML = '';
      candidatesGrid.innerHTML = `
        <div class="empty-state">
          <p>Click <strong>"Validate"</strong> on any scheduled employee above to evaluate eligible replacement staff.</p>
        </div>
      `;
      updateCandidateFilterCounts(0, 0, 0);
      return;
    }

    const shift = getShiftById(state.selectedShiftId);
    if (!shift) {
      state.selectedShiftId = null;
      renderSwapEnginePanel();
      return;
    }

    const scheduledUser = getUserById(shift.userId);

    titleEl.innerHTML = `Evaluating Coverage for <span style="color:#113228;">${scheduledUser ? scheduledUser.name : 'Unassigned Shift'}</span> (${shift.role} • ${shift.hours.toFixed(1)}h)`;
    subtitleEl.textContent = `Shift: ${shift.scheduleDate} • ${shift.startTime} – ${shift.endTime} • Station: ${shift.notes || 'General'}`;

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
          <p>No candidates match the filter <strong>"${state.candidateFilter.toUpperCase()}"</strong>.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const c = item.candidate;
      const card = document.createElement('div');
      card.className = `candidate-card status-${item.status}`;

      let metricsHtml = '';
      let buttonHtml = '';

      if (item.status === 'safe') {
        metricsHtml = `
          <div class="metric-row">
            <span>Current Logged Hours:</span>
            <strong>${c.weeklyHours.toFixed(1)} hrs</strong>
          </div>
          <div class="metric-row">
            <span>Projected with Shift:</span>
            <strong style="color:#059669;">${item.projectedHours.toFixed(1)} hrs (Straight-Time)</strong>
          </div>
          <div class="metric-row">
            <span>Compensation Policy:</span>
            <strong style="color:#059669;">Standard Rate (${formatCurrency(c.hourlyRate)}/hr &bull; Shift: ${formatCurrency(item.shiftPay)})</strong>
          </div>
        `;

        buttonHtml = `
          <button class="btn-approve-swap safe" data-action="approve-swap" data-cand-id="${c.id}" data-shift-id="${shift.id}">
            ✓ Assign to Shift
          </button>
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

        <div class="candidate-metrics" style="margin: 0.75rem 0;">
          ${metricsHtml}
        </div>

        <div>
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

  // =========================================================================
  // Approvals View
  // =========================================================================

  function renderApprovalsView() {
    const isMgr = isManagerUser();
    const user = getCurrentUser();
    if (!user) return;

    const headingTitle = document.getElementById('approvalsHeadingTitle');
    const headingSubtitle = document.getElementById('approvalsHeadingSubtitle');
    const cardHeaderTitle = document.getElementById('approvalsCardHeaderTitle');
    const cardHeaderSub = document.getElementById('approvalsCardHeaderSub');
    const list = document.getElementById('approvalsFullList');
    if (!list) return;

    list.innerHTML = '';

    if (isMgr) {
      if (headingTitle) headingTitle.textContent = 'Shift Change Approvals Queue';
      if (headingSubtitle) headingSubtitle.textContent = 'Manager oversight queue for coverage requests, emergency trades, and shift claims.';
      if (cardHeaderTitle) cardHeaderTitle.innerHTML = `Pending Requests (<span id="approvalsHeadingCount">${state.approvals.length}</span>)`;
      if (cardHeaderSub) cardHeaderSub.textContent = 'Awaiting general manager or shift lead authorization';

      if (state.approvals.length === 0) {
        list.innerHTML = `
          <div class="empty-state" style="padding: 2.5rem 1rem;">
            <p><strong>All clear!</strong> No pending shift claims or swap requests in the queue.</p>
          </div>
        `;
        return;
      }

      state.approvals.forEach(app => {
        const shift = getShiftById(app.shiftId);
        const card = document.createElement('div');
        card.className = 'approval-card-item';
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap:1rem;">
            <div class="user-circle ${app.circleClass}">${app.initials}</div>
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--text-dark);">${app.actionType}: ${app.shiftRole} (${app.shiftName})</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">${app.date} &bull; Requested by ${app.name}</div>
              <div style="font-size:0.8rem; color:var(--text-dark); margin-top:0.25rem;"><em>"${app.note}"</em></div>
              ${shift?.isSwapped ? '<span class="status-pill swapped" style="margin-top:0.35rem;">Previously Swapped</span>' : ''}
            </div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-peach" data-action="authorize-approval" data-app-id="${app.id}">
              Authorize
            </button>
            <button class="btn btn-card-outline" data-action="dismiss-approval" data-app-id="${app.id}">
              Dismiss
            </button>
          </div>
        `;
        list.appendChild(card);
      });
    } else {
      const myRequests = state.approvals.filter(a => a.userId === user.id);
      if (headingTitle) headingTitle.textContent = 'My Shift Requests';
      if (headingSubtitle) headingSubtitle.textContent = 'Track your submitted shift claims and swap proposals.';
      if (cardHeaderTitle) cardHeaderTitle.innerHTML = `My Open Requests (${myRequests.length})`;
      if (cardHeaderSub) cardHeaderSub.textContent = 'Submitted for management review';

      if (myRequests.length === 0) {
        list.innerHTML = `
          <div class="empty-state" style="padding: 2.5rem 1rem;">
            <p>You have no pending shift claims or swap proposals right now.</p>
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

    const tipPoolHeading = document.getElementById('tipPoolHeading');
    const tipPoolSubheading = document.getElementById('tipPoolSubheading');

    if (!isMgr) {
      if (tipPoolHeading) tipPoolHeading.textContent = 'My Pooled Cash Tips & Earnings';
      if (tipPoolSubheading) tipPoolSubheading.textContent = 'Transparent breakdown of your weighted tip allocation based on verified hours logged in the active schedule.';
    } else {
      if (tipPoolHeading) tipPoolHeading.textContent = 'Bi-Weekly Tip-Pool Allocation Engine';
      if (tipPoolSubheading) tipPoolSubheading.textContent = 'Synchronized live with the master schedule and approved shift coverage. Enter tips and verify role multipliers for deterministic, penny-reconciled payouts.';
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
          <strong>${item.hoursWorked.toFixed(1)} hrs</strong>
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
        <td colspan="2"><strong>TOTAL SCHEDULED POOL</strong></td>
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
      const userShifts = state.shifts.filter(s => s.userId === u.id);
      const isWorking = userShifts.length > 0;
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
        <td class="num-col font-mono" style="font-weight:700;">
          ${u.weeklyHours.toFixed(1)} hrs
        </td>
        <td>
          ${isWorking 
            ? `<span class="status-pill safe">${userShifts.length} Shift${userShifts.length === 1 ? '' : 's'} (${u.weeklyHours}h)</span>` 
            : `<span class="status-pill up-for-grabs">Unscheduled</span>`}
        </td>
        <td class="action-th">
          <button class="btn-card-outline" style="padding:0.25rem 0.55rem;font-size:0.75rem;" data-action="filter-user-shifts" data-user-id="${u.id}">
            View Shifts
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function renderAuditView() {
    const tbody = document.getElementById('auditTrailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!state.auditLog || state.auditLog.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No audit log entries recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    state.auditLog.forEach(log => {
      const tr = document.createElement('tr');
      let statusPillClass = 'covered';
      if (log.status === 'PUBLISHED') statusPillClass = 'safe';
      if (log.status === 'APPROVED') statusPillClass = 'swapped';
      if (log.status === 'DECLINED') statusPillClass = 'pending';
      if (log.status === 'POSTED') statusPillClass = 'up-for-grabs';

      tr.innerHTML = `
        <td class="font-mono" style="font-size:0.8rem; color:var(--text-muted);">${log.timestamp}</td>
        <td><strong>${log.action}</strong></td>
        <td style="font-size:0.85rem;">${log.details}</td>
        <td><span class="status-pill ${statusPillClass}">${log.status || 'LOGGED'}</span></td>
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
    renderAuditView();
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
    'view-shifts': 'Master schedule',
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
    } else if (viewId === 'view-audit') {
      renderAuditView();
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

    openModal('proposeSwapModal');
  }

  function closeProposeModal() {
    closeModal('proposeSwapModal');
  }

  function openAddMemberModal(defaultRole = 'Employee') {
    if (!isManagerUser()) {
      showToast('Manager credentials required to add staff.', 'error');
      return;
    }
    const roleSelect = document.getElementById('newMemberRole');
    const nameInput = document.getElementById('newMemberName');
    const pinInput = document.getElementById('newMemberPin');
    const title = document.getElementById('addMemberModalTitle');
    if (roleSelect) roleSelect.value = defaultRole;
    if (nameInput) nameInput.value = '';
    if (pinInput) pinInput.value = '';
    if (title) title.textContent = defaultRole === 'Manager' ? 'Add Manager' : 'Add Team Member';
    openModal('addMemberModal');
  }

  function closeAddMemberModal() {
    closeModal('addMemberModal');
  }

  function handleAddMemberSubmit(e) {
    e.preventDefault();
    if (!isManagerUser()) {
      showToast('Manager credentials required.', 'error');
      return;
    }
    const nameInput = document.getElementById('newMemberName');
    const roleSelect = document.getElementById('newMemberRole');
    const pinInput = document.getElementById('newMemberPin');

    const name = nameInput ? nameInput.value.trim() : '';
    const role = roleSelect ? roleSelect.value : 'Employee';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!name || pin.length !== 4) {
      showToast('Please enter a valid full name and 4-digit PIN.', 'error');
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'TM';
    const newId = 'usr-' + (state.users.length + 1);

    const newUser = {
      id: newId,
      name,
      role: role === 'Admin' ? 'Admin' : (role === 'Manager' ? 'Manager' : 'Employee'),
      pin,
      initials,
      certifications: role === 'Manager' ? ['Shift Lead', 'Server', 'Bartender'] : ['Server'],
      hourlyRate: role === 'Manager' ? 24.00 : 14.00,
      weeklyHours: 0
    };

    state.users.push(newUser);
    saveState();
    closeAddMemberModal();
    renderAll();
    showToast(`Added ${name} (${newUser.role}) successfully!`, 'success');
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

    // Schedule Period Toggle: Bi-Weekly vs Monthly
    document.getElementById('btnToggleBiweekly')?.addEventListener('click', () => {
      state.scheduleViewPeriod = 'biweekly';
      renderShiftBoardView();
    });

    document.getElementById('btnToggleMonthly')?.addEventListener('click', () => {
      state.scheduleViewPeriod = 'monthly';
      renderShiftBoardView();
    });

    // Schedule Status Filter Chips (All, My Shifts, Up for Grabs, Swapped)
    document.querySelector('.filter-chips-group')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.sched-filter-chip');
      if (!chip) return;
      document.querySelectorAll('.sched-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.scheduleFilter = chip.getAttribute('data-sched-filter') || 'all';
      renderShiftBoardView();
    });

    // Schedule Day Filter Dropdown
    document.getElementById('scheduleDateSelect')?.addEventListener('change', (e) => {
      state.scheduleDateFilter = e.target.value;
      renderShiftBoardView();
    });

    // Schedule Builder Modal Controls
    document.getElementById('btnOpenScheduleBuilder')?.addEventListener('click', openScheduleBuilderModal);
    document.getElementById('heroOpenScheduleBuilderBtn')?.addEventListener('click', openScheduleBuilderModal);
    document.getElementById('btnCloseBuilderModal')?.addEventListener('click', closeScheduleBuilderModal);
    document.getElementById('btnCancelBuilderModal')?.addEventListener('click', closeScheduleBuilderModal);

    document.querySelectorAll('input[name="builderPeriod"]').forEach(radio => {
      radio.addEventListener('change', updateBuilderPreviewMetrics);
    });
    document.getElementById('builderStartDate')?.addEventListener('input', updateBuilderPreviewMetrics);

    document.getElementById('scheduleBuilderForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handlePublishSchedule();
    });

    // Add / Edit Shift Modal Controls
    document.getElementById('btnOpenAddShiftModal')?.addEventListener('click', () => openShiftEditModal(null));
    document.getElementById('btnCloseShiftEditModal')?.addEventListener('click', closeShiftEditModal);
    document.getElementById('btnCancelShiftEdit')?.addEventListener('click', closeShiftEditModal);
    document.getElementById('shiftEditForm')?.addEventListener('submit', handleSaveShiftSubmit);

    // Hero buttons & Quick actions
    document.addEventListener('click', (e) => {
      if (e.target.closest('#heroOpenScheduleBuilderBtn')) {
        openScheduleBuilderModal();
        return;
      }

      if (e.target.closest('#heroReviewCoverageBtn') || e.target.closest('#btnViewSchedule')) {
        state.scheduleFilter = 'all';
        switchView('view-shifts');
        return;
      }

      if (e.target.closest('#heroBrowseOpenShiftsBtn')) {
        state.scheduleFilter = 'grabs';
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
          state.selectedShiftId = state.shifts[0]?.id || null;
          saveState();
          renderAll();
          switchView('view-shifts');
          showToast('⚡ Shift coverage checker active on Master Schedule.', 'info');
        } else {
          state.scheduleFilter = 'grabs';
          switchView('view-shifts');
          showToast('⚡ Open & Up-for-Grabs shifts displayed. Click "Claim" to test.', 'info');
        }
        return;
      }
    });

    document.getElementById('btnResetData')?.addEventListener('click', () => {
      if (confirm('Reset all changes back to initial Juniper Kitchen restaurant data?')) {
        resetState();
      }
    });

    document.querySelector('.crumb-parent')?.addEventListener('click', () => {
      switchView('view-overview');
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

      state.auditLog.unshift({
        id: 'audit-' + Date.now(),
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        action: 'Shift Swap Proposed',
        details: `${user.name} proposed trade with ${targetUser.name} on ${shift.scheduleDate} (${shift.role}).`,
        type: 'coverage',
        status: 'PROPOSED'
      });

      saveState();
      renderAll();
      closeProposeModal();

      showToast(`Swap proposal sent to ${targetUser.name}! Submitted for manager review.`, 'success');
    });

    // Global Click Delegation
    document.addEventListener('click', (e) => {
      // KPI Card Navigation
      const kpiCard = e.target.closest('.kpi-card');
      if (kpiCard) {
        const action = kpiCard.getAttribute('data-action');
        if (action === 'go-my-shifts') {
          state.scheduleFilter = 'my-shifts';
          switchView('view-shifts');
          return;
        }
        if (action === 'go-claimable-shifts') {
          state.scheduleFilter = 'grabs';
          switchView('view-shifts');
          return;
        }
        if (action === 'go-shifts') {
          state.scheduleFilter = 'all';
          switchView('view-shifts');
          return;
        }
        if (action === 'go-approvals') {
          switchView('view-approvals');
          return;
        }
        if (action === 'go-tips') {
          switchView('view-tips');
          return;
        }
      }

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
        state.selectedShiftId = state.selectedShiftId === shiftId ? null : shiftId;
        renderShiftBoardView();
        return;
      }

      // Manager Edit shift
      const editShiftBtn = e.target.closest('[data-action="edit-shift"]');
      if (editShiftBtn) {
        const shiftId = editShiftBtn.getAttribute('data-shift-id');
        openShiftEditModal(shiftId);
        return;
      }

      // Manager Delete shift
      const delShiftBtn = e.target.closest('[data-action="delete-shift"]');
      if (delShiftBtn) {
        const shiftId = delShiftBtn.getAttribute('data-shift-id');
        handleDeleteShift(shiftId);
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
          const prevName = shift.userId ? getUserById(shift.userId)?.name : 'Open';
          shift.userId = candidate.id;
          shift.status = 'Covered';
          shift.statusClass = 'swapped';
          shift.isSwapped = true;
          shift.swappedFrom = prevName;
          shift.swapApprovedAt = new Date().toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
          });

          state.auditLog.unshift({
            id: 'audit-' + Date.now(),
            timestamp: new Date().toLocaleString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }),
            action: 'Shift Reassigned',
            details: `Manager reassigned ${shift.role} on ${shift.scheduleDate} to ${candidate.name}. Previous: ${prevName}.`,
            type: 'coverage',
            status: 'APPROVED'
          });

          recalculateUserHoursFromSchedule();
          saveState();
          renderAll();
          showToast(`Swap Approved: ${candidate.name} is now covering ${shift.role}. Schedule and Tip Pool updated.`, 'success');
        }
        return;
      }

      // Roster: filter user shifts
      const filterUserShiftsBtn = e.target.closest('[data-action="filter-user-shifts"]');
      if (filterUserShiftsBtn) {
        const userId = filterUserShiftsBtn.getAttribute('data-user-id');
        state.currentUserId = userId;
        state.scheduleFilter = 'my-shifts';
        switchView('view-shifts');
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

    // Add Member Modal Controls
    document.getElementById('btnAddManagerBtn')?.addEventListener('click', () => openAddMemberModal('Manager'));
    document.getElementById('btnAddTeamMemberBtn')?.addEventListener('click', () => openAddMemberModal('Employee'));
    document.getElementById('btnCloseAddMemberModal')?.addEventListener('click', closeAddMemberModal);
    document.getElementById('btnCancelAddMember')?.addEventListener('click', closeAddMemberModal);
    document.getElementById('addMemberForm')?.addEventListener('submit', handleAddMemberSubmit);

    // Receipt Modal
    document.getElementById('btnPrintReceiptBtn')?.addEventListener('click', () => {
      renderReceiptModal();
      openModal('receiptModal');
    });
    document.getElementById('btnCloseModal')?.addEventListener('click', () => closeModal('receiptModal'));
    document.getElementById('btnModalCloseSecondary')?.addEventListener('click', () => closeModal('receiptModal'));
    document.getElementById('btnModalPrint')?.addEventListener('click', () => window.print());

    // Backdrop click dismiss for all modals
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop);
        }
      });
    });

    // Escape key dismiss for open modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openBackdrops = document.querySelectorAll('.modal-backdrop.open');
        openBackdrops.forEach(b => closeModal(b));
      }
    });

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
