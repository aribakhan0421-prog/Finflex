/**
 * @file src/App.tsx
 * @description Master Application Shell and Navigation Orchestrator for FinFlex.
 * Manages top-level state, active user sessions, role-based routing guards,
 * public marketplace visibility filters, and responsive layout shells.
 * 
 * Target Roles: All roles (Customer, Service Provider, Admin).
 * Closely depended on by: main.tsx (application root).
 * 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Calendar, 
  User, 
  MapPin, 
  Search as SearchIcon, 
  Star, 
  ShieldCheck, 
  ChevronRight, 
  MessageSquare, 
  Bell,
  Filter,
  X,
  CheckCircle2,
  Upload,
  ArrowRight,
  Heart,
  Clock,
  History,
  TrendingUp,
  ChevronDown,
  Building2,
  Fingerprint,
  Eye,
  FileText,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Info,
  ExternalLink,
  ShieldAlert,
  Loader2,
  LogOut,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { FREELANCERS, Freelancer, Review } from './data';
import { UserAccount, UserRole, ServiceHistoryItem, BusinessDetails, ProviderProfile } from './types';
import { dbService } from './services/dataService';

import { AuthScreen } from './components/AuthScreen';
import { HistoryTab } from './components/HistoryTab';
import { MessagingTab } from './components/MessagingTab';
import { AdminDashboard } from './components/AdminDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';

/**
 * Valid top-level navigation tab identifiers.
 */
type Tab = 'home' | 'search' | 'bookings' | 'history' | 'messages' | 'profile' | 'kyc' | 'b2b' | 'hub' | 'admin' | 'provider_dash';

/**
 * Public Visibility Rule Check:
 * Verifies whether a given provider ID is currently eligible for public display.
 * Requires verified=true, verificationStatus='verified', and account status!=='suspended'.
 */
function isExpertVerified(freelancerId: string | number): boolean {
  return dbService.isProviderPubliclyVisible(String(freelancerId));
}

/**
 * Fetches all publicly visible financial service providers from storage
 * and maps them into the Freelancer presentation schema used by discovery cards.
 */
function getPublicFreelancers(): Freelancer[] {
  const publicProviders = dbService.getPublicProviders();
  return publicProviders.map(p => ({
    id: p.providerId.replace('prov_', ''),
    name: p.name,
    title: p.title,
    specialization: p.specialization,
    category: p.category || 'Tax Filing',
    distance: p.distanceMeta || 1.2,
    rating: p.rating || 4.8,
    reviewsCount: p.reviewCount || 10,
    experience: p.experience || 5,
    license: p.license || 'LIC-2026',
    bio: p.bio || '',
    price: p.startingPrice || 1000,
    image: p.image || 'https://picsum.photos/seed/prov/200/200',
    services: p.services || [],
    reviews: p.reviews || []
  }));
}

export default function App() {
  // Current authenticated user session; renders AuthScreen if null
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => dbService.getCurrentSession());
  
  // Active navigation tab identifier
  const [activeTab, setActiveTab] = useState<Tab>('home');
  
  // Drill-down detail view for expert profile cards
  const [selectedFreelancer, setSelectedFreelancer] = useState<Freelancer | null>(null);
  
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [savedExperts, setSavedExperts] = useState<string[]>([]);
  const [accountType, setAccountType] = useState<'personal' | 'business'>(() => currentUser?.isBusinessAccount ? 'business' : 'personal');
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>(() => currentUser?.kycStatus || 'none');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  /**
   * Synchronize state and enforce strict role-based routing guards:
   * - Admin accounts automatically land on or stay confined to 'admin', 'history', or 'profile'.
   * - Provider accounts land on 'provider_dash' and cannot navigate to client-only discovery.
   * - User accounts cannot open 'admin' or 'provider_dash'.
   */
  useEffect(() => {
    if (currentUser) {
      setAccountType(currentUser.isBusinessAccount ? 'business' : 'personal');
      setKycStatus(currentUser.kycStatus || 'none');
      
      // Strict role-based routing fix to avoid stale dashboard view on role switch
      if (currentUser.role === 'admin') {
        if (!['admin', 'history', 'profile'].includes(activeTab)) {
          setActiveTab('admin');
        }
      } else if (currentUser.role === 'provider') {
        if (!['provider_dash', 'history', 'messages', 'kyc', 'profile'].includes(activeTab)) {
          setActiveTab('provider_dash');
        }
      } else if (currentUser.role === 'user') {
        if (['admin', 'provider_dash'].includes(activeTab)) {
          setActiveTab('home');
        }
      }
    }
  }, [currentUser?.userId, currentUser?.role, currentUser?.isBusinessAccount, currentUser?.kycStatus]);


  /**
   * Clears the active user session and resets application navigation state.
   */
  const handleSignOut = () => {
    dbService.setSession(null);
    setCurrentUser(null);
    setActiveTab('home');
    setActiveThreadId(null);
    setSelectedFreelancer(null);
    toast.info("Signed out successfully.");
  };

  /**
   * Reverts current account from Enterprise B2B mode back to standard personal mode.
   */
  const handleDeactivateB2B = () => {
    if (!currentUser) return;
    const updatedUser = dbService.deactivateBusinessAccount(currentUser.userId);
    setCurrentUser(updatedUser);
    setAccountType('personal');
    setIsDeactivateModalOpen(false);
    toast.info("Business Account Deactivated", {
      description: "Reverted to personal account workspace. You can reactivate anytime.",
      icon: <Building2 className="text-slate-600" />
    });
  };

  const toggleSaveExpert = (id: string) => {
    setSavedExperts(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
    const isSaving = !savedExperts.includes(id);
    toast(isSaving ? "Expert Saved" : "Expert Removed", {
      description: isSaving ? "You can find them in your profile." : "Removed from your saved list.",
      icon: <Heart size={16} className={isSaving ? "text-red-500 fill-red-500" : ""} />
    });
  };

  const handleSelectCategoryFromHome = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setActiveTab('search');
    toast.info(`Filtered experts by category: ${categoryName}`);
  };

  /**
   * Activates corporate Enterprise B2B mode, saving GSTIN, CIN, and business entity metadata.
   */
  const handleActivateB2B = (details: any) => {
    if (!currentUser) return;
    const bDetails: BusinessDetails = {
      companyName: details.companyName,
      businessName: details.companyName,
      gstin: details.gstin,
      cin: details.cin,
      orgType: details.orgType,
      turnover: details.turnover,
      businessEmail: currentUser.email,
      businessPhone: currentUser.phone || '+91 98765 43210',
      entityType: details.orgType || 'Private Limited',
      activatedAt: new Date().toLocaleString()
    };
    const updatedUser = dbService.activateBusinessAccount(currentUser.userId, bDetails);
    setCurrentUser(updatedUser);
    setAccountType('business');
    toast.success("Business Account Activated!", {
      description: "Welcome to FinFlex Enterprise B2B Suite.",
      icon: <Building2 className="text-trust-blue" />
    });
  };


  // Start chat with a provider
  const handleStartMessage = (freelancer: Freelancer) => {
    if (!currentUser) return;
    const providerProfile: ProviderProfile = dbService.getProviders().find(p => p.providerId === `prov_${freelancer.id}`) || {
      providerId: `prov_${freelancer.id}`,
      name: freelancer.name,
      title: freelancer.title,
      specialization: freelancer.specialization,
      category: freelancer.category || 'Tax Filing',
      startingPrice: freelancer.price,
      rating: freelancer.rating,
      reviewCount: freelancer.reviewsCount,
      verified: true,
      verificationStatus: 'verified',
      distanceMeta: freelancer.distance,
      experience: freelancer.experience,
      license: freelancer.license,
      bio: freelancer.bio,
      autoReplyEnabled: true,
      image: freelancer.image,
      services: freelancer.services,
      reviews: freelancer.reviews
    };

    const thread = dbService.getOrCreateThread(currentUser, providerProfile);
    setActiveThreadId(thread.threadId);
    setActiveTab('messages');
    setSelectedFreelancer(null);
    toast.success(`Chat opened with ${freelancer.name}`);
  };

  // Book a service directly
  const handleBookService = (freelancer: Freelancer, serviceName?: string, price?: number) => {
    if (!currentUser) return;
    const bookingAmount = price || freelancer.price;
    const category = serviceName || freelancer.specialization;

    dbService.addHistoryRecord({
      userId: currentUser.userId,
      userName: currentUser.name,
      userEmail: currentUser.email,
      providerId: `prov_${freelancer.id}`,
      providerName: freelancer.name,
      providerTitle: freelancer.title,
      category,
      serviceDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'in_progress',
      amount: bookingAmount,
      notes: `Service booking created for ${category} with ${freelancer.name}.`,
      detailsRef: {
        location: 'Mumbai, MH (Hyperlocal)',
        invoiceNo: `INV-${Date.now().toString().substring(7)}`,
        paymentMode: 'Direct NetBanking / UPI',
        deliverables: ['Service Confirmation Receipt', 'Compliance Checklist']
      }
    });

    toast.success(`Booking Confirmed with ${freelancer.name}!`, {
      description: `Service '${category}' logged under History.`,
      icon: <CheckCircle2 className="text-success-green" />
    });

    setSelectedFreelancer(null);
    setActiveTab('history');
  };

  // If no user session, render AuthScreen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      <Toaster position="top-center" expand={false} richColors />
      
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-trust-blue text-white h-full overflow-y-auto z-40 p-6 shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            FinFlex
          </h1>
          <div className="flex items-center text-slate-300 text-xs mt-1">
            <MapPin size={12} className="mr-1 text-success-green" />
            <span>Mumbai, MH</span>
          </div>
        </div>

        {/* Sidebar Nav items based on Role */}
        <nav className="flex flex-col gap-2 flex-1">
          {currentUser.role === 'user' && (
            <>
              <SidebarNavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={20} />} label="Home" />
              <SidebarNavButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<Search size={20} />} label="Search Experts" />
              <SidebarNavButton active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')} icon={<Calendar size={20} />} label="My Bookings" />
              <SidebarNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="History" />
              <SidebarNavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20} />} label="Messaging" />
              <div className="my-2 border-t border-white/10 opacity-50 px-4 pt-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Enterprise</span>
              </div>
              <SidebarNavButton active={activeTab === 'b2b'} onClick={() => setActiveTab('b2b')} icon={<Building2 size={20} />} label="B2B Module" />
              <SidebarNavButton active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')} icon={<Fingerprint size={20} />} label="KYC Verifier" />
              <SidebarNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="My Profile" />
            </>
          )}

          {currentUser.role === 'provider' && (
            <>
              <SidebarNavButton active={activeTab === 'provider_dash'} onClick={() => setActiveTab('provider_dash')} icon={<Home size={20} />} label="Provider Console" />
              <SidebarNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="Deliveries History" />
              <SidebarNavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20} />} label="Client Messages" />
              <SidebarNavButton active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')} icon={<Fingerprint size={20} />} label="KYC Verifier" />
              <SidebarNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Provider Profile" />
            </>
          )}

          {currentUser.role === 'admin' && (
            <>
              <SidebarNavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldCheck size={20} />} label="Admin Dashboard" />
              <SidebarNavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="System Audit History" />
              <SidebarNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Admin Profile" />
            </>
          )}
        </nav>

        {/* User Footer Card */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img src={currentUser.avatar || "https://picsum.photos/seed/user/200/200"} className="w-9 h-9 rounded-full border-2 border-white/20 object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate w-28">{currentUser.name}</p>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 bg-success-green/20 text-success-green rounded">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="px-6 py-4 bg-white z-30 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
          <div className="md:hidden flex items-center justify-between w-full">
            <div>
              <h1 className="text-xl font-black text-trust-blue">FinFlex</h1>
              <div className="flex items-center text-slate-gray text-[10px] mt-0.5">
                <MapPin size={10} className="mr-1 text-success-green" />
                <span>Mumbai, MH</span>
              </div>
            </div>

            {/* Mobile Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1"
            >
              <LogOut size={14} />
              <span>Exit</span>
            </button>
          </div>
          
          <div className="flex-1 max-w-2xl hidden md:block">
            {activeTab === 'home' || activeTab === 'search' ? (
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-gray" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search CAs, Tax Experts, GST Advisors in Mumbai..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-trust-blue/10 transition-all"
                />
              </div>
            ) : null}
          </div>

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <button className="p-2.5 rounded-xl bg-slate-100 text-trust-blue hover:bg-slate-200 transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-success-green rounded-full"></span>
            </button>

            <div className="px-3.5 py-2 rounded-xl bg-trust-blue/5 border border-trust-blue/10 text-trust-blue flex items-center gap-2">
              <User size={16} />
              <span className="text-xs font-bold">{currentUser.name}</span>
              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-trust-blue text-white rounded">
                {currentUser.role}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Scrollable */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-32 md:pb-8 max-w-7xl w-full mx-auto no-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <HomeTab 
                key="home" 
                onSelect={setSelectedFreelancer}
                onSelectCategory={handleSelectCategoryFromHome}
                onStartMessage={handleStartMessage}
                onBookService={handleBookService}
              />
            )}

            {activeTab === 'search' && (
              <SearchTab 
                key="search" 
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSelect={setSelectedFreelancer} 
                onOpenFilters={() => setIsFilterModalOpen(true)}
                savedExperts={savedExperts}
                onToggleSave={toggleSaveExpert}
                onStartMessage={handleStartMessage}
                onBookService={handleBookService}
              />
            )}

            {activeTab === 'bookings' && <BookingsTab key="bookings" />}

            {activeTab === 'history' && (
              <HistoryTab 
                key="history" 
                currentUser={currentUser} 
              />
            )}

            {activeTab === 'messages' && (
              <MessagingTab 
                key="messages" 
                currentUser={currentUser}
                activeThreadId={activeThreadId}
              />
            )}

            {activeTab === 'kyc' && (
              <KYCTab 
                key="kyc" 
                currentUser={currentUser}
                onComplete={() => {
                  const updated = dbService.updateUserProfile(currentUser.userId, { kycStatus: 'verified' });
                  setCurrentUser(updated);
                  setKycStatus('verified');
                }} 
              />
            )}

            {activeTab === 'b2b' && (
              <B2BTab 
                key="b2b" 
                currentUser={currentUser}
                accountType={accountType} 
                onActivateBusiness={handleActivateB2B} 
                onRequestDeactivateB2B={() => setIsDeactivateModalOpen(true)}
              />
            )}

            {activeTab === 'hub' && (
              <HubTab 
                key="hub" 
                setActiveTab={setActiveTab} 
                kycStatus={kycStatus}
                userRole={currentUser.role}
              />
            )}

            {activeTab === 'admin' && <AdminDashboard key="admin" />}

            {activeTab === 'provider_dash' && (
              <ProviderDashboard 
                key="provider_dash" 
                currentUser={currentUser} 
                onNavigateTab={(t) => setActiveTab(t as Tab)} 
              />
            )}

            {activeTab === 'profile' && (
              <ProfileTab 
                key="profile" 
                currentUser={currentUser}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                isExpertMode={isExpertMode} 
                setIsExpertMode={setIsExpertMode} 
                kycStatus={kycStatus}
                accountType={accountType}
                onSignOut={handleSignOut}
                onNavigateTab={(t) => setActiveTab(t as Tab)}
                onRequestDeactivateB2B={() => setIsDeactivateModalOpen(true)}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 w-[94%] z-50 pointer-events-none">
          <nav className="w-full h-16 bg-trust-blue rounded-3xl flex items-center justify-around px-2 bottom-nav-shadow pointer-events-auto">
            {currentUser.role === 'user' && (
              <>
                <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={20} />} label="Home" />
                <NavButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={<Search size={20} />} label="Search" />
                <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="History" />
                <NavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20} />} label="Chat" />
                <NavButton active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} icon={<Layers size={20} />} label="Hub" />
              </>
            )}

            {currentUser.role === 'provider' && (
              <>
                <NavButton active={activeTab === 'provider_dash'} onClick={() => setActiveTab('provider_dash')} icon={<Home size={20} />} label="Dashboard" />
                <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="Log" />
                <NavButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20} />} label="Inbox" />
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Profile" />
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<ShieldCheck size={20} />} label="Admin" />
                <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20} />} label="Audit" />
                <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={20} />} label="Profile" />
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Modals & Drawers */}
      <AnimatePresence>
        {selectedFreelancer && (
          <ProfileDrawer 
            freelancer={selectedFreelancer} 
            onClose={() => setSelectedFreelancer(null)} 
            onStartMessage={handleStartMessage}
            onBookService={handleBookService}
          />
        )}
        {isFilterModalOpen && (
          <FilterModal onClose={() => setIsFilterModalOpen(false)} />
        )}

        {/* B2B Deactivation Confirmation Modal */}
        {isDeactivateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <Building2 size={24} />
                  </div>
                  <h3 className="font-extrabold text-lg text-trust-blue">Deactivate Business Account</h3>
                </div>
                <button 
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to deactivate your Business Account? You'll lose access to bulk payouts, vendor management, and corporate workspace features.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivateB2B}
                  className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-red-600/20 transition-all"
                >
                  Confirm Deactivation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB COMPONENTS ---

function SidebarNavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
        active 
          ? 'bg-white text-trust-blue shadow-md' 
          : 'text-slate-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${
        active ? 'text-success-green scale-110' : 'text-white/60 hover:text-white'
      }`}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function HomeTab({ 
  onSelect, 
  onSelectCategory,
  onStartMessage, 
  onBookService 
}: { 
  onSelect: (f: Freelancer) => void;
  onSelectCategory: (categoryName: string) => void;
  onStartMessage: (f: Freelancer) => void;
  onBookService: (f: Freelancer) => void;
  key?: React.Key;
}) {
  const categories = [
    { name: 'Tax Filing', icon: '📄' },
    { name: 'GST Reg', icon: '📊' },
    { name: 'Insurance', icon: '🛡️' },
    { name: 'Investment', icon: '📈' },
    { name: 'Audit', icon: '🔍' },
    { name: 'Loans', icon: '🏦' },
    { name: 'Legal', icon: '⚖️' },
    { name: 'Advisory', icon: '💡' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
    >
      {/* Category Bubbles */}
      <section>
        <h2 className="font-bold text-xl mb-4 text-trust-blue">Categories</h2>
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((cat) => (
            <button 
              key={cat.name} 
              onClick={() => onSelectCategory(cat.name)}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center text-3xl border border-slate-100 group-hover:border-success-green/50 group-hover:shadow-md group-hover:scale-105 transition-all">
                {cat.icon}
              </div>
              <span className="text-xs font-bold text-slate-gray text-center group-hover:text-trust-blue transition-colors">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trending Experts */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-xl text-trust-blue">Trending Experts Near You</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getPublicFreelancers().slice(0, 3).map((f) => (
            <motion.div 
              key={f.id}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-4 mb-4">
                  <img src={f.image} alt={f.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base text-trust-blue">{f.name}</h3>
                      {isExpertVerified(f.id) ? (
                        <ShieldCheck size={16} className="text-amber-500" title="eKYC Verified" />
                      ) : (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded">Unverified</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-gray font-medium">{f.title}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold">{f.rating}</span>
                      <span className="text-[10px] text-slate-gray">({f.reviewsCount} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50 mb-4">
                  <div className="text-xs font-bold text-trust-blue">
                    Starts at ₹{f.price}
                  </div>
                  <div className="text-[10px] font-bold text-success-green bg-success-green/10 px-2.5 py-1 rounded-full">
                    {f.distance}km away
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelect(f)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-trust-blue font-bold text-xs rounded-xl text-center"
                >
                  View
                </button>
                <button
                  onClick={() => onStartMessage(f)}
                  className="py-2.5 bg-trust-blue/10 hover:bg-trust-blue/20 text-trust-blue font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                >
                  <MessageSquare size={12} /> Chat
                </button>
                <button
                  onClick={() => onBookService(f)}
                  className="py-2.5 bg-trust-blue text-white hover:bg-trust-blue/90 font-bold text-xs rounded-xl text-center shadow-md shadow-trust-blue/20"
                >
                  Book
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function SearchTab({ 
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  onSelect, 
  onOpenFilters, 
  savedExperts, 
  onToggleSave,
  onStartMessage,
  onBookService
}: { 
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  onSelect: (f: Freelancer) => void;
  onOpenFilters: () => void;
  savedExperts: string[];
  onToggleSave: (id: string) => void;
  onStartMessage: (f: Freelancer) => void;
  onBookService: (f: Freelancer) => void;
  key?: React.Key;
}) {
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'price'>('distance');
  
  const categoryOptions = ['All', 'Tax Filing', 'GST Reg', 'Insurance', 'Investment', 'Audit', 'Loans', 'Legal', 'Advisory'];

  const publicFreelancers = getPublicFreelancers();
  const filteredFreelancers = publicFreelancers.filter(f => {
    const matchesCategory = selectedCategory === 'All' || 
      f.specialization?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      f.title?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      f.category?.toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesSearch = !searchQuery.trim() || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.specialization.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const sortedFreelancers = [...filteredFreelancers].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'price') return a.price - b.price;
    return 0;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-6"
    >
      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoryOptions.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all ${
              selectedCategory === cat 
                ? 'bg-trust-blue text-white shadow-md' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-xl text-trust-blue">Verified Experts in Mumbai</h2>
          <p className="text-xs text-slate-gray">
            Showing {sortedFreelancers.length} experts {selectedCategory !== 'All' ? `for "${selectedCategory}"` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-slate-gray">Sort:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer text-trust-blue"
            >
              <option value="distance">Nearest First</option>
              <option value="rating">Top Rated</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>
          <button 
            onClick={onOpenFilters}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-trust-blue hover:bg-slate-50 transition-colors"
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {sortedFreelancers.length === 0 ? (
        <div className="bg-white p-12 rounded-[36px] border border-slate-100 text-center space-y-3">
          <SearchIcon size={40} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-trust-blue">No experts found</h3>
          <p className="text-xs text-slate-gray">Try selecting "All" categories or clearing your search term.</p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="px-4 py-2 bg-trust-blue text-white font-bold text-xs rounded-xl"
          >
            Reset Category Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFreelancers.map((f) => (
            <motion.div 
              key={f.id}
              layout
              whileHover={{ y: -4 }}
              className="bg-white rounded-[32px] p-6 flex flex-col justify-between gap-4 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(f.id);
                }}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-50 text-slate-300 hover:text-red-500 transition-colors z-10"
              >
                <Heart size={18} className={savedExperts.includes(f.id) ? "fill-red-500 text-red-500" : ""} />
              </button>

              <div>
                <div className="flex gap-4 mb-3">
                  <img src={f.image} alt={f.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base text-trust-blue">{f.name}</h3>
                      {isExpertVerified(f.id) ? (
                        <ShieldCheck size={16} className="text-amber-500" title="eKYC Verified" />
                      ) : (
                        <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 border border-red-200 rounded">Unverified</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-gray">{f.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{f.specialization}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-bold">{f.rating}</span>
                      <span className="text-[10px] text-slate-gray">({f.reviewsCount})</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-gray line-clamp-2 mb-4 leading-relaxed">{f.bio}</p>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50 mb-4">
                  <span className="text-sm font-bold text-trust-blue">Starts at ₹{f.price}</span>
                  <span className="text-[10px] font-bold text-success-green bg-success-green/10 px-2.5 py-1 rounded-full">{f.distance}km away</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelect(f)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-trust-blue font-bold text-xs rounded-xl text-center"
                >
                  Profile
                </button>
                <button
                  onClick={() => onStartMessage(f)}
                  className="py-2.5 bg-trust-blue/10 hover:bg-trust-blue/20 text-trust-blue font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                >
                  <MessageSquare size={12} /> Chat
                </button>
                <button
                  onClick={() => onBookService(f)}
                  className="py-2.5 bg-trust-blue text-white hover:bg-trust-blue/90 font-bold text-xs rounded-xl text-center shadow-md shadow-trust-blue/20"
                >
                  Book
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function BookingsTab() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-trust-blue">Active Appointments</h2>
      <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm text-center py-12">
        <Calendar size={48} className="mx-auto text-slate-300 mb-3" />
        <h3 className="font-bold text-trust-blue">No upcoming live appointments</h3>
        <p className="text-xs text-slate-gray mt-1">Book an expert from Search or Home to schedule a consultation.</p>
      </div>
    </motion.div>
  );
}

function ProfileDrawer({ 
  freelancer, 
  onClose,
  onStartMessage,
  onBookService 
}: { 
  freelancer: Freelancer;
  onClose: () => void;
  onStartMessage: (f: Freelancer) => void;
  onBookService: (f: Freelancer, serviceName?: string, price?: number) => void;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-lg bg-white h-full shadow-2xl p-6 md:p-8 overflow-y-auto space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 float-right"><X size={20} /></button>
        
        <div className="flex gap-4 items-center pt-4">
          <img src={freelancer.image} className="w-20 h-20 rounded-2xl object-cover shadow-md" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-trust-blue">{freelancer.name}</h2>
              <ShieldCheck className="text-amber-500" size={18} />
            </div>
            <p className="text-xs font-bold text-slate-gray">{freelancer.title}</p>
            <p className="text-[10px] text-slate-400">License: {freelancer.license}</p>
          </div>
        </div>

        <p className="text-xs text-slate-gray leading-relaxed">{freelancer.bio}</p>

        <div>
          <h3 className="font-bold text-sm text-trust-blue mb-3">Offered Services</h3>
          <div className="space-y-2">
            {freelancer.services.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-trust-blue">{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-trust-blue">{s.price}</span>
                  <button
                    onClick={() => onBookService(freelancer, s.name, parseInt(s.price.replace(/[^0-9]/g, '')) || freelancer.price)}
                    className="px-3 py-1 bg-trust-blue text-white rounded-lg text-[10px] font-bold"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={() => onStartMessage(freelancer)}
            className="flex-1 py-3.5 bg-trust-blue/10 text-trust-blue rounded-2xl font-bold text-xs flex items-center justify-center gap-2"
          >
            <MessageSquare size={16} /> Direct Message
          </button>
          <button
            onClick={() => onBookService(freelancer)}
            className="flex-1 py-3.5 bg-trust-blue text-white rounded-2xl font-bold text-xs shadow-lg shadow-trust-blue/20"
          >
            Book Consultation
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FilterModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-[40px] p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-trust-blue">Filters</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>

        <div className="space-y-6 text-xs">
          <div>
            <h3 className="font-bold uppercase text-slate-400 mb-2">Category</h3>
            <div className="flex flex-wrap gap-2">
              {['Chartered Accountant', 'Tax Expert', 'GST Advisor', 'Financial Planner'].map(cat => (
                <button key={cat} className="px-3 py-2 border rounded-xl font-bold text-trust-blue">{cat}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button className="flex-1 py-3 bg-slate-100 text-trust-blue rounded-xl font-bold" onClick={onClose}>Reset</button>
          <button className="flex-1 py-3 bg-trust-blue text-white rounded-xl font-bold" onClick={onClose}>Apply</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function KYCTab({ 
  currentUser,
  onComplete 
}: { 
  currentUser: UserAccount;
  onComplete: () => void;
  key?: React.Key;
}) {
  const [step, setStep] = useState<'intro' | 'documents' | 'selfie' | 'review'>(
    currentUser.kycStatus === 'verified' ? 'review' : 'intro'
  );
  const [docType, setDocType] = useState<'aadhaar' | 'pan' | 'passport' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStart = () => setStep('documents');
  const handleSelectDoc = (type: 'aadhaar' | 'pan' | 'passport') => {
    setDocType(type);
    setStep('selfie');
  };

  const handleComplete = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep('review');
      onComplete();
      toast.success("KYC Verified Successfully!", {
        description: "Your identity documents have been approved.",
        icon: <ShieldCheck className="text-success-green" />
      });
    }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto">
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-bold text-trust-blue">Identity Verification (KYC)</h2>
        {step === 'intro' && (
          <button onClick={handleStart} className="w-full py-4 bg-trust-blue text-white font-bold rounded-2xl">
            Start KYC Verification
          </button>
        )}
        {step === 'documents' && (
          <div className="space-y-3">
            <button onClick={() => handleSelectDoc('aadhaar')} className="w-full p-4 bg-slate-50 text-left font-bold text-trust-blue rounded-2xl">
              🪪 Aadhaar Card
            </button>
            <button onClick={() => handleSelectDoc('pan')} className="w-full p-4 bg-slate-50 text-left font-bold text-trust-blue rounded-2xl">
              💳 PAN Card
            </button>
          </div>
        )}
        {step === 'selfie' && (
          <button onClick={handleComplete} className="w-full py-4 bg-trust-blue text-white font-bold rounded-2xl">
            {isProcessing ? 'Verifying...' : 'Capture Selfie Check'}
          </button>
        )}
        {step === 'review' && (
          <div className="p-6 bg-emerald-50 text-emerald-800 rounded-2xl font-bold text-center flex flex-col items-center gap-2">
            <ShieldCheck size={32} className="text-emerald-600" />
            <p className="text-lg">KYC Verified & Approved</p>
            <p className="text-xs text-emerald-700 font-normal">Your account has full access to FinFlex features and financial services.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function B2BTab({ 
  currentUser,
  accountType, 
  onActivateBusiness,
  onRequestDeactivateB2B
}: { 
  currentUser: UserAccount;
  accountType: 'personal' | 'business';
  onActivateBusiness: (details: any) => void;
  onRequestDeactivateB2B?: () => void;
  key?: React.Key;
}) {
  const [companyName, setCompanyName] = useState(currentUser.businessDetails?.companyName || '');
  const [gstin, setGstin] = useState(currentUser.businessDetails?.gstin || '');
  const [cin, setCin] = useState(currentUser.businessDetails?.cin || '');
  const [orgType, setOrgType] = useState(currentUser.businessDetails?.orgType || 'Private Limited');
  const [turnover, setTurnover] = useState(currentUser.businessDetails?.turnover || '₹50L - ₹2 Cr');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !gstin) {
      toast.error("Please fill in Company Name and GSTIN.");
      return;
    }
    onActivateBusiness({
      companyName,
      gstin,
      cin: cin || `CIN-${Date.now().toString().slice(-6)}`,
      orgType,
      turnover
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {accountType === 'personal' ? (
        <div className="bg-white p-6 md:p-10 rounded-[40px] border border-slate-100 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-trust-blue to-blue-900 text-white p-8 rounded-[32px] shadow-lg">
            <div className="flex items-center gap-3">
              <Building2 size={32} className="text-amber-400" />
              <div>
                <h2 className="text-2xl font-black">Activate B2B Enterprise Account</h2>
                <p className="text-xs text-slate-300 mt-1">Unlock bulk payouts, corporate GST filing, vendor management & spend analytics.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Company / Organization Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Acme Financial Services Pvt Ltd"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">GSTIN Number *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={gstin}
                  onChange={e => setGstin(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold uppercase outline-none focus:border-trust-blue"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Corporate Identification No. (CIN)</label>
                <input 
                  type="text"
                  placeholder="e.g. U72900MH2022PTC123456"
                  value={cin}
                  onChange={e => setCin(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold uppercase outline-none focus:border-trust-blue"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Organization Structure</label>
                <select 
                  value={orgType}
                  onChange={e => setOrgType(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-trust-blue outline-none"
                >
                  <option value="Private Limited">Private Limited (Pvt Ltd)</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="Partnership">Partnership Firm</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                </select>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-trust-blue hover:bg-trust-blue/90 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-trust-blue/20 transition-all flex items-center justify-center gap-2"
            >
              <Building2 size={18} /> Activate Business Account Now
            </button>
          </form>
        </div>
      ) : (
        /* Active Business Account Corporate Workspace Dashboard */
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-trust-blue via-slate-900 to-blue-950 text-white p-8 rounded-[36px] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3">
                <Building2 size={32} className="text-amber-400" />
                <div>
                  <h2 className="text-2xl font-black">{currentUser.businessDetails?.companyName || 'Corporate Enterprise'}</h2>
                  <p className="text-xs text-slate-300">GSTIN: {currentUser.businessDetails?.gstin || '27AAAAA0000A1Z5'} • CIN: {currentUser.businessDetails?.cin || 'U72900MH2022PTC123456'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-right">
                <span className="text-[10px] font-bold uppercase text-slate-300 block">Organization Tier</span>
                <span className="text-xs font-extrabold text-success-green">Enterprise Pro Active</span>
              </div>
              <button
                type="button"
                onClick={() => onRequestDeactivateB2B?.()}
                className="px-4 py-2 bg-red-600/30 hover:bg-red-600 text-white font-extrabold text-xs rounded-2xl border border-red-400/40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <X size={14} /> Deactivate B2B
              </button>
            </div>
          </div>

          {/* Corporate Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Corporate Wallet Balance</p>
              <h3 className="text-2xl font-black text-trust-blue mt-1">₹4,85,000</h3>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Monthly Payout Limit</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">₹50,00,000</h3>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Linked Vendors & CAs</p>
              <h3 className="text-2xl font-black text-trust-blue mt-1">14 Accounts</h3>
            </div>
            <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Pending Invoice Audits</p>
              <h3 className="text-2xl font-black text-amber-500 mt-1">2 Pending</h3>
            </div>
          </div>

          {/* Corporate Workflows */}
          <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-xl text-trust-blue">Business Workflows & Bulk Payouts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => toast.success("Bulk Payout Wizard opened.", { description: "14 vendor payouts queued for processing." })}
                className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-trust-blue text-white flex items-center justify-center mb-3">
                  <ArrowUpRight size={20} />
                </div>
                <h4 className="font-bold text-sm text-trust-blue">Initiate Bulk Payouts</h4>
                <p className="text-[10px] text-slate-gray mt-1">Pay CAs, Auditors, and consultants in 1 click.</p>
              </button>

              <button 
                onClick={() => toast.info("Corporate GST Credit Report generated.")}
                className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3">
                  <FileText size={20} />
                </div>
                <h4 className="font-bold text-sm text-trust-blue">GST Input Tax Credit</h4>
                <p className="text-[10px] text-slate-gray mt-1">Auto-reconcile GSTR-2B with vendor invoices.</p>
              </button>

              <button 
                onClick={() => toast.info("Corporate Limits configuration modal.")}
                className="p-5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-bold text-sm text-trust-blue">Role-Based Approvals</h4>
                <p className="text-[10px] text-slate-gray mt-1">Configure Dual-signoff for payments over ₹1 Lakh.</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function HubTab({ 
  setActiveTab, 
  kycStatus, 
  userRole 
}: { 
  setActiveTab: (t: Tab) => void, 
  kycStatus: string, 
  userRole: UserRole,
  key?: React.Key 
}) {
  const services = [
    ...(userRole === 'user' ? [
      { id: 'kyc', label: 'KYC Verifier', icon: <Fingerprint size={28} />, desc: kycStatus === 'verified' ? 'Verified' : 'Required', active: true, color: 'text-amber-500 bg-amber-50' },
      { id: 'b2b', label: 'B2B Module', icon: <Building2 size={28} />, desc: 'Enterprise tools', active: true, color: 'text-blue-600 bg-blue-50' },
    ] : []),
    { id: 'history', label: 'History Log', icon: <History size={28} />, desc: 'Past bookings', active: true, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'messages', label: 'Direct Messaging', icon: <MessageSquare size={28} />, desc: 'Inbox & chats', active: true, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-trust-blue">All Hub Services</h2>
      <div className="grid grid-cols-2 gap-4">
        {services.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveTab(s.id as Tab)}
            className="p-5 bg-white border rounded-[28px] text-left flex flex-col items-start gap-3 shadow-sm hover:shadow-md"
          >
            <div className={`p-3 rounded-2xl ${s.color}`}>{s.icon}</div>
            <div>
              <h4 className="font-bold text-sm text-trust-blue">{s.label}</h4>
              <p className="text-[10px] text-slate-gray">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileTab({ 
  currentUser,
  onUpdateUser,
  isExpertMode, 
  setIsExpertMode, 
  kycStatus, 
  accountType,
  onSignOut,
  onNavigateTab,
  onRequestDeactivateB2B
}: { 
  currentUser: UserAccount;
  onUpdateUser: (u: UserAccount) => void;
  isExpertMode: boolean;
  setIsExpertMode: (v: boolean) => void;
  kycStatus: string;
  accountType: 'personal' | 'business';
  onSignOut: () => void;
  onNavigateTab: (t: string) => void;
  onRequestDeactivateB2B?: () => void;
  key?: React.Key;
}) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '+91 98765 43210');
  const [address, setAddress] = useState(currentUser.address || 'Bandra West, Mumbai, MH');

  // Provider specific fields
  const provider = dbService.getProviders().find(p => p.providerId === currentUser.userId);
  const [title, setTitle] = useState(provider?.title || 'Chartered Accountant & Tax Specialist');
  const [specialization, setSpecialization] = useState(provider?.specialization || 'Tax & Advisory');
  const [startingPrice, setStartingPrice] = useState(provider?.startingPrice || 1500);
  const [license, setLicense] = useState(provider?.license || 'ICAI-2020-0012');
  const [bio, setBio] = useState(provider?.bio || 'Certified financial consultant offering expert guidance on FinFlex.');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUser.role === 'provider') {
        dbService.updateProviderProfile(currentUser.userId, {
          name,
          title,
          specialization,
          startingPrice: Number(startingPrice),
          license,
          bio
        });
      }
      const updated = dbService.updateUserProfile(currentUser.userId, {
        name,
        email,
        phone,
        address
      });
      onUpdateUser(updated);
      toast.success("Profile Details Updated Successfully!");
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      {/* Role Header Card */}
      <div className="bg-white p-8 rounded-[36px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <img src={currentUser.avatar || "https://picsum.photos/seed/user/200/200"} className="w-24 h-24 rounded-full object-cover border-4 border-trust-blue/20 shadow-md" />
        <div className="text-center md:text-left flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h2 className="text-2xl font-black text-trust-blue">{currentUser.name}</h2>
            <span className="px-3 py-1 bg-trust-blue text-white text-[10px] font-black rounded-full uppercase tracking-wider">
              {currentUser.role} Account
            </span>
          </div>
          <p className="text-xs text-slate-gray">{currentUser.email}</p>
          
          {/* Strict Role-Based Visibility for Profile Tab Sections */}
          {currentUser.role === 'user' && (
            <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
              {/* KYC Indicator */}
              {kycStatus === 'verified' ? (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-600" /> KYC Verified
                </span>
              ) : (
                <button onClick={() => onNavigateTab('kyc')} className="px-2.5 py-1 bg-amber-50 text-amber-900 text-[10px] font-bold rounded-full border border-amber-200 hover:bg-amber-100 transition-colors">
                  ⚠️ KYC Pending - Verify Now
                </button>
              )}

              {/* B2B Account Indicator */}
              {accountType === 'business' ? (
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-full border border-blue-200 flex items-center gap-1">
                    <Building2 size={12} className="text-blue-600" /> Enterprise B2B Active
                  </span>
                  <button 
                    type="button"
                    onClick={() => onRequestDeactivateB2B?.()}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-full border border-red-200 transition-colors"
                  >
                    Deactivate
                  </button>
                </div>
              ) : (
                <button onClick={() => onNavigateTab('b2b')} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full hover:bg-slate-200 transition-colors">
                  🏢 Activate Business Account
                </button>
              )}
            </div>
          )}

          {currentUser.role === 'admin' && (
            <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 bg-purple-50 text-purple-900 text-[10px] font-extrabold rounded-full border border-purple-200 flex items-center gap-1">
                <ShieldCheck size={12} className="text-purple-600" /> Superadmin Clearance • Created {currentUser.createdAt}
              </span>
            </div>
          )}

          {currentUser.role === 'provider' && (
            <div className="pt-2 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-900 text-[10px] font-extrabold rounded-full border border-emerald-200 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" /> Service Provider Account • Member since {currentUser.createdAt}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onSignOut}
          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center gap-1.5 shrink-0 transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* Editable Profile Form */}
      <div className="bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-sm space-y-6">
        <h3 className="font-bold text-xl text-trust-blue">
          {currentUser.role === 'provider' ? 'Provider Profile & Rates' : currentUser.role === 'admin' ? 'Administrator Controls' : 'Personal Profile Settings'}
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Contact Phone</label>
              <input 
                type="text" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Location Address</label>
              <input 
                type="text" 
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
              />
            </div>

            {currentUser.role === 'provider' && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Professional Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Starting Consultation Fee (₹)</label>
                  <input 
                    type="number" 
                    value={startingPrice}
                    onChange={e => setStartingPrice(Number(e.target.value))}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Professional License ID</label>
                  <input 
                    type="text" 
                    value={license}
                    onChange={e => setLicense(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Specialization Category</label>
                  <select
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-trust-blue outline-none"
                  >
                    <option value="Tax Filing">Tax Filing</option>
                    <option value="GST Reg">GST Reg</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Investment">Investment</option>
                    <option value="Audit">Audit</option>
                    <option value="Loans">Loans</option>
                    <option value="Legal">Legal</option>
                    <option value="Advisory">Advisory</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 block mb-1">Provider Biography</label>
                  <textarea 
                    rows={3}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:border-trust-blue"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-trust-blue hover:bg-[#071a2e] text-white font-extrabold text-xs md:text-sm rounded-2xl shadow-lg transition-all"
          >
            Save Profile Changes
          </button>
        </form>
      </div>
    </motion.div>
  );
}
