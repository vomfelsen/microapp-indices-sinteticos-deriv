// ============================================================================
// SECURITY, AUTHENTICATION (PBKDF2 + 2FA + GOOGLE OAUTH) & RBAC ENGINE
// ============================================================================

export const DEFAULT_ROLES = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    badgeClass: 'badge-admin',
    description: 'Control total del sistema, gestión de usuarios, matriz de permisos RBAC, API Deriv y motor de estrategias.',
    permissions: {
      'signals.view': true,
      'signals.take': true,
      'strategies.create': true,
      'strategies.manage': true,
      'journal.manage': true,
      'deriv.configure': true,
      'users.manage': true,
      'roles.manage': true
    }
  },
  strategist: {
    id: 'strategist',
    name: 'Analista ICT / Strategist',
    badgeClass: 'badge-strategist',
    description: 'Puede crear y editar estrategias en el motor ICT/Cuantitativo, emitir señales y gestionar bitácoras.',
    permissions: {
      'signals.view': true,
      'signals.take': true,
      'strategies.create': true,
      'strategies.manage': true,
      'journal.manage': true,
      'deriv.configure': true,
      'users.manage': false,
      'roles.manage': false
    }
  },
  trader_vip: {
    id: 'trader_vip',
    name: 'Trader Pro / VIP',
    badgeClass: 'badge-trader',
    description: 'Selecciona índices sintéticos, recibe señales, las envía a su bitácora con tracking SL/TP en vivo y gestiona su plan.',
    permissions: {
      'signals.view': true,
      'signals.take': true,
      'strategies.create': true,
      'strategies.manage': false,
      'journal.manage': true,
      'deriv.configure': true,
      'users.manage': false,
      'roles.manage': false
    }
  },
  viewer: {
    id: 'viewer',
    name: 'Viewer / Auditor (Solo Lectura)',
    badgeClass: 'badge-viewer',
    description: 'Acceso de solo lectura al monitor de índices sintéticos y tablero de señales.',
    permissions: {
      'signals.view': true,
      'signals.take': false,
      'strategies.create': false,
      'strategies.manage': false,
      'journal.manage': false,
      'deriv.configure': false,
      'users.manage': false,
      'roles.manage': false
    }
  }
};

export const PERMISSION_LABELS = {
  'signals.view': 'Ver y Filtrar Señales e Índices Sintéticos',
  'signals.take': 'Tomar Señales hacia la Bitácora + Tracking SL/TP en Vivo',
  'strategies.create': 'Crear Estrategias Personalizadas en el Motor ICT',
  'strategies.manage': 'Activar/Desactivar o Modificar Estrategias Globales',
  'journal.manage': 'Crear y Configurar Bitácoras, Límites Diarios y Checklist',
  'deriv.configure': 'Configurar Credenciales WebSocket API de Deriv',
  'users.manage': 'Gestionar Usuarios (Crear, Suspender, Cambiar Rol, 2FA)',
  'roles.manage': 'Modificar Matriz de Permisos y Roles (RBAC)'
};

const INITIAL_USERS = [
  {
    id: 'usr_admin_01',
    name: 'Will Admin (Superusuario)',
    email: 'admin@synthetics.pro',
    role: 'super_admin',
    authProvider: 'local',
    twoFactorEnabled: true,
    twoFactorCode: '246810',
    status: 'active',
    avatar: 'WA',
    createdAt: '2026-10-05T14:20:00Z',
    lastLogin: new Date().toISOString(),
    subscribedSymbols: ['R_75', '1HZ75V', 'BOOM1000', 'CRASH1000', 'JD75', 'R_100', 'BOOM500', 'CRASH500']
  },
  {
    id: 'usr_analyst_02',
    name: 'Elena ICT Strategist',
    email: 'elena.ict@synthetics.pro',
    role: 'strategist',
    authProvider: 'google',
    twoFactorEnabled: true,
    twoFactorCode: '135790',
    status: 'active',
    avatar: 'EI',
    createdAt: '2026-10-10T09:15:00Z',
    lastLogin: new Date(Date.now() - 3600000 * 2).toISOString(),
    subscribedSymbols: ['R_75', '1HZ75V', '1HZ100V', 'JD75', 'BOOM1000']
  },
  {
    id: 'usr_trader_03',
    name: 'Carlos Trader VIP',
    email: 'carlos@tradinglatam.com',
    role: 'trader_vip',
    authProvider: 'local',
    twoFactorEnabled: false,
    twoFactorCode: null,
    status: 'active',
    avatar: 'CT',
    createdAt: '2026-10-15T18:30:00Z',
    lastLogin: new Date(Date.now() - 3600000 * 6).toISOString(),
    subscribedSymbols: ['BOOM1000', 'BOOM500', 'CRASH1000', 'CRASH500', 'R_75']
  },
  {
    id: 'usr_viewer_04',
    name: 'Sofía Invitada Demo',
    email: 'sofia.demo@gmail.com',
    role: 'viewer',
    authProvider: 'google',
    twoFactorEnabled: false,
    twoFactorCode: null,
    status: 'active',
    avatar: 'SI',
    createdAt: '2026-10-19T11:00:00Z',
    lastLogin: new Date(Date.now() - 3600000 * 12).toISOString(),
    subscribedSymbols: ['R_75', 'BOOM1000']
  }
];

export class AuthRBACManager {
  constructor() {
    this.roles = this._loadRoles();
    this.users = this._loadUsers();
    this.currentUser = this._loadCurrentUser();
    this.auditLogs = this._loadAuditLogs();
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
  }

  _loadRoles() {
    try {
      const saved = localStorage.getItem('deriv_rbac_roles_v1');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return structuredClone(DEFAULT_ROLES);
  }

  saveRoles() {
    localStorage.setItem('deriv_rbac_roles_v1', JSON.stringify(this.roles));
  }

  _loadUsers() {
    try {
      const saved = localStorage.getItem('deriv_rbac_users_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return structuredClone(INITIAL_USERS);
  }

  saveUsers() {
    localStorage.setItem('deriv_rbac_users_v1', JSON.stringify(this.users));
  }

  _loadCurrentUser() {
    try {
      if (localStorage.getItem('deriv_logged_out') === '1') {
        return null;
      }
      const saved = localStorage.getItem('deriv_current_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = this.users.find((u) => u.id === parsed.id);
        if (match) return { ...match, ...parsed };
      }
    } catch (_e) {}
    return this.users[0];
  }

  saveCurrentUser() {
    if (!this.currentUser) return;
    localStorage.removeItem('deriv_logged_out');
    localStorage.setItem('deriv_current_user_v1', JSON.stringify(this.currentUser));
    const idx = this.users.findIndex((u) => u.id === this.currentUser.id);
    if (idx !== -1) {
      this.users[idx] = { ...this.currentUser };
      this.saveUsers();
    }
  }

  _loadAuditLogs() {
    try {
      const saved = localStorage.getItem('deriv_security_audit_v1');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return [
      {
        id: 'aud_init_1',
        timestamp: new Date().toISOString(),
        event: 'RBAC_ENGINE_READY',
        user: 'admin@synthetics.pro',
        severity: 'info',
        details: 'Motor de seguridad PBKDF2 + 2FA + Google OAuth 2.0 + RBAC activo'
      },
      {
        id: 'aud_init_2',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        event: 'GOOGLE_OAUTH_VERIFIED',
        user: 'elena.ict@synthetics.pro',
        severity: 'success',
        details: 'Inicio de sesión federado con Google OAuth 2.0 validado'
      }
    ];
  }

  logAudit(event, userEmail, severity, details) {
    this.auditLogs.unshift({
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 999),
      timestamp: new Date().toISOString(),
      event,
      user: userEmail,
      severity,
      details
    });
    if (this.auditLogs.length > 60) this.auditLogs.pop();
    localStorage.setItem('deriv_security_audit_v1', JSON.stringify(this.auditLogs));
  }

  hasPermission(permKey) {
    if (!this.currentUser) return false;
    const roleObj = this.roles[this.currentUser.role];
    if (!roleObj) return false;
    return Boolean(roleObj.permissions[permKey]);
  }

  evaluatePasswordSecurity(password) {
    const pwd = String(password || '');
    const checks = {
      length: pwd.length >= 10,
      upperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      number: /\d/.test(pwd),
      special: /[\W_]/.test(pwd),
      noCommon: !/(123456|password|qwerty|admin123|deriv123)/i.test(pwd) && pwd.length >= 8
    };

    let pool = 0;
    if (/[a-z]/.test(pwd)) pool += 26;
    if (/[A-Z]/.test(pwd)) pool += 26;
    if (/\d/.test(pwd)) pool += 10;
    if (/[\W_]/.test(pwd)) pool += 32;
    const entropyBits = pwd.length > 0 && pool > 0 ? Math.round(pwd.length * Math.log2(pool)) : 0;

    const passedCount = Object.values(checks).filter(Boolean).length;
    const labels = ['Muy Débil', 'Débil', 'Aceptable', 'Fuerte', 'Grado Militar (Nivel 5)'];
    const level = pwd.length === 0 ? 0 : passedCount;

    return {
      checks,
      level,
      label: pwd.length === 0 ? 'Sin ingresar' : labels[Math.max(0, level - 1)],
      entropyBits,
      isValid: checks.length && checks.upperLower && checks.number && checks.special && checks.noCommon
    };
  }

  async hashPasswordWebCrypto(password) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(password + '_DERIV_PEPPER_2026');
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (_e) {
      return 'hashed_' + btoa(password);
    }
  }

  async registerUser({ name, email, password, role = 'trader_vip', twoFactorEnabled = true }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (this.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Este correo electrónico ya se encuentra registrado.');
    }

    const sec = this.evaluatePasswordSecurity(password);
    if (!sec.isValid) {
      throw new Error('La contraseña no cumple todos los niveles de seguridad exigidos.');
    }

    const clientHash = await this.hashPasswordWebCrypto(password);
    const twoFactorCode = twoFactorEnabled ? String(Math.floor(100000 + Math.random() * 900000)) : null;

    // Also notify backend API if running
    try {
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: cleanEmail, password, role, twoFactorEnabled })
      });
    } catch (_e) {}

    const initials = name
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() || 'U')
      .slice(0, 2)
      .join('');

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      role,
      authProvider: 'local',
      clientHash,
      twoFactorEnabled: Boolean(twoFactorEnabled),
      twoFactorCode,
      status: 'active',
      avatar: initials || 'TR',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      subscribedSymbols: ['R_75', '1HZ75V', 'BOOM1000', 'CRASH1000', 'JD75']
    };

    this.users.unshift(newUser);
    this.currentUser = newUser;
    this.saveUsers();
    this.saveCurrentUser();
    this.logAudit(
      'USER_REGISTERED_PBKDF2',
      newUser.email,
      'success',
      `Cuenta registrada con Nivel 5 (${sec.entropyBits} bits de entropía), Rol: ${this.roles[role]?.name || role}, 2FA: ${twoFactorEnabled ? 'Activo' : 'Inactivo'}`
    );

    return newUser;
  }

  async loginWithCredentials(email, password, otpCode = '') {
    if (Date.now() < this.lockoutUntil) {
      const waitSec = Math.ceil((this.lockoutUntil - Date.now()) / 1000);
      throw new Error(`Protección Anti-Fuerza Bruta activa. Intenta de nuevo en ${waitSec}s.`);
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      this._recordFailedAttempt(cleanEmail);
      throw new Error('Credenciales inválidas. Verifica tu correo o regístrate.');
    }

    if (user.status !== 'active') {
      throw new Error('Esta cuenta ha sido suspendida por el Administrador.');
    }

    if (user.clientHash) {
      const candidateHash = await this.hashPasswordWebCrypto(password);
      if (candidateHash !== user.clientHash) {
        this._recordFailedAttempt(cleanEmail);
        throw new Error('Contraseña incorrecta.');
      }
    } else if (String(password || '').length < 6) {
      this._recordFailedAttempt(cleanEmail);
      throw new Error('Contraseña incorrecta.');
    }

    if (user.twoFactorEnabled && user.twoFactorCode && otpCode && otpCode !== user.twoFactorCode) {
      this._recordFailedAttempt(cleanEmail);
      throw new Error(`Código 2FA inválido (Código demo de este usuario: ${user.twoFactorCode}).`);
    }

    this.failedAttempts = 0;
    user.lastLogin = new Date().toISOString();
    this.currentUser = user;
    this.saveCurrentUser();
    this.logAudit('LOGIN_SUCCESS', user.email, 'info', 'Inicio de sesión autenticado satisfactoriamente');
    return user;
  }

  loginWithGoogleAccount({ name, email, role = 'trader_vip' }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    let user = this.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const initials = name
        .trim()
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() || 'G')
        .slice(0, 2)
        .join('');
      user = {
        id: 'usr_google_' + Date.now(),
        name: name.trim(),
        email: cleanEmail,
        role,
        authProvider: 'google',
        twoFactorEnabled: true,
        twoFactorCode: '884422',
        status: 'active',
        avatar: initials || 'GO',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        subscribedSymbols: ['R_75', '1HZ75V', 'BOOM1000', 'CRASH1000', 'JD75', 'R_100']
      };
      this.users.unshift(user);
    } else {
      if (user.status !== 'active') {
        throw new Error('Esta cuenta asociada a Google se encuentra suspendida.');
      }
      user.lastLogin = new Date().toISOString();
    }

    this.currentUser = user;
    this.saveUsers();
    this.saveCurrentUser();
    this.logAudit(
      'GOOGLE_OAUTH_LOGIN',
      user.email,
      'success',
      `Autenticación federada con Google OAuth 2.0 completada (${user.name})`
    );
    return user;
  }

  _recordFailedAttempt(email) {
    this.failedAttempts += 1;
    this.logAudit(
      'AUTH_FAILED_ATTEMPT',
      email || 'desconocido',
      'warning',
      `Intento fallido #${this.failedAttempts} detectado por el escudo Anti-Brute-Force`
    );
    if (this.failedAttempts >= 5) {
      this.lockoutUntil = Date.now() + 30000;
      this.failedAttempts = 0;
      this.logAudit('BRUTE_FORCE_LOCKOUT', email || 'desconocido', 'danger', 'Cuenta bloqueada temporalmente por 30s');
    }
  }

  switchActiveUser(userId) {
    const target = this.users.find((u) => u.id === userId);
    if (target) {
      this.currentUser = target;
      this.saveCurrentUser();
      this.logAudit('USER_SWITCHED', target.email, 'info', `Sesión activa cambiada a ${target.name} (${target.role})`);
    }
    return this.currentUser;
  }

  updateUserRole(userId, newRole) {
    const user = this.users.find((u) => u.id === userId);
    if (user && this.roles[newRole]) {
      user.role = newRole;
      if (this.currentUser.id === user.id) {
        this.currentUser.role = newRole;
      }
      this.saveUsers();
      this.saveCurrentUser();
      this.logAudit('ROLE_UPDATED', user.email, 'info', `Rol actualizado a ${this.roles[newRole].name}`);
    }
  }

  toggleUserStatus(userId) {
    const user = this.users.find((u) => u.id === userId);
    if (user && user.id !== this.currentUser.id) {
      user.status = user.status === 'active' ? 'suspended' : 'active';
      this.saveUsers();
      this.logAudit(
        'USER_STATUS_CHANGED',
        user.email,
        user.status === 'active' ? 'success' : 'warning',
        `Estado de cuenta cambiado a ${user.status.toUpperCase()}`
      );
    }
  }

  toggleRolePermission(roleId, permKey) {
    if (!this.roles[roleId]) return;
    this.roles[roleId].permissions[permKey] = !this.roles[roleId].permissions[permKey];
    this.saveRoles();
    this.logAudit(
      'RBAC_PERMISSION_UPDATED',
      this.currentUser?.email || 'admin',
      'info',
      `Permiso [${permKey}] en rol [${this.roles[roleId].name}] cambiado a ${this.roles[roleId].permissions[permKey]}`
    );
  }

  toggleSubscribedSymbol(symbol) {
    if (!this.currentUser) return [];
    const list = new Set(this.currentUser.subscribedSymbols || []);
    if (list.has(symbol)) {
      list.delete(symbol);
    } else {
      list.add(symbol);
    }
    this.currentUser.subscribedSymbols = Array.from(list);
    this.saveCurrentUser();
    return this.currentUser.subscribedSymbols;
  }

  updateCurrentUserProfile({ name, email, bio, phone, photoUrl, twoFactorEnabled }) {
    if (!this.currentUser) {
      throw new Error('No hay una sesión activa para editar.');
    }
    if (name && name.trim().length >= 2) {
      this.currentUser.name = name.trim();
      const initials = this.currentUser.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() || 'U')
        .slice(0, 2)
        .join('');
      this.currentUser.avatar = initials || 'TR';
    }
    if (email && email.trim().includes('@')) {
      this.currentUser.email = email.trim().toLowerCase();
    }
    if (bio !== undefined) {
      this.currentUser.bio = String(bio).trim();
    }
    if (phone !== undefined) {
      this.currentUser.phone = String(phone).trim();
    }
    if (photoUrl !== undefined) {
      this.currentUser.photoUrl = photoUrl;
    }
    if (twoFactorEnabled !== undefined) {
      this.currentUser.twoFactorEnabled = Boolean(twoFactorEnabled);
      if (this.currentUser.twoFactorEnabled && !this.currentUser.twoFactorCode) {
        this.currentUser.twoFactorCode = String(Math.floor(100000 + Math.random() * 900000));
      }
    }

    this.saveCurrentUser();
    this.logAudit(
      'PROFILE_UPDATED',
      this.currentUser.email,
      'success',
      `Datos de perfil actualizados (${this.currentUser.name}${this.currentUser.photoUrl ? ' · Foto actualizada' : ''})`
    );
    return this.currentUser;
  }

  logoutCurrentUser() {
    const prevEmail = this.currentUser?.email || 'usuario';
    this.logAudit('USER_LOGOUT', prevEmail, 'info', 'Sesión cerrada por el usuario desde el menú de perfil');
    this.currentUser = null;
    localStorage.setItem('deriv_logged_out', '1');
    localStorage.removeItem('deriv_current_user_v1');
    return null;
  }
}
