/**
 * @file src/services/dataService.ts
 * @description Centralized data access layer and local persistence service for FinFlex.
 * Encapsulates localStorage-backed repositories for Users, Providers, Service History,
 * Chat Messages, Audit Logs, and User Sessions.
 * 
 * Target Roles: Shared across Customer, Provider, and Admin.
 * Closely depended on by: App.tsx, AuthScreen.tsx, ProviderDashboard.tsx, AdminDashboard.tsx,
 * HistoryTab.tsx, and MessagingTab.tsx.
 */

import { 
  UserAccount, 
  ProviderProfile, 
  ServiceHistoryItem, 
  ChatThread, 
  ChatMessage, 
  SystemStats,
  AuditLogEntry,
  VerificationDocument,
  BusinessDetails
} from '../types';
import { FREELANCERS } from '../data';
import { generateAutoReply } from './autoReplyEngine';

/**
 * LocalStorage partition keys for offline persistence and session survival.
 */
const STORAGE_KEYS = {
  USERS: 'finflex_db_users',
  PROVIDERS: 'finflex_db_providers',
  HISTORY: 'finflex_db_history',
  THREADS: 'finflex_db_threads',
  MESSAGES: 'finflex_db_messages',
  SESSION: 'finflex_db_session',
  AUDIT_LOGS: 'finflex_db_audit_logs'
};

/**
 * Initial seed user accounts spanning Customer, Admin, and Provider roles.
 * Seeds Ariba Khan (Customer with active B2B Enterprise profile),
 * FinFlex Administrator (Superadmin), and individual Chartered Accountants.
 */
const DEFAULT_USERS: UserAccount[] = [

  {
    userId: 'usr_1',
    name: 'Ariba Khan',
    email: 'ariba@gmail.com',
    password: 'user123',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-15',
    avatar: 'https://picsum.photos/seed/user/200/200',
    phone: '+91 98765 43210',
    city: 'Mumbai, MH',
    isBusinessAccount: true,
    businessDetails: {
      businessName: 'Khan Enterprises & Tech Solutions',
      gstin: '27AABCK1234F1Z5',
      businessEmail: 'ariba.corp@khanenterprises.in',
      businessPhone: '+91 98765 43210',
      entityType: 'Private Limited',
      activatedAt: '2026-02-10'
    }
  },
  {
    userId: 'usr_2',
    name: 'Karan Mehta',
    email: 'karan@gmail.com',
    password: 'user123',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-01',
    avatar: 'https://picsum.photos/seed/karan/200/200',
    phone: '+91 98111 22334',
    city: 'Mumbai, MH'
  },
  {
    userId: 'admin_1',
    name: 'FinFlex Administrator',
    email: 'admin@finflex.com',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    createdAt: '2025-12-01',
    avatar: 'https://picsum.photos/seed/admin/200/200',
    phone: '+91 80000 99999',
    city: 'Mumbai Head Office'
  },
  // Seed provider user accounts matching FREELANCERS
  ...FREELANCERS.map((f) => ({
    userId: `prov_${f.id}`,
    name: f.name,
    email: `${f.name.toLowerCase().replace(/\s+/g, '.')}@finflex.com`,
    password: 'provider123',
    role: 'provider' as const,
    status: 'active' as const,
    createdAt: '2026-01-01',
    avatar: f.image,
    phone: '+91 98200 12345',
    city: 'Mumbai, MH'
  }))
];

/**
 * Seed Provider Profiles derived from master catalog.
 * Sneha Kulkarni (id: '4') is purposely initialized with verificationStatus='pending'
 * to enable immediate testing of the Admin eKYC document review & approval workflow.
 */
const DEFAULT_PROVIDERS: ProviderProfile[] = FREELANCERS.map(f => {

  const isPendingDemo = f.id === '4'; // Sneha Kulkarni set to Pending for eKYC review demo
  return {
    providerId: `prov_${f.id}`,
    name: f.name,
    title: f.title,
    specialization: f.specialization,
    category: f.category || 'Tax Filing',
    startingPrice: f.price,
    rating: f.rating,
    reviewCount: f.reviewsCount,
    verified: !isPendingDemo,
    verificationStatus: isPendingDemo ? ('pending' as const) : ('verified' as const),
    verificationDocuments: [
      {
        id: `doc_${f.id}_pan`,
        docType: 'PAN',
        fileName: `${f.name.replace(/\s+/g, '_')}_PAN_Card.pdf`,
        fileSize: '1.2 MB',
        uploadedAt: '2026-01-05'
      },
      {
        id: `doc_${f.id}_lic`,
        docType: 'License',
        fileName: `License_${f.license}.pdf`,
        fileSize: '2.4 MB',
        uploadedAt: '2026-01-05'
      }
    ],
    distanceMeta: f.distance,
    experience: f.experience,
    license: f.license,
    bio: f.bio,
    autoReplyEnabled: true,
    image: f.image,
    email: `${f.name.toLowerCase().replace(/\s+/g, '.')}@finflex.com`,
    phone: '+91 98200 12345',
    city: 'Mumbai, MH',
    services: f.services,
    reviews: f.reviews
  };
});

/**
 * Seed administrative audit trail entries.
 * Pre-populates governance records demonstrating system bootstrap,
 * provider eKYC approvals, customer service bookings, and B2B profile activation.
 */
const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [

  {
    id: 'audit_1',
    timestamp: '2026-08-05 10:15',
    actor: 'System',
    actorRole: 'system',
    action: 'SYSTEM_BOOTSTRAP',
    target: 'FinFlex Platform',
    description: 'Data persistence initialized with demo seeded accounts, providers, and audit log engine.'
  },
  {
    id: 'audit_2',
    timestamp: '2026-08-05 11:30',
    actor: 'FinFlex Administrator',
    actorRole: 'admin',
    action: 'VERIFICATION_APPROVED',
    target: 'Amit Sharma (CA)',
    description: 'eKYC identity documents and ICAI CA license approved by Superadmin.'
  },
  {
    id: 'audit_3',
    timestamp: '2026-08-05 14:00',
    actor: 'Ariba Khan',
    actorRole: 'user',
    action: 'SERVICE_BOOKING',
    target: 'Amit Sharma',
    description: 'Booked Individual ITR Filing service for ₹1,500.'
  },
  {
    id: 'audit_4',
    timestamp: '2026-08-05 15:20',
    actor: 'Ariba Khan',
    actorRole: 'user',
    action: 'B2B_ACTIVATED',
    target: 'Khan Enterprises & Tech Solutions',
    description: 'Activated Enterprise B2B Business Account with GSTIN: 27AABCK1234F1Z5.'
  }
];

/**
 * Pre-populated service engagement history across different statuses
 * (completed, in_progress, pending) for testing customer & provider deliveries.
 */
const DEFAULT_HISTORY: ServiceHistoryItem[] = [

  {
    historyId: 'hist_101',
    userId: 'usr_1',
    userName: 'Ariba Khan',
    userEmail: 'ariba@gmail.com',
    providerId: 'prov_1',
    providerName: 'Amit Sharma',
    providerTitle: 'Chartered Accountant',
    category: 'Tax Filing',
    serviceDate: '2026-04-10 14:30',
    status: 'completed',
    amount: 1500,
    notes: 'Individual ITR Filing FY 2025-26 completed & verified with Form 26AS.',
    detailsRef: {
      location: 'Mumbai, MH (Remote)',
      invoiceNo: 'INV-2026-881',
      paymentMode: 'Direct NetBanking',
      deliverables: ['ITR-V Acknowledgment', 'Tax Computation Sheet', 'Form 16 Reconciliation']
    }
  },
  {
    historyId: 'hist_102',
    userId: 'usr_1',
    userName: 'Ariba Khan',
    userEmail: 'ariba@gmail.com',
    providerId: 'prov_2',
    providerName: 'Priya Iyer',
    providerTitle: 'Tax Consultant',
    category: 'GST Registration',
    serviceDate: '2026-04-18 11:00',
    status: 'in_progress',
    amount: 1200,
    notes: 'GST Certificate application filed under Maharashtra State Ward 4.',
    detailsRef: {
      location: 'Mumbai, MH',
      invoiceNo: 'INV-2026-904',
      paymentMode: 'UPI Reference',
      deliverables: ['ARN Registration Receipt', 'Document Audit Checklist']
    }
  },
  {
    historyId: 'hist_103',
    userId: 'usr_1',
    userName: 'Ariba Khan',
    userEmail: 'ariba@gmail.com',
    providerId: 'prov_3',
    providerName: 'Rajesh Malhotra',
    providerTitle: 'Financial Planner',
    category: 'Investment Plans',
    serviceDate: '2026-03-25 16:00',
    status: 'completed',
    amount: 2500,
    notes: 'Comprehensive Portfolio Rebalancing and SIP Allocation Strategy.',
    detailsRef: {
      location: 'Mumbai, MH',
      invoiceNo: 'INV-2026-722',
      paymentMode: 'Bank Transfer',
      deliverables: ['SIP Asset Allocation Roadmap', 'Risk Profiling Summary']
    }
  },
  {
    historyId: 'hist_104',
    userId: 'usr_2',
    userName: 'Karan Mehta',
    userEmail: 'karan@gmail.com',
    providerId: 'prov_4',
    providerName: 'Sneha Kulkarni',
    providerTitle: 'Insurance Specialist',
    category: 'Insurance',
    serviceDate: '2026-04-20 10:15',
    status: 'pending',
    amount: 800,
    notes: 'Health Insurance Family Float Policy Audit.',
    detailsRef: {
      location: 'Mumbai, MH',
      invoiceNo: 'INV-2026-950',
      paymentMode: 'Direct Pay',
      deliverables: ['Policy Claim Comparison Chart']
    }
  }
];

/**
 * Pre-seeded messaging conversation threads between customer and provider.
 */
const DEFAULT_THREADS: ChatThread[] = [

  {
    threadId: 'th_1_1',
    userId: 'usr_1',
    userName: 'Ariba Khan',
    userAvatar: 'https://picsum.photos/seed/user/200/200',
    providerId: 'prov_1',
    providerName: 'Amit Sharma',
    providerTitle: 'Chartered Accountant',
    providerAvatar: 'https://picsum.photos/seed/amit/200/200',
    lastMessage: 'Your Form 16 verification is complete!',
    lastTimestamp: '10:45 AM',
    unreadCountUser: 0,
    unreadCountProvider: 0
  },
  {
    threadId: 'th_1_2',
    userId: 'usr_1',
    userName: 'Ariba Khan',
    userAvatar: 'https://picsum.photos/seed/user/200/200',
    providerId: 'prov_2',
    providerName: 'Priya Iyer',
    providerTitle: 'Tax Consultant',
    providerAvatar: 'https://picsum.photos/seed/priya/200/200',
    lastMessage: 'Hi! Thank you for reaching out to Priya Iyer.',
    lastTimestamp: 'Yesterday',
    unreadCountUser: 0,
    unreadCountProvider: 0
  }
];

/**
 * Initial sample messages within threads illustrating customer ITR inquiries.
 */
const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    threadId: 'th_1_1',
    senderId: 'usr_1',
    senderName: 'Ariba Khan',
    text: 'Hello Mr. Amit, I uploaded my Form 16 for ITR filing.',
    timestamp: '10:30 AM'
  },
  {
    id: 'm2',
    threadId: 'th_1_1',
    senderId: 'prov_1',
    senderName: 'Amit Sharma',
    text: 'Your Form 16 verification is complete! I will proceed with ITR-2 submission now.',
    timestamp: '10:45 AM'
  }
];

/**
 * Primary business logic and data repository class for FinFlex.
 * Provides transactional mutations, automated audit trail logging,
 * and synchronized localStorage state updates.
 */
class DataService {
  constructor() {
    this.initStorage();
  }

  /**
   * Initializes browser localStorage with default demo data if not already populated.
   * Also ensures administrative credentials exist and repairs schema variances.
   */
  private initStorage() {

    const existingUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!existingUsersRaw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    } else {
      // Ensure admin and default seed passwords exist in stored users
      try {
        const users: UserAccount[] = JSON.parse(existingUsersRaw);
        let updated = false;
        
        // Make sure admin account is seeded
        if (!users.some(u => u.email.toLowerCase() === 'admin@finflex.com')) {
          const adminUser = DEFAULT_USERS.find(u => u.email.toLowerCase() === 'admin@finflex.com');
          if (adminUser) {
            users.push(adminUser);
            updated = true;
          }
        }
        
        // Attach passwords to existing seeded users if missing
        users.forEach(u => {
          if (!u.password) {
            if (u.role === 'admin') u.password = 'admin123';
            else if (u.role === 'provider') u.password = 'provider123';
            else u.password = 'user123';
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        }
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.PROVIDERS)) {
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(DEFAULT_PROVIDERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.HISTORY)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.THREADS)) {
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(DEFAULT_THREADS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MESSAGES)) {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(DEFAULT_MESSAGES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEFAULT_AUDIT_LOGS));
    }
  }

  // =========================================================================
  // AUDIT LOGGING SUBSYSTEM
  // =========================================================================

  /**
   * Retrieves full chronological audit trail records from storage.
   * Used by Superadmin in AdminDashboard to evaluate security and governance events.
   */
  getAuditLogs(): AuditLogEntry[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Appends an immutable compliance audit record with timestamp and randomized ID.
   * Auto-prepends to ensure latest entries appear first in administrative logs.
   */
  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    return newEntry;
  }

  // =========================================================================
  // USER SESSION MANAGEMENT
  // =========================================================================

  /**
   * Retrieves the currently active user session from localStorage, or null if logged out.
   */
  getCurrentSession(): UserAccount | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Updates or clears the stored user session.
   * Passing null clears active session on user sign out.
   */
  setSession(user: UserAccount | null) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    }
  }

  // =========================================================================
  // USER ACCOUNTS & AUTHENTICATION
  // =========================================================================

  /**
   * Fetches all registered user accounts.
   */
  getUsers(): UserAccount[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Registers a new account across Customer, Provider, or Admin roles.
   * For provider roles, automatically instantiates a linked ProviderProfile
   * with initial verificationStatus='not_submitted'.
   * Records a 'USER_REGISTERED' audit log entry.
   */
  registerUser(

    name: string, 
    email: string, 
    role: 'user' | 'provider' | 'admin', 
    password?: string,
    providerDetails?: { title: string; specialization: string; price: number }
  ): UserAccount {
    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const newUserId = role === 'provider' ? `prov_${Date.now()}` : `usr_${Date.now()}`;
    const newUser: UserAccount = {
      userId: newUserId,
      name,
      email,
      password: password || 'password123',
      role,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      avatar: `https://picsum.photos/seed/${newUserId}/200/200`
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    if (role === 'provider') {
      const providers = this.getProviders();
      const provCategory = providerDetails?.specialization || 'Tax Filing';
      const newProvider: ProviderProfile = {
        providerId: newUserId,
        name,
        title: providerDetails?.title || 'Financial Consultant',
        specialization: providerDetails?.specialization || 'Tax & Advisory',
        category: provCategory,
        startingPrice: providerDetails?.price || 1500,
        rating: 5.0,
        reviewCount: 0,
        verified: false,
        verificationStatus: 'not_submitted',
        verificationDocuments: [],
        distanceMeta: 1.5,
        experience: 3,
        license: `FIN-${Math.floor(1000 + Math.random() * 9000)}`,
        bio: `${name} is a certified ${providerDetails?.title || 'consultant'} registered on FinFlex.`,
        autoReplyEnabled: true,
        image: newUser.avatar!,
        email: email,
        phone: '+91 98200 12345',
        city: 'Mumbai, MH',
        services: [
          { name: providerDetails?.specialization || 'Standard Consultation', price: `₹${providerDetails?.price || 1500}` }
        ],
        reviews: []
      };
      providers.push(newProvider);
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
    }

    this.addAuditLog({
      actor: name,
      actorRole: role,
      action: 'USER_REGISTERED',
      target: `${name} (${email})`,
      description: `New ${role.toUpperCase()} account registered.`
    });

    return newUser;
  }

  /**
   * Authenticates a user against credentials stored in localStorage.
   * Enforces business security constraints:
   * - Account must exist.
   * - Account status must not be 'suspended'.
   * - Selected role must match the account's registered role.
   * - Password match check if password provided.
   */
  loginUser(email: string, role: 'user' | 'provider' | 'admin', password?: string): UserAccount {
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error('Account not found. Please check your email or Sign Up.');
    }

    if (user.status === 'suspended') {
      throw new Error('This account has been suspended by an administrator.');
    }

    if (user.role !== role) {
      throw new Error(`Role mismatch. This account is registered as a ${user.role.toUpperCase()}. Please select the correct role tab above.`);
    }

    // Optional password verification if password provided
    if (password && user.password && user.password !== password) {
      throw new Error('Invalid password. Please check credentials or use the Demo Credentials helper panel.');
    }

    return user;
  }

  /**
   * Administrative toggle to activate or suspend a user account.
   * Suspended accounts cannot authenticate and their listings are hidden.
   * Synchronizes the active session if currently logged in, and writes an audit log.
   */
  toggleUserStatus(userId: string, adminName: string = 'FinFlex Administrator'): UserAccount {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      const nextStatus = users[idx].status === 'active' ? 'suspended' : 'active';
      users[idx].status = nextStatus;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Also sync session if the currently logged-in user got suspended/activated
      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.userId === userId) {
        this.setSession(users[idx]);
      }

      this.addAuditLog({
        actor: adminName,
        actorRole: 'admin',
        action: nextStatus === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        target: `${users[idx].name} (${users[idx].role})`,
        description: `Account status set to ${nextStatus.toUpperCase()} by ${adminName}.`
      });

      return users[idx];
    }
    throw new Error('User not found');
  }

  /**
   * Updates profile fields for an authenticated user (e.g., name, phone, address, city).
   * Synchronizes active session and logs audit trail.
   */
  updateUserProfile(userId: string, updates: Partial<UserAccount>): UserAccount {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.userId === userId) {
        this.setSession(users[idx]);
      }

      this.addAuditLog({
        actor: users[idx].name,
        actorRole: users[idx].role,
        action: 'PROFILE_UPDATED',
        target: users[idx].name,
        description: `Updated profile details.`
      });

      return users[idx];
    }
    throw new Error('User account not found');
  }

  /**
   * Activates corporate Enterprise B2B mode on a customer account.
   * Attaches GSTIN, company name, entity type, and generates audit record.
   */
  activateBusinessAccount(userId: string, businessDetails: BusinessDetails): UserAccount {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      users[idx].isBusinessAccount = true;
      users[idx].businessDetails = businessDetails;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.userId === userId) {
        this.setSession(users[idx]);
      }

      this.addAuditLog({
        actor: users[idx].name,
        actorRole: users[idx].role,
        action: 'B2B_ACTIVATED',
        target: businessDetails.businessName || users[idx].name,
        description: `Activated Enterprise B2B Business Account (GSTIN: ${businessDetails.gstin}).`
      });

      return users[idx];
    }
    throw new Error('User account not found');
  }

  /**
   * Deactivates corporate Enterprise B2B mode and clears associated business metadata.
   */
  deactivateBusinessAccount(userId: string): UserAccount {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.userId === userId);
    if (idx !== -1) {
      const companyName = users[idx].businessDetails?.companyName || users[idx].businessDetails?.businessName || users[idx].name;
      users[idx].isBusinessAccount = false;
      users[idx].businessDetails = undefined;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      const currentSession = this.getCurrentSession();
      if (currentSession && currentSession.userId === userId) {
        this.setSession(users[idx]);
      }

      this.addAuditLog({
        actor: users[idx].name,
        actorRole: users[idx].role,
        action: 'B2B_DEACTIVATED',
        target: companyName,
        description: `Deactivated Enterprise B2B Business Account.`
      });

      return users[idx];
    }
    throw new Error('User account not found');
  }

  // =========================================================================
  // PROVIDER PROFILES, eKYC VERIFICATION & PUBLIC VISIBILITY
  // =========================================================================

  /**
   * Fetches all registered provider profiles regardless of verification status.
   * Used primarily by AdminDashboard to manage verification pipelines.
   */
  getProviders(): ProviderProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROVIDERS);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * CRITICAL BUSINESS RULE: Public Marketplace Visibility Check.
   * A provider is only publicly visible in Search, Discovery, and Booking if:
   * 1. verified === true AND verificationStatus === 'verified' (eKYC approved).
   * 2. Underlying UserAccount status is NOT 'suspended'.
   * 
   * @param providerId - Raw provider ID or prefixed 'prov_' ID.
   */
  isProviderPubliclyVisible(providerId: string): boolean {
    const cleanId = providerId.startsWith('prov_') ? providerId : `prov_${providerId}`;
    const providers = this.getProviders();
    const prov = providers.find(p => p.providerId === cleanId);
    if (!prov) return false;
    if (!prov.verified || prov.verificationStatus !== 'verified') return false;

    const users = this.getUsers();
    const user = users.find(u => u.userId === cleanId);
    if (user && user.status === 'suspended') return false;

    return true;
  }

  /**
   * Returns only providers eligible for public customer listing.
   * Enforces verified eKYC status and active account state.
   */
  getPublicProviders(): ProviderProfile[] {
    const providers = this.getProviders();
    const users = this.getUsers();
    return providers.filter(p => {
      if (!p.verified || p.verificationStatus !== 'verified') return false;
      const user = users.find(u => u.userId === p.providerId);
      if (user && user.status === 'suspended') return false;
      return true;
    });
  }

  /**
   * Updates provider professional profile information (bio, rates, services, license).
   */
  updateProviderProfile(providerId: string, updates: Partial<ProviderProfile>): ProviderProfile {

    const providers = this.getProviders();
    const idx = providers.findIndex(p => p.providerId === providerId);
    if (idx !== -1) {
      providers[idx] = { ...providers[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));

      this.addAuditLog({
        actor: providers[idx].name,
        actorRole: 'provider',
        action: 'PROVIDER_PROFILE_UPDATED',
        target: providers[idx].name,
        description: `Updated provider details.`
      });

      return providers[idx];
    }
    throw new Error('Provider profile not found');
  }

  /**
   * Submits eKYC documents (e.g., PAN, Degree, CA License) for admin review.
   * Sets verificationStatus to 'pending' and records an audit log.
   */
  submitProviderVerification(providerId: string, docs: VerificationDocument[]): ProviderProfile {
    const providers = this.getProviders();
    const idx = providers.findIndex(p => p.providerId === providerId);
    if (idx !== -1) {
      providers[idx].verificationStatus = 'pending';
      providers[idx].verificationDocuments = docs;
      providers[idx].rejectionReason = undefined;
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));

      this.addAuditLog({
        actor: providers[idx].name,
        actorRole: 'provider',
        action: 'VERIFICATION_SUBMITTED',
        target: providers[idx].name,
        description: `Submitted ${docs.length} document(s) for eKYC verification.`
      });

      return providers[idx];
    }
    throw new Error('Provider profile not found');
  }

  /**
   * Administrative decision handler for provider verification.
   * On approval: verified becomes true, verificationStatus becomes 'verified'.
   * On rejection: verified becomes false, verificationStatus becomes 'rejected', storing the reason.
   * Generates a formal audit log entry.
   */
  reviewProviderVerification(
    providerId: string, 
    approved: boolean, 
    reason?: string, 
    adminName: string = 'FinFlex Administrator'
  ): ProviderProfile {
    const providers = this.getProviders();
    const idx = providers.findIndex(p => p.providerId === providerId);
    if (idx !== -1) {
      if (approved) {
        providers[idx].verified = true;
        providers[idx].verificationStatus = 'verified';
        providers[idx].rejectionReason = undefined;
      } else {
        providers[idx].verified = false;
        providers[idx].verificationStatus = 'rejected';
        providers[idx].rejectionReason = reason || 'Documents invalid or incomplete.';
      }
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));

      this.addAuditLog({
        actor: adminName,
        actorRole: 'admin',
        action: approved ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
        target: providers[idx].name,
        description: approved
          ? `Approved eKYC document verification for ${providers[idx].name}.`
          : `Rejected eKYC verification for ${providers[idx].name}. Reason: ${reason || 'Incomplete documents'}`
      });

      return providers[idx];
    }
    throw new Error('Provider profile not found');
  }

  /**
   * Enables or disables automatic contextual inquiry replies for a provider.
   */
  toggleProviderAutoReply(providerId: string, enabled: boolean) {
    const providers = this.getProviders();
    const idx = providers.findIndex(p => p.providerId === providerId);
    if (idx !== -1) {
      providers[idx].autoReplyEnabled = enabled;
      localStorage.setItem(STORAGE_KEYS.PROVIDERS, JSON.stringify(providers));
    }
  }

  // =========================================================================
  // SERVICE ENGAGEMENT HISTORY & BOOKINGS
  // =========================================================================

  /**
   * Retrieves service engagement items, optionally filtered by user or provider ID.
   */
  getHistory(userId?: string, providerId?: string): ServiceHistoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    const all: ServiceHistoryItem[] = raw ? JSON.parse(raw) : [];
    if (userId) return all.filter(h => h.userId === userId);
    if (providerId) return all.filter(h => h.providerId === providerId);
    return all;
  }

  /**
   * Logs a new service transaction record with timestamp and invoice metadata.
   */
  addHistoryRecord(item: Omit<ServiceHistoryItem, 'historyId'>): ServiceHistoryItem {
    const all = this.getHistory();
    const newItem: ServiceHistoryItem = {
      ...item,
      historyId: `hist_${Date.now()}`
    };
    all.unshift(newItem);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(all));
    return newItem;
  }

  // =========================================================================
  // SECURE MESSAGING & CONVERSATION THREADS
  // =========================================================================

  /**
   * Fetches all active conversation threads for a specific participant (customer or provider).
   */
  getThreadsForUser(userId: string): ChatThread[] {
    const raw = localStorage.getItem(STORAGE_KEYS.THREADS);
    const threads: ChatThread[] = raw ? JSON.parse(raw) : [];
    return threads.filter(t => t.userId === userId || t.providerId === userId);
  }

  /**
   * Retrieves messages for a specific conversation thread ordered chronologically.
   */
  getMessagesForThread(threadId: string): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const messages: ChatMessage[] = raw ? JSON.parse(raw) : [];
    return messages.filter(m => m.threadId === threadId);
  }

  /**
   * Gets an existing conversation thread or instantiates a new one between customer and provider.
   */
  getOrCreateThread(user: UserAccount, provider: ProviderProfile): ChatThread {
    const rawThreads = localStorage.getItem(STORAGE_KEYS.THREADS);
    const threads: ChatThread[] = rawThreads ? JSON.parse(rawThreads) : [];

    let existing = threads.find(t => t.userId === user.userId && t.providerId === provider.providerId);
    if (!existing) {
      existing = {
        threadId: `th_${user.userId}_${provider.providerId}`,
        userId: user.userId,
        userName: user.name,
        userAvatar: user.avatar,
        providerId: provider.providerId,
        providerName: provider.name,
        providerTitle: provider.title,
        providerAvatar: provider.image,
        lastMessage: 'Conversation started.',
        lastTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCountUser: 0,
        unreadCountProvider: 0
      };
      threads.unshift(existing);
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
    }
    return existing;
  }

  /**
   * Dispatches a message within a thread.
   * If sent by a Customer to a Provider whose autoReplyEnabled is true,
   * automatically triggers the keyword heuristic auto-reply bot engine.
   */
  sendMessage(threadId: string, sender: UserAccount, text: string): { userMsg: ChatMessage; autoReplyMsg?: ChatMessage } {
    const rawMsgs = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const messages: ChatMessage[] = rawMsgs ? JSON.parse(rawMsgs) : [];

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      threadId,
      senderId: sender.userId,
      senderName: sender.name,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(userMsg);

    // Update Thread preview
    const threads = this.getThreadsForUser(sender.userId);
    const rawThreads = localStorage.getItem(STORAGE_KEYS.THREADS);
    const allThreads: ChatThread[] = rawThreads ? JSON.parse(rawThreads) : [];
    const threadIdx = allThreads.findIndex(t => t.threadId === threadId);

    if (threadIdx !== -1) {
      allThreads[threadIdx].lastMessage = text;
      allThreads[threadIdx].lastTimestamp = userMsg.timestamp;
    }

    let autoReplyMsg: ChatMessage | undefined = undefined;

    // Trigger Auto-Reply if message is sent by a User/Customer to a Service Provider
    if (sender.role === 'user' && threadIdx !== -1) {
      const targetThread = allThreads[threadIdx];
      const providers = this.getProviders();
      const provider = providers.find(p => p.providerId === targetThread.providerId);

      if (provider && provider.autoReplyEnabled) {
        const reply = generateAutoReply(text, provider, threadId, provider.providerId);
        if (reply) {
          messages.push(reply);
          autoReplyMsg = reply;
          allThreads[threadIdx].lastMessage = reply.text;
          allThreads[threadIdx].lastTimestamp = reply.timestamp;
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(allThreads));

    return { userMsg, autoReplyMsg };
  }

  // =========================================================================
  // ADMIN PLATFORM METRICS & STATS
  // =========================================================================

  /**
   * Computes aggregate platform operational metrics for AdminDashboard.
   * Returns active customer count, provider count, logged bookings, total volume,
   * and service category distributions.
   */
  getSystemStats(): SystemStats {
    const users = this.getUsers();
    const providers = this.getProviders();
    const history = this.getHistory();

    const categoryMap: { [cat: string]: number } = {};
    history.forEach(h => {
      categoryMap[h.category] = (categoryMap[h.category] || 0) + 1;
    });

    const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
      category: cat,
      count: categoryMap[cat]
    }));

    const totalVolumeAmount = history.reduce((acc, curr) => acc + curr.amount, 0);

    return {
      totalUsers: users.filter(u => u.role === 'user').length,
      totalProviders: providers.length,
      totalBookingsLogged: history.length,
      totalVolumeAmount,
      categoryBreakdown
    };
  }
}

/**
 * Global singleton database service instance accessed throughout the application.
 */
export const dbService = new DataService();

