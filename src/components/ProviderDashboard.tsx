/**
 * @file src/components/ProviderDashboard.tsx
 * @description Operational portal and practice management dashboard for Service Providers.
 * Houses the professional eKYC document submission and verification review workflow,
 * real-time auto-reply engine configuration, service earnings metrics, and client engagement history.
 * 
 * Target Role: Service Provider (Chartered Accountants, Tax Specialists, Financial Planners).
 * Closely depended on by: App.tsx (rendered when active user is a provider).
 */

import React, { useState } from 'react';
import { 
  Briefcase, 
  Calendar, 
  History as HistoryIcon, 
  MessageSquare, 
  User, 
  Bot, 
  CheckCircle2, 
  Clock, 
  Star, 
  ShieldCheck, 
  TrendingUp, 
  PlusCircle,
  FileCheck,
  UploadCloud,
  FileText,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { UserAccount, ProviderProfile, VerificationDocument } from '../types';
import { dbService } from '../services/dataService';
import { toast } from 'sonner';

/**
 * Component props for ProviderDashboard.
 */
interface ProviderDashboardProps {
  /** Authenticated user account representing the active financial service provider */
  currentUser: UserAccount;
  /** Navigation callback to switch the top-level active tab */
  onNavigateTab: (tab: string) => void;
  key?: React.Key;
}

/**
 * Provider Practice Dashboard Component
 */
export function ProviderDashboard({ currentUser, onNavigateTab }: ProviderDashboardProps) {
  // Synchronized repository of provider profiles
  const [providers, setProviders] = useState<ProviderProfile[]>(dbService.getProviders());
  
  // Resolve or initialize the active provider's profile
  const provider = providers.find(p => p.providerId === currentUser.userId) || {
    providerId: currentUser.userId,
    name: currentUser.name,
    title: 'Financial Consultant',
    specialization: 'Tax & Advisory',
    category: 'Tax Filing',
    startingPrice: 1500,
    rating: 4.9,
    reviewCount: 12,
    verified: false,
    verificationStatus: 'not_submitted' as const,
    verificationDocuments: [],
    distanceMeta: 1.2,
    experience: 6,
    license: 'ICAI-2020-0012',
    bio: 'Certified financial consultant offering expert guidance on FinFlex.',
    autoReplyEnabled: true,
    image: currentUser.avatar || 'https://picsum.photos/seed/user/200/200',
    services: [],
    reviews: []
  };

  // State controlling automatic chatbot replies for client inquiries
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(provider.autoReplyEnabled ?? true);
  
  // Historical client consultations logged for this provider
  const providerHistory = dbService.getHistory(undefined, currentUser.userId);

  // Document upload staging state for eKYC submission
  const [docType, setDocType] = useState<'PAN' | 'Aadhaar' | 'License' | 'GST Certificate' | 'Degree'>('PAN');
  const [docFileName, setDocFileName] = useState('');
  const [attachedDocs, setAttachedDocs] = useState<VerificationDocument[]>(
    provider.verificationDocuments || []
  );

  // Calculate gross revenue from completed client engagements
  const totalEarnings = providerHistory
    .filter(h => h.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  /**
   * Toggles the automated auto-responder bot for client messaging.
   */
  const handleToggleAutoReply = () => {
    const nextVal = !autoReplyEnabled;
    setAutoReplyEnabled(nextVal);
    dbService.toggleProviderAutoReply(currentUser.userId, nextVal);
    toast.success(`Auto-Reply Bot ${nextVal ? 'Activated' : 'Disabled'}`, {
      description: nextVal ? 'The bot will assist incoming client queries.' : 'Auto-reply turned off.'
    });
  };

  /**
   * Appends a new verification document to the staging queue before submission.
   */
  const handleAddDocumentMock = () => {
    const name = docFileName.trim() || `${docType}_Verification_Document.pdf`;
    const newDoc: VerificationDocument = {
      id: `doc_${Date.now()}`,
      docType,
      fileName: name,
      fileSize: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`,
      uploadedAt: new Date().toISOString().split('T')[0]
    };
    setAttachedDocs(prev => [...prev, newDoc]);
    setDocFileName('');
    toast.success(`Added ${docType} document to queue.`);
  };

  /**
   * Removes a document from the staging list.
   */
  const handleRemoveDoc = (id: string) => {
    setAttachedDocs(prev => prev.filter(d => d.id !== id));
  };

  /**
   * Submits staged verification documents to the Superadmin eKYC review queue.
   * Updates provider status to 'pending' and logs audit event.
   */
  const handleSubmitVerification = () => {
    if (attachedDocs.length === 0) {
      toast.error('Please attach at least one verification document (e.g. PAN, License).');
      return;
    }

    try {
      const updated = dbService.submitProviderVerification(currentUser.userId, attachedDocs);
      setProviders(dbService.getProviders());
      toast.success('eKYC Documents Submitted for Review!', {
        description: 'FinFlex administrators will verify your documents shortly.',
        icon: <Clock className="text-amber-500" />
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-trust-blue to-blue-900 text-white p-8 rounded-[36px] border border-slate-100 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={provider.image} className="w-20 h-20 rounded-full object-cover border-4 border-white/20 shadow-md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{provider.name}</h2>
              {provider.verified && <ShieldCheck className="text-amber-400" size={20} />}
            </div>
            <p className="text-slate-300 text-xs font-semibold">{provider.title} • {provider.category || provider.specialization}</p>
            <p className="text-[10px] text-slate-400 mt-1">License: {provider.license}</p>
          </div>
        </div>

        {/* Auto Reply Bot Toggle */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-success-green" />
            <div>
              <p className="text-xs font-bold">Auto-Reply Bot</p>
              <p className="text-[9px] text-slate-300">Respond to client greetings & quotes</p>
            </div>
          </div>

          <button
            onClick={handleToggleAutoReply}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${autoReplyEnabled ? 'bg-success-green' : 'bg-slate-600'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${autoReplyEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Prominent Login Rejection Alert Banner */}
      {provider.verificationStatus === 'rejected' && (
        <div className="bg-red-500 text-white p-5 rounded-[28px] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="shrink-0 text-amber-300 mt-0.5" />
            <div>
              <h3 className="font-extrabold text-sm md:text-base">Document Verification Action Required</h3>
              <p className="text-xs text-red-100 mt-0.5">
                Admin Rejection Reason: <span className="font-bold underline text-white">{provider.rejectionReason || 'Uploaded documents were invalid or incomplete.'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('provider-ekyc-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-white text-red-600 font-extrabold text-xs rounded-xl hover:bg-red-50 transition-colors shrink-0 shadow-sm"
          >
            Re-submit Documents
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Revenue Earned</p>
          <h3 className="text-2xl font-black text-trust-blue mt-1">₹{totalEarnings.toLocaleString('en-IN')}</h3>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Completed Deliveries</p>
          <h3 className="text-2xl font-black text-trust-blue mt-1">
            {providerHistory.filter(h => h.status === 'completed').length}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Average Rating</p>
          <h3 className="text-2xl font-black text-amber-500 mt-1 flex items-center gap-1">
            {provider.rating} <Star size={18} className="fill-amber-400 text-amber-400" />
          </h3>
        </div>

        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Starting Consultation</p>
          <h3 className="text-2xl font-black text-trust-blue mt-1">₹{provider.startingPrice}</h3>
        </div>
      </div>

      {/* PROVIDER VERIFICATION & eKYC SECTION */}
      <div id="provider-ekyc-section" className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="text-trust-blue" size={24} />
              <h3 className="font-extrabold text-xl text-trust-blue">Provider Verification & eKYC</h3>
            </div>
            <p className="text-xs text-slate-gray mt-0.5">
              Upload professional certificates & government IDs for Superadmin verification to get the verified badge.
            </p>
          </div>

          {/* Verification Status Badge */}
          <div>
            {provider.verificationStatus === 'verified' && (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-2xl border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" /> eKYC Verified Provider
              </span>
            )}
            {provider.verificationStatus === 'pending' && (
              <span className="px-3 py-1.5 bg-amber-50 text-amber-900 font-extrabold text-xs rounded-2xl border border-amber-300 flex items-center gap-1.5 animate-pulse">
                <Clock size={16} className="text-amber-600" /> Verification Pending Admin Review
              </span>
            )}
            {provider.verificationStatus === 'rejected' && (
              <span className="px-3 py-1.5 bg-red-50 text-red-800 font-extrabold text-xs rounded-2xl border border-red-200 flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-red-600" /> Verification Rejected
              </span>
            )}
            {(!provider.verificationStatus || provider.verificationStatus === 'not_submitted') && (
              <span className="px-3 py-1.5 bg-slate-100 text-slate-600 font-extrabold text-xs rounded-2xl border border-slate-200">
                Verification Not Submitted
              </span>
            )}
          </div>
        </div>

        {/* Rejection Alert Box */}
        {provider.verificationStatus === 'rejected' && provider.rejectionReason && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1">
            <p className="font-extrabold text-red-900 flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-red-600" /> Admin Rejection Reason:
            </p>
            <p className="text-red-700 font-medium">{provider.rejectionReason}</p>
            <p className="text-[11px] text-slate-500 pt-1">
              Please re-upload corrected documents below and click <strong>Submit for Verification</strong>.
            </p>
          </div>
        )}

        {/* Document Uploader Tool */}
        {provider.verificationStatus !== 'verified' && (
          <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-sm text-trust-blue flex items-center gap-1.5">
              <UploadCloud size={18} className="text-trust-blue" />
              Upload Identity & License Documents
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-gray block mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as any)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-trust-blue outline-none"
                >
                  <option value="PAN">PAN Card</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="License">ICAI / Bar License</option>
                  <option value="GST Certificate">GST Certificate</option>
                  <option value="Degree">Degree / Qualification</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-gray block mb-1">File Name / Description</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. CA_Certificate_2026.pdf"
                    value={docFileName}
                    onChange={e => setDocFileName(e.target.value)}
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-trust-blue"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocumentMock}
                    className="px-4 py-3 bg-trust-blue hover:bg-trust-blue/90 text-white font-bold text-xs rounded-xl shrink-0"
                  >
                    Attach File
                  </button>
                </div>
              </div>
            </div>

            {/* Attached Documents List */}
            {attachedDocs.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Attached Verification Documents ({attachedDocs.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedDocs.map(doc => (
                    <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-trust-blue shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-xs text-slate-800 truncate">{doc.fileName}</p>
                          <p className="text-[9px] text-slate-400">{doc.docType} • {doc.fileSize}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-1 text-slate-400 hover:text-red-500 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-3">
                  <button
                    onClick={handleSubmitVerification}
                    className="w-full py-3.5 bg-trust-blue hover:bg-[#071a2e] text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Submit Documents for Admin Verification
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Currently Uploaded Documents Display for Verified Providers */}
        {provider.verificationStatus === 'verified' && (
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
            <h4 className="font-bold text-xs text-emerald-950">Verified Documents on Record</h4>
            <div className="flex flex-wrap gap-2">
              {provider.verificationDocuments?.map((doc, idx) => (
                <div key={idx} className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{doc.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('history')}
          className="p-5 bg-white border border-slate-100 rounded-[28px] shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-trust-blue/5 text-trust-blue flex items-center justify-center group-hover:scale-105 transition-transform">
            <HistoryIcon size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-trust-blue">Deliveries Log</h4>
            <p className="text-[10px] text-slate-gray">View completed client jobs</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('messages')}
          className="p-5 bg-white border border-slate-100 rounded-[28px] shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <MessageSquare size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-trust-blue">Client Inbox</h4>
            <p className="text-[10px] text-slate-gray">Reply to user inquiries</p>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('profile')}
          className="col-span-2 md:col-span-1 p-5 bg-white border border-slate-100 rounded-[28px] shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <User size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-trust-blue">Provider Profile</h4>
            <p className="text-[10px] text-slate-gray">Manage credentials & rates</p>
          </div>
        </button>
      </div>

      {/* Recent Delivered Services Table */}
      <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-xl text-trust-blue">Recent Client Deliveries</h3>
        <div className="space-y-3">
          {providerHistory.length === 0 ? (
            <p className="text-xs text-slate-gray py-4">No services logged yet.</p>
          ) : (
            providerHistory.slice(0, 5).map(h => (
              <div key={h.historyId} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-trust-blue">{h.category}</h4>
                  <p className="text-xs text-slate-gray">Client: {h.userName} • {h.serviceDate}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-trust-blue">₹{h.amount}</span>
                  <span className="block text-[10px] font-bold uppercase text-emerald-600">{h.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
