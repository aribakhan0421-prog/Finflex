/**
 * @file src/components/HistoryTab.tsx
 * @description Bidirectional Financial Consultation and Engagement History Ledger.
 * Dynamically pivots presentation based on current role:
 * - Customers view hired consultants, deliverables, and invoices.
 * - Providers view client engagements, service status, and earned consulting fees.
 * 
 * Target Roles: Customer and Provider.
 * Closely depended on by: App.tsx (rendered under 'history' tab).
 */

import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText, 
  ChevronRight, 
  X, 
  Calendar, 
  MapPin, 
  User, 
  Briefcase 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceHistoryItem, ServiceStatus, UserAccount } from '../types';
import { dbService } from '../services/dataService';

/**
 * Component props for HistoryTab.
 */
interface HistoryTabProps {
  /** Currently logged-in user account for role and ID scoping */
  currentUser: UserAccount;
  key?: React.Key;
}

/**
 * Engagement History & Invoicing Ledger Component
 */
export function HistoryTab({ currentUser }: HistoryTabProps) {
  const isProvider = currentUser.role === 'provider';
  
  // Role-aware initial data fetch:
  // If provider: queries engagements where providerId matches currentUser.userId.
  // If customer: queries engagements where userId matches currentUser.userId.
  const initialHistory = isProvider 
    ? dbService.getHistory(undefined, currentUser.userId)
    : dbService.getHistory(currentUser.userId, undefined);

  const [historyItems, setHistoryItems] = useState<ServiceHistoryItem[]>(initialHistory);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_high'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItemDetails, setActiveItemDetails] = useState<ServiceHistoryItem | null>(null);

  // Available service categories for facet filtering
  const categories = ['all', 'Tax Filing', 'GST Registration', 'Investment Plans', 'Insurance', 'Tax Litigation'];

  // Multi-attribute filter & sort computation
  const filteredItems = historyItems.filter(item => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const targetName = isProvider ? item.userName : item.providerName;
    const matchesSearch = 
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      targetName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
    if (sortBy === 'oldest') return new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime();
    if (sortBy === 'amount_high') return b.amount - a.amount;
    return 0;
  });


  const getStatusBadge = (status: ServiceStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Clock size={12} /> In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1">
            <AlertCircle size={12} /> Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-full flex items-center gap-1">
            <XCircle size={12} /> Cancelled
          </span>
        );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-trust-blue flex items-center gap-2">
            <History className="text-success-green" size={28} />
            {isProvider ? 'Services Delivered History' : 'Service Engagement History'}
          </h2>
          <p className="text-slate-gray text-xs md:text-sm mt-1">
            {isProvider 
              ? 'Complete chronological record of financial and tax services delivered to your clients.'
              : 'Chronological log of all expert consultations and service bookings.'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={isProvider ? "Search by client or service name..." : "Search by expert or service name..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-trust-blue"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-trust-blue outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-gray uppercase tracking-widest mr-2">Filter Status:</span>
          {['all', 'completed', 'in_progress', 'pending', 'cancelled'].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${selectedStatus === st ? 'bg-trust-blue text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100">
            <History size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-trust-blue">No service records found</h3>
            <p className="text-xs text-slate-gray mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <motion.div
              key={item.historyId}
              whileHover={{ y: -2 }}
              className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-trust-blue/5 border border-trust-blue/10 flex items-center justify-center text-trust-blue shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-trust-blue">{item.category}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-xs font-medium text-slate-gray mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-700">
                      {isProvider ? `Client: ${item.userName}` : `Provider: ${item.providerName} (${item.providerTitle})`}
                    </span>
                    {!isProvider && !dbService.isProviderPubliclyVisible(item.providerId) && (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200 text-[9px] font-extrabold rounded">
                        Currently Unavailable
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {item.serviceDate}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-1">{item.notes}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fee Charged</p>
                  <p className="text-lg font-extrabold text-trust-blue">₹{item.amount.toLocaleString('en-IN')}</p>
                </div>

                <button
                  onClick={() => setActiveItemDetails(item)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-trust-blue hover:text-white text-trust-blue text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
                >
                  <span>View Details</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {activeItemDetails && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-[32px] p-6 md:p-8 shadow-2xl relative space-y-6"
            >
              <button
                onClick={() => setActiveItemDetails(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 text-slate-400 hover:text-trust-blue transition-colors"
              >
                <X size={20} />
              </button>

              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-trust-blue/10 text-trust-blue rounded">
                    Invoice #{activeItemDetails.detailsRef?.invoiceNo || 'INV-2026-101'}
                  </span>
                  {getStatusBadge(activeItemDetails.status)}
                </div>
                <h3 className="text-2xl font-bold text-trust-blue">{activeItemDetails.category}</h3>
                <p className="text-xs text-slate-gray font-medium">{activeItemDetails.serviceDate}</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-gray font-semibold">Logged Customer:</span>
                    <span className="font-bold text-trust-blue">{activeItemDetails.userName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-gray font-semibold">Service Provider:</span>
                    <div className="text-right">
                      <span className="font-bold text-trust-blue block">{activeItemDetails.providerName} ({activeItemDetails.providerTitle})</span>
                      {!isProvider && !dbService.isProviderPubliclyVisible(activeItemDetails.providerId) && (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          Currently Unavailable (Unverified or Suspended)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-gray font-semibold">Location/Mode:</span>
                    <span className="font-bold text-slate-700">{activeItemDetails.detailsRef?.location || 'Mumbai, MH'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-gray font-semibold">Payment Method:</span>
                    <span className="font-bold text-emerald-600">{activeItemDetails.detailsRef?.paymentMode || 'NetBanking Direct'}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-trust-blue mb-1">Summary Notes:</h4>
                  <p className="text-slate-gray leading-relaxed">{activeItemDetails.notes}</p>
                </div>

                {activeItemDetails.detailsRef?.deliverables && (
                  <div>
                    <h4 className="font-bold text-trust-blue mb-1.5">Deliverables / Compliance Files:</h4>
                    <ul className="space-y-1">
                      {activeItemDetails.detailsRef.deliverables.map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-700 font-medium">
                          <CheckCircle2 size={14} className="text-success-green" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Fee</p>
                  <p className="text-2xl font-black text-trust-blue">₹{activeItemDetails.amount.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => setActiveItemDetails(null)}
                  className="px-6 py-3 bg-trust-blue text-white font-bold rounded-2xl text-xs"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
