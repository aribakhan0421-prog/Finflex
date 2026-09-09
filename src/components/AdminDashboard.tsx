/**
 * @file src/components/AdminDashboard.tsx
 * @description Centralized Superadmin Governance Console for FinFlex.
 * Empowers platform administrators to monitor high-level KPIs and GMV volume,
 * manage and suspend user accounts, review pending eKYC credentials and documents,
 * and inspect real-time chronological compliance audit logs.
 * 
 * Target Role: Superadmin ('admin').
 * Closely depended on by: App.tsx (rendered when active session role is 'admin').
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Activity, 
  Search, 
  UserX, 
  UserCheck, 
  BarChart3, 
  FileText, 
  Layers, 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  FileSearch,
  Check,
  Ban,
  Filter,
  Clock,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserAccount, ProviderProfile, SystemStats, AuditLogEntry, VerificationDocument } from '../types';
import { dbService } from '../services/dataService';
import { toast } from 'sonner';

/**
 * Superadmin Governance Dashboard Component
 */
export function AdminDashboard() {
  // Navigation tabs within admin control center
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'providers' | 'verification' | 'audit'>('stats');
  
  // Real-time reactive data stores queried from dbService
  const [usersList, setUsersList] = useState<UserAccount[]>(dbService.getUsers());
  const [providersList, setProvidersList] = useState<ProviderProfile[]>(dbService.getProviders());
  const [systemStats, setSystemStats] = useState<SystemStats>(dbService.getSystemStats());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(dbService.getAuditLogs());
  
  // Search query state for filtering users, providers, or verification requests
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audit log action category filter ('ALL', 'USER_', 'VERIFICATION_', 'B2B_', etc.)
  const [auditActionFilter, setAuditActionFilter] = useState<string>('ALL');

  // Modal inspection states for user and provider drilldown
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserAccount | null>(null);
  const [selectedProviderDetail, setSelectedProviderDetail] = useState<ProviderProfile | null>(null);

  // Verification review modal and rejection rationale state
  const [reviewingProvider, setReviewingProvider] = useState<ProviderProfile | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  /**
   * Refreshes all local state slices from localStorage persistence.
   */
  const refreshAllData = () => {
    setUsersList(dbService.getUsers());
    setProvidersList(dbService.getProviders());
    setSystemStats(dbService.getSystemStats());
    setAuditLogs(dbService.getAuditLogs());
  };

  /**
   * Toggles an account between 'active' and 'suspended' statuses.
   * Emits an audit log and updates the public visibility index.
   */
  const handleToggleUserStatus = (userId: string, name: string) => {
    try {
      const updated = dbService.toggleUserStatus(userId, 'FinFlex Administrator');
      refreshAllData();
      toast.success(`Updated status for ${name}`, {
        description: `Account status is now ${updated.status.toUpperCase()}`
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /**
   * Approves a provider's eKYC documentation, granting public marketplace discovery.
   */
  const handleApproveProvider = (provider: ProviderProfile) => {
    try {
      dbService.reviewProviderVerification(provider.providerId, true, undefined, 'FinFlex Administrator');
      refreshAllData();
      toast.success(`Approved ${provider.name}'s Verification`, {
        description: 'Provider is now Verified with eKYC badge.',
        icon: <CheckCircle2 className="text-emerald-500" />
      });
      if (reviewingProvider?.providerId === provider.providerId) {
        setReviewingProvider(null);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /**
   * Rejects a provider's eKYC submission with a mandatory recorded explanation.
   */
  const handleRejectProviderSubmit = () => {
    if (!reviewingProvider) return;
    if (!rejectionReasonInput.trim()) {
      toast.error('Rejection reason is required.');
      return;
    }

    try {
      dbService.reviewProviderVerification(
        reviewingProvider.providerId, 
        false, 
        rejectionReasonInput.trim(), 
        'FinFlex Administrator'
      );
      refreshAllData();
      toast.info(`Rejected verification for ${reviewingProvider.name}`, {
        description: `Reason: ${rejectionReasonInput.trim()}`
      });
      setReviewingProvider(null);
      setIsRejectModalOpen(false);
      setRejectionReasonInput('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const pendingVerificationCount = providersList.filter(
    p => p.verificationStatus === 'pending'
  ).length;

  const filteredUsers = usersList.filter(u => u.role === 'user').filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProviders = providersList.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Verification queue sorted: 'pending' first, then others
  const sortedVerificationProviders = [...providersList].sort((a, b) => {
    const statusOrder: { [key: string]: number } = {
      pending: 1,
      not_submitted: 2,
      rejected: 3,
      verified: 4
    };
    return (statusOrder[a.verificationStatus || 'not_submitted'] || 5) - (statusOrder[b.verificationStatus || 'not_submitted'] || 5);
  }).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Audit Log filtering
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesQuery = 
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (auditActionFilter === 'ALL') return true;
    if (auditActionFilter === 'VERIFICATION') return log.action.includes('VERIFICATION');
    if (auditActionFilter === 'STATUS_CHANGE') return log.action.includes('USER_');
    if (auditActionFilter === 'REGISTRATION') return log.action === 'USER_REGISTERED';
    if (auditActionFilter === 'B2B') return log.action.includes('B2B');
    if (auditActionFilter === 'BOOKING') return log.action.includes('BOOKING');
    return true;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-trust-blue via-blue-900 to-trust-blue text-white p-6 md:p-8 rounded-[32px] border border-trust-blue/20 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={24} className="text-amber-400" />
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">System Admin Console</h2>
            <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase rounded-full">
              Superadmin
            </span>
          </div>
          <p className="text-slate-300 text-xs md:text-sm">
            Governance dashboard for managing Users, Provider eKYC Verifications, System Audits, and Analytics.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap bg-white/10 p-1.5 rounded-2xl shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'stats' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <BarChart3 size={15} /> System Stats
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'users' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Users size={15} /> Customers ({systemStats.totalUsers})
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'providers' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Briefcase size={15} /> Providers ({systemStats.totalProviders})
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 relative ${activeTab === 'verification' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <FileSearch size={15} /> eKYC Queue
            {pendingVerificationCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-trust-blue font-extrabold text-[10px] rounded-full animate-pulse">
                {pendingVerificationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 'audit' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Activity size={15} /> System Audit Logs
          </button>
        </div>
      </div>

      {/* SEARCH BAR (For Users, Providers, Verification, Audit views) */}
      {activeTab !== 'stats' && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={
              activeTab === 'users' ? "Search users by name or email..." :
              activeTab === 'providers' ? "Search providers by name, profession, specialization..." :
              activeTab === 'verification' ? "Search provider verification queue by name or profession..." :
              "Search system audit logs by actor, target, action or description..."
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm font-semibold outline-none focus:border-trust-blue shadow-sm"
          />
        </div>
      )}

      {/* STATS VIEW */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                <Users size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customers</p>
                <h4 className="text-2xl font-extrabold text-trust-blue">{systemStats.totalUsers}</h4>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                <Briefcase size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Providers</p>
                <h4 className="text-2xl font-extrabold text-trust-blue">{systemStats.totalProviders}</h4>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Bookings Logged</p>
                <h4 className="text-2xl font-extrabold text-trust-blue">{systemStats.totalBookingsLogged}</h4>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <TrendingUp size={22} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Volume Logged</p>
                <h4 className="text-2xl font-extrabold text-trust-blue">₹{systemStats.totalVolumeAmount.toLocaleString('en-IN')}</h4>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-xl text-trust-blue flex items-center gap-2">
              <Layers className="text-success-green" size={22} />
              Service Category Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemStats.categoryBreakdown.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-sm text-trust-blue">{item.category}</span>
                  <span className="px-3 py-1 bg-trust-blue/10 text-trust-blue font-extrabold text-xs rounded-full">
                    {item.count} bookings
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* USERS VIEW */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-gray font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Customer</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map(user => (
                  <tr key={user.userId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 pl-6 flex items-center gap-3">
                      <img src={user.avatar} className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-trust-blue block">{user.name}</span>
                        {user.phone && <span className="text-[10px] text-slate-400 block">{user.phone}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-slate-gray">{user.email}</td>
                    <td className="p-4">
                      {user.isBusinessAccount ? (
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-extrabold rounded-full border border-purple-200">
                          🏢 B2B Business
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">
                          Personal
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-gray">{user.createdAt}</td>
                    <td className="p-4">
                      {user.status === 'active' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right pr-6 space-x-2">
                      <button
                        onClick={() => setSelectedUserDetail(user)}
                        className="px-3 py-1.5 bg-slate-100 text-trust-blue font-bold text-xs rounded-xl hover:bg-slate-200"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(user.userId, user.name)}
                        className={`px-3 py-1.5 font-bold text-xs rounded-xl text-white transition-colors ${user.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                        {user.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROVIDERS VIEW */}
      {activeTab === 'providers' && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-gray font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="p-4 pl-6">Provider Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Starting Fee</th>
                  <th className="p-4">eKYC Verification</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredProviders.map(prov => {
                  const provUser = usersList.find(u => u.userId === prov.providerId);
                  const isSuspended = provUser?.status === 'suspended';

                  return (
                    <tr key={prov.providerId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img src={prov.image} className="w-9 h-9 rounded-full object-cover" />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-trust-blue">{prov.name}</span>
                            {prov.verified && <ShieldCheck size={14} className="text-amber-500" />}
                          </div>
                          <span className="text-[10px] text-slate-gray">{prov.title} • {prov.license}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-full">
                          {prov.category || prov.specialization}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-trust-blue">₹{prov.startingPrice}</td>
                      <td className="p-4">
                        {prov.verificationStatus === 'verified' && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        )}
                        {prov.verificationStatus === 'pending' && (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200 flex items-center gap-1 w-max">
                            <Clock size={12} /> Pending Review
                          </span>
                        )}
                        {prov.verificationStatus === 'rejected' && (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200 flex items-center gap-1 w-max">
                            <AlertTriangle size={12} /> Rejected
                          </span>
                        )}
                        {(!prov.verificationStatus || prov.verificationStatus === 'not_submitted') && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                            Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {isSuspended ? (
                          <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2">
                        <button
                          onClick={() => setSelectedProviderDetail(prov)}
                          className="px-3 py-1.5 bg-slate-100 text-trust-blue font-bold text-xs rounded-xl hover:bg-slate-200"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(prov.providerId, prov.name)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-xl text-white transition-colors ${isSuspended ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
                        >
                          {isSuspended ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PROVIDER VERIFICATION QUEUE VIEW (SECTION 1) */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl text-trust-blue flex items-center gap-2">
              <FileSearch className="text-amber-500" size={22} />
              Provider Document Verification & eKYC Queue
            </h3>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              {pendingVerificationCount} Pending Review
            </span>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 text-slate-gray font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="p-4 pl-6">Provider</th>
                    <th className="p-4">Profession / Category</th>
                    <th className="p-4">Submitted Documents</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedVerificationProviders.map(prov => (
                    <tr 
                      key={prov.providerId} 
                      className={`hover:bg-slate-50/80 transition-colors ${prov.verificationStatus === 'pending' ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="p-4 pl-6 flex items-center gap-3">
                        <img src={prov.image} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        <div>
                          <span className="font-bold text-trust-blue block">{prov.name}</span>
                          <span className="text-[10px] text-slate-gray block">Lic: {prov.license}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-trust-blue block">{prov.title}</span>
                        <span className="text-[10px] text-slate-400 block">{prov.category || prov.specialization}</span>
                      </td>
                      <td className="p-4">
                        {prov.verificationDocuments && prov.verificationDocuments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {prov.verificationDocuments.map((doc, dIdx) => (
                              <span key={dIdx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono font-bold rounded border border-slate-200">
                                📄 {doc.docType}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No documents attached</span>
                        )}
                      </td>
                      <td className="p-4">
                        {prov.verificationStatus === 'pending' && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded-full border border-amber-300 animate-pulse flex items-center gap-1 w-max">
                            <Clock size={12} /> Pending Review
                          </span>
                        )}
                        {prov.verificationStatus === 'verified' && (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-[10px] rounded-full border border-emerald-200 flex items-center gap-1 w-max">
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        )}
                        {prov.verificationStatus === 'rejected' && (
                          <div>
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 font-extrabold text-[10px] rounded-full border border-red-200 flex items-center gap-1 w-max">
                              <AlertTriangle size={12} /> Rejected
                            </span>
                            {prov.rejectionReason && (
                              <span className="text-[10px] text-red-600 block mt-1 line-clamp-1">
                                Reason: {prov.rejectionReason}
                              </span>
                            )}
                          </div>
                        )}
                        {(!prov.verificationStatus || prov.verificationStatus === 'not_submitted') && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[10px] rounded-full">
                            Not Submitted
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2">
                        <button
                          onClick={() => setReviewingProvider(prov)}
                          className="px-3 py-1.5 bg-slate-100 text-trust-blue font-bold text-xs rounded-xl hover:bg-slate-200"
                        >
                          View Docs
                        </button>
                        <button
                          onClick={() => handleApproveProvider(prov)}
                          disabled={prov.verificationStatus === 'verified'}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setReviewingProvider(prov);
                            setIsRejectModalOpen(true);
                          }}
                          disabled={prov.verificationStatus === 'rejected'}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl disabled:opacity-40 transition-colors"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM AUDIT HISTORY VIEW (SECTION 2 - FIXED) */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xl text-trust-blue flex items-center gap-2">
                <Activity className="text-emerald-500" size={22} />
                System Audit Trail & Security Logs
              </h3>
              <p className="text-xs text-slate-gray mt-0.5">
                Every administrative, verification, and user status change is logged here in real-time.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase px-2">Filter:</span>
              {[
                { id: 'ALL', label: 'All Logs' },
                { id: 'VERIFICATION', label: 'Verification' },
                { id: 'STATUS_CHANGE', label: 'Status Changes' },
                { id: 'REGISTRATION', label: 'Registrations' },
                { id: 'B2B', label: 'B2B Events' },
                { id: 'BOOKING', label: 'Bookings' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setAuditActionFilter(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                    auditActionFilter === f.id
                      ? 'bg-trust-blue text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-slate-50 text-slate-gray font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="p-4 pl-6">Timestamp</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">Action Type</th>
                    <th className="p-4">Target Entity</th>
                    <th className="p-4 pr-6">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs italic">
                        No audit history log entries match the selected filter query.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 pl-6 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="p-4 font-bold text-trust-blue">
                          {log.actor}
                          <span className="text-[9px] uppercase font-bold text-slate-400 block font-normal">
                            Role: {log.actorRole}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider border ${
                            log.action.includes('APPROVED') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            log.action.includes('REJECTED') || log.action.includes('SUSPENDED') ? 'bg-red-50 text-red-800 border-red-200' :
                            log.action.includes('B2B') ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            log.action.includes('REGISTERED') ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          {log.target}
                        </td>
                        <td className="p-4 pr-6 text-slate-600 leading-snug">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW & VERIFICATION REVIEW MODAL */}
      <AnimatePresence>
        {reviewingProvider && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[32px] p-6 md:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => { setReviewingProvider(null); setIsRejectModalOpen(false); }}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-trust-blue"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <img src={reviewingProvider.image} className="w-16 h-16 rounded-2xl object-cover border-2 border-trust-blue shadow-sm" />
                <div>
                  <h3 className="font-bold text-xl text-trust-blue">{reviewingProvider.name}</h3>
                  <p className="text-xs text-slate-gray font-bold">{reviewingProvider.title} • {reviewingProvider.category}</p>
                  <p className="text-[10px] text-slate-400">License: {reviewingProvider.license}</p>
                </div>
              </div>

              {/* Submitted Mock Documents */}
              <div>
                <h4 className="font-bold text-sm text-trust-blue mb-3">Submitted Verification Documents</h4>
                {reviewingProvider.verificationDocuments && reviewingProvider.verificationDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {reviewingProvider.verificationDocuments.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-trust-blue/10 text-trust-blue flex items-center justify-center font-black text-xs">
                            {doc.docType}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-800">{doc.fileName}</p>
                            <p className="text-[10px] text-slate-400">Uploaded on {doc.uploadedAt} • {doc.fileSize || '1.8 MB'}</p>
                          </div>
                        </div>

                        {/* Mock View Button */}
                        <div className="px-3 py-1.5 bg-white border border-slate-200 text-trust-blue rounded-xl text-xs font-bold flex items-center gap-1">
                          <ExternalLink size={12} /> Preview Document
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-900 rounded-2xl text-xs font-bold text-center">
                    No documents uploaded yet by this provider.
                  </div>
                )}
              </div>

              {/* Rejection Form Input (if Reject tab opened) */}
              {isRejectModalOpen && (
                <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200 space-y-3">
                  <h4 className="font-bold text-xs text-red-900 uppercase">Reason for Rejection (Required)</h4>
                  <textarea
                    rows={3}
                    placeholder="Provide clear reason for rejection (e.g. Document unreadable, Expired license, Invalid Aadhaar)..."
                    value={rejectionReasonInput}
                    onChange={e => setRejectionReasonInput(e.target.value)}
                    className="w-full p-3 bg-white border border-red-300 rounded-xl text-xs font-semibold outline-none focus:border-red-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsRejectModalOpen(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRejectProviderSubmit}
                      className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              {!isRejectModalOpen && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="flex-1 py-3 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs rounded-2xl transition-colors"
                  >
                    Reject Application
                  </button>
                  <button
                    onClick={() => handleApproveProvider(reviewingProvider)}
                    className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-2xl shadow-md transition-colors"
                  >
                    Approve Verification
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER DETAIL MODAL */}
      <AnimatePresence>
        {selectedUserDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-trust-blue"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <img src={selectedUserDetail.avatar} className="w-16 h-16 rounded-full object-cover border-2 border-trust-blue" />
                <div>
                  <h3 className="font-bold text-lg text-trust-blue">{selectedUserDetail.name}</h3>
                  <p className="text-xs text-slate-gray">{selectedUserDetail.email}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-trust-blue/10 text-trust-blue text-[10px] font-extrabold uppercase rounded">
                    Role: {selectedUserDetail.role}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-gray">User ID:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedUserDetail.userId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-gray">Phone:</span>
                  <span className="font-bold text-slate-800">{selectedUserDetail.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-gray">Account Type:</span>
                  <span className="font-bold text-trust-blue">
                    {selectedUserDetail.isBusinessAccount ? '🏢 Enterprise B2B' : 'Standard Personal'}
                  </span>
                </div>
                {selectedUserDetail.isBusinessAccount && selectedUserDetail.businessDetails && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <p className="font-bold text-slate-700">Business: {selectedUserDetail.businessDetails.businessName}</p>
                    <p className="text-[10px] font-mono text-slate-500">GSTIN: {selectedUserDetail.businessDetails.gstin}</p>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-slate-gray">Registered Date:</span>
                  <span className="font-bold text-slate-800">{selectedUserDetail.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-gray">Status:</span>
                  <span className={`font-bold uppercase ${selectedUserDetail.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedUserDetail.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserDetail(null)}
                className="w-full py-3 bg-trust-blue text-white font-bold rounded-2xl text-xs"
              >
                Close Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROVIDER DETAIL MODAL */}
      <AnimatePresence>
        {selectedProviderDetail && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[32px] p-6 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setSelectedProviderDetail(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-trust-blue"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-4">
                <img src={selectedProviderDetail.image} className="w-16 h-16 rounded-full object-cover border-2 border-trust-blue" />
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-lg text-trust-blue">{selectedProviderDetail.name}</h3>
                    {selectedProviderDetail.verified && <ShieldCheck size={16} className="text-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-gray font-bold">{selectedProviderDetail.title} • {selectedProviderDetail.category}</p>
                  <p className="text-[10px] text-slate-400">License: {selectedProviderDetail.license}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                <p className="text-slate-600 leading-relaxed">{selectedProviderDetail.bio}</p>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-trust-blue">
                  <span>Starting Consultation Fee: ₹{selectedProviderDetail.startingPrice}</span>
                  <span>Rating: {selectedProviderDetail.rating}★</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedProviderDetail(null)}
                className="w-full py-3 bg-trust-blue text-white font-bold rounded-2xl text-xs"
              >
                Close Record
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
