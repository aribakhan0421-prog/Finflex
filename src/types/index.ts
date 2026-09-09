/**
 * @file src/types/index.ts
 * @description Core TypeScript type definitions, interfaces, and data models for the FinFlex marketplace.
 * Defines domain entities for user accounts, provider profiles, eKYC verification, service history,
 * messaging threads, audit logs, and administrative system metrics.
 * 
 * Target Roles: Shared across all roles (Customer, Provider, Admin).
 * Closely depended on by: dataService.ts, App.tsx, and all component tabs.
 */

import { Freelancer, Review, Service } from '../data';

/**
 * Access control roles within the FinFlex platform:
 * - 'user': Retail customer / client seeking financial or tax assistance.
 * - 'provider': Chartered Accountant, tax consultant, or financial advisor.
 * - 'admin': Platform superadmin responsible for eKYC reviews, user status, and audit governance.
 */
export type UserRole = 'user' | 'provider' | 'admin';

/**
 * Entity structure for Enterprise B2B business details.
 * Attached to a UserAccount when business account activation is completed.
 */
export interface BusinessDetails {
  companyName?: string;
  businessName: string; // Registered business legal name
  gstin: string; // 15-character Indian Goods and Services Tax Identification Number
  cin?: string; // Corporate Identity Number for companies
  orgType?: string;
  turnover?: string;
  businessEmail: string;
  businessPhone: string;
  entityType: string; // e.g., 'Private Limited', 'Partnership', 'Sole Proprietorship'
  activatedAt: string; // ISO date of B2B onboarding
}

/**
 * Primary user account model representing authenticated identities across all roles.
 */
export interface UserAccount {
  userId: string; // Unique primary identifier (e.g. 'usr_1', 'prov_1', 'admin_1')
  name: string; // Full legal or display name
  email: string; // Unique login email address
  password?: string; // Stored authentication credential
  role: UserRole; // Role determines access routing and UI capability
  status: 'active' | 'suspended'; // Account state; 'suspended' accounts cannot log in or appear in search
  kycStatus?: 'not_submitted' | 'pending' | 'verified' | 'rejected'; // User personal KYC state
  address?: string;
  createdAt: string;
  avatar?: string;
  phone?: string;
  city?: string;
  isBusinessAccount?: boolean; // Flag indicating if customer has activated Enterprise B2B mode
  businessDetails?: BusinessDetails; // Nested enterprise corporate profile
}

/**
 * Supporting verification document uploaded by a Service Provider for eKYC auditing.
 */
export interface VerificationDocument {
  id: string; // Unique document ID
  docType: 'PAN' | 'Aadhaar' | 'License' | 'GST' | 'Certification'; // Official verification type
  fileName: string; // Human-readable file name
  fileSize?: string; // Display file size (e.g., '1.8 MB')
  uploadedAt: string; // Date of document upload
  fileUrl?: string;
}

/**
 * Comprehensive professional profile for Service Providers (CAs, Tax Experts, Financial Advisors).
 * Controls marketplace listing visibility, consultation pricing, and eKYC status.
 */
export interface ProviderProfile {
  providerId: string; // Matches the corresponding UserAccount.userId
  name: string;
  title: string; // Professional title, e.g. 'Chartered Accountant', 'Tax Consultant'
  specialization: string; // Core specialty area, e.g. 'Tax Filing & Audit'
  category: string; // High-level marketplace category ('Tax Filing', 'GST Reg', 'Insurance', etc.)
  startingPrice: number; // Base consultation fee in INR (₹)
  rating: number; // Aggregate customer review rating (0.0 to 5.0)
  reviewCount: number; // Total count of client feedback reviews
  verified: boolean; // Boolean flag; must be true alongside status='verified' for public listing
  verificationStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected'; // eKYC approval workflow state
  verificationDocuments?: VerificationDocument[]; // Uploaded certificates and government identity proofs
  rejectionReason?: string; // Reason recorded by Admin if eKYC verification was rejected
  distanceMeta: number; // Proximity distance in kilometers for hyperlocal sorting
  experience: number; // Years of professional experience
  license: string; // Regulatory license ID (e.g. ICAI, Bar Council, or IRDAI number)
  bio: string; // Provider biographical overview
  autoReplyEnabled: boolean; // Controls whether incoming customer inquiries receive instant bot replies
  image: string; // Avatar portrait URL
  phone?: string;
  email?: string;
  city?: string;
  services: Service[]; // List of specific services and their pricing tiers
  reviews: Review[]; // Client review testimonials
}

/**
 * Immutable audit log record for regulatory compliance and administrative tracking.
 */
export interface AuditLogEntry {
  id: string; // Unique log entry identifier
  timestamp: string; // ISO timestamp of action
  actor: string; // Name or identifier of user/admin who triggered the event
  actorRole: UserRole | 'system'; // Role of the actor
  action: string; // Canonical action key (e.g. 'VERIFICATION_APPROVED', 'USER_SUSPENDED')
  target: string; // Target entity or person affected
  description: string; // Detailed human-readable description of the operation
}

/**
 * Status lifecycle values for booked client service engagements.
 */
export type ServiceStatus = 'completed' | 'cancelled' | 'in_progress' | 'pending';

/**
 * Historical record of a completed or ongoing financial consultation or delivery.
 */
export interface ServiceHistoryItem {
  historyId: string; // Unique primary key for the transaction
  userId: string; // Customer who booked the service
  userName: string;
  userEmail: string;
  providerId: string; // Service Provider assigned to the job
  providerName: string;
  providerTitle: string;
  category: string; // Marketplace category of the engagement
  serviceDate: string; // Date of service execution
  status: ServiceStatus; // Lifecycle state
  amount: number; // Total transactional volume in INR (₹)
  notes?: string;
  detailsRef?: {
    location?: string; // Consultation venue or mode (e.g., 'In-Office Consultation')
    invoiceNo?: string; // Tax invoice identifier
    paymentMode?: string; // Payment method (e.g., 'UPI / NetBanking')
    deliverables?: string[]; // Deliverable artifacts (e.g., 'ITR-V Acknowledgement')
  };
}

/**
 * Individual chat message entry within a direct conversation thread.
 */
export interface ChatMessage {
  id: string; // Unique message ID
  threadId: string; // Foreign key linking to parent ChatThread
  senderId: string; // User ID of the message author
  senderName: string; // Display name of the author
  text: string; // Message content
  timestamp: string; // Formatted time string (e.g., '10:45 AM')
  isAutoReply?: boolean; // True if automatically generated by the Provider's Auto-Reply bot
}

/**
 * Bidirectional conversation thread connecting a Customer and a Service Provider.
 */
export interface ChatThread {
  threadId: string; // Unique thread identifier
  userId: string; // Customer participant ID
  userName: string;
  userAvatar?: string;
  providerId: string; // Provider participant ID
  providerName: string;
  providerTitle: string;
  providerAvatar?: string;
  lastMessage: string; // Preview snippet of latest message
  lastTimestamp: string; // Timestamp of latest message
  unreadCountUser: number; // Unread badge count for the customer
  unreadCountProvider: number; // Unread badge count for the provider
}

/**
 * Aggregated platform metrics computed for the Superadmin governance console.
 */
export interface SystemStats {
  totalUsers: number; // Total registered customer accounts
  totalProviders: number; // Total registered provider profiles
  totalBookingsLogged: number; // Total service deliveries recorded across the platform
  totalVolumeAmount: number; // Cumulative financial transaction volume in INR (₹)
  categoryBreakdown: { category: string; count: number }[]; // Transaction volume grouped by category
}

