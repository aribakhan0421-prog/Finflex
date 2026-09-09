/**
 * @file src/components/AuthScreen.tsx
 * @description Universal Authentication and Onboarding Screen for FinFlex.
 * Provides unified multi-role authentication (Customer, Financial Provider, Superadmin),
 * self-service registration with initial profile creation, role validation, and
 * a pre-configured 1-Click Demo Credential Panel for evaluation.
 * 
 * Target Roles: All user roles (Customer, Provider, Admin).
 * Closely depended on by: App.tsx (rendered when active user session is null).
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Briefcase, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Key,
  Check,
  Copy,
  Sparkles,
  Info
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { dbService } from '../services/dataService';
import { toast } from 'sonner';

/**
 * Component props for AuthScreen.
 */
interface AuthScreenProps {
  /** Callback triggered upon successful login or signup with the active UserAccount */
  onLoginSuccess: (user: UserAccount) => void;
}

export function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  // Authentication mode: existing account login vs new registration
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Selected user role tab ('user' = Customer, 'provider' = CA/Consultant, 'admin' = Superadmin)
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  
  // Form input field state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [specialization, setSpecialization] = useState('Tax Filing');
  const [title, setTitle] = useState('Chartered Accountant');
  const [price, setPrice] = useState('1500');

  // Copy indicator state for clipboard feedback
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form field validation error mapping
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  /**
   * Client-side form validation prior to submission.
   * Enforces non-empty names during registration, standard email regex, and 6-char minimum passwords.
   */
  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (mode === 'signup' && !name.trim()) {
      errs.name = 'Full Name is required';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /**
   * Handles form submission for both Login and Signup modes.
   * Calls dbService.loginUser or dbService.registerUser and synchronizes session state.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (mode === 'login') {
        const user = dbService.loginUser(email, selectedRole, password);
        dbService.setSession(user);
        toast.success(`Welcome back, ${user.name}!`, {
          description: `Logged in as ${user.role.toUpperCase()}`
        });
        onLoginSuccess(user);
      } else {
        const user = dbService.registerUser(name, email, selectedRole, password, {
          title,
          specialization,
          price: Number(price) || 1500
        });
        dbService.setSession(user);
        toast.success(`Account created successfully!`, {
          description: `Registered as ${user.role.toUpperCase()}`
        });
        onLoginSuccess(user);
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  /**
   * One-Click Instant Demo Authentication Handler.
   * Bypasses manual typing for academic evaluators and testers.
   */
  const handleQuickDemoLogin = (demoEmail: string, role: UserRole, demoPassword?: string) => {
    try {
      const user = dbService.loginUser(demoEmail, role, demoPassword);
      dbService.setSession(user);
      toast.success(`Signed in as Demo ${role.toUpperCase()}!`, {
        description: `User: ${user.name} (${user.email})`
      });
      onLoginSuccess(user);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  /**
   * Injects demo credentials into the form inputs to let the user inspect pre-filled inputs.
   */
  const handleFillDemoCredentials = (demoEmail: string, demoPassword: string, role: UserRole) => {
    setMode('login');
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrors({});
    toast.info(`Auto-filled ${role.toUpperCase()} credentials into form. Click the Submit button below to log in!`);
  };

  /**
   * Copies credential strings to system clipboard with toast feedback.
   */
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };


  return (
    <div className="min-h-screen bg-slate-900/5 py-6 px-4 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-3xl md:rounded-[36px] shadow-2xl border border-slate-200/80 my-auto flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header Branding */}
        <div className="bg-trust-blue text-white p-6 md:p-8 text-center relative shrink-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-success-green/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">FinFlex</h1>
          <p className="text-slate-300 text-xs mt-1">Hyperlocal Financial & Tax Services Marketplace</p>
          
          {/* Mode Tabs */}
          <div className="flex bg-white/10 p-1 rounded-2xl mt-5 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrors({}); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrors({}); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'signup' ? 'bg-white text-trust-blue shadow-md' : 'text-slate-300 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1">
          {/* Role Selection */}
          <div>
            <label className="text-[10px] font-bold text-slate-gray uppercase tracking-widest block mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('user')}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${selectedRole === 'user' ? 'border-trust-blue bg-trust-blue/5 text-trust-blue ring-2 ring-trust-blue/20' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
              >
                <User size={18} className={selectedRole === 'user' ? 'text-trust-blue' : 'text-slate-400'} />
                <div>
                  <p className="text-xs font-bold">User / Customer</p>
                  <p className="text-[9px] text-slate-gray hidden md:block">Seek Expert Help</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('provider')}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${selectedRole === 'provider' ? 'border-trust-blue bg-trust-blue/5 text-trust-blue ring-2 ring-trust-blue/20' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
              >
                <Briefcase size={18} className={selectedRole === 'provider' ? 'text-trust-blue' : 'text-slate-400'} />
                <div>
                  <p className="text-xs font-bold">Provider</p>
                  <p className="text-[9px] text-slate-gray hidden md:block">CA, Tax, Advisory</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  if (mode === 'signup') setMode('login');
                }}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${selectedRole === 'admin' ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
              >
                <ShieldCheck size={18} className={selectedRole === 'admin' ? 'text-amber-600' : 'text-slate-400'} />
                <div>
                  <p className="text-xs font-bold">Admin</p>
                  <p className="text-[9px] text-slate-gray hidden md:block">System Governance</p>
                </div>
              </button>
            </div>
            {mode === 'signup' && selectedRole === 'admin' && (
              <p className="text-[10px] text-amber-700 font-semibold mt-2 flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <AlertCircle size={13} className="shrink-0" /> Admin accounts cannot be created publicly. Switch to Sign In with seeded admin credentials.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-bold text-trust-blue block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ariba Khan"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full p-3.5 bg-slate-50 border rounded-2xl outline-none text-sm font-semibold transition-all ${errors.name ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-trust-blue'}`}
                />
                {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-trust-blue block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none text-sm font-semibold transition-all ${errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-trust-blue'}`}
                />
              </div>
              {errors.email && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-trust-blue block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none text-sm font-semibold transition-all ${errors.password ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-trust-blue'}`}
                />
              </div>
              {errors.password && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.password}</p>}
            </div>

            {/* Provider Specific Sign Up Fields */}
            {mode === 'signup' && selectedRole === 'provider' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-trust-blue block mb-1">Select your Category (Required)</label>
                  <select
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-trust-blue outline-none focus:border-trust-blue"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-gray block mb-1">Profession Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Chartered Accountant"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-gray block mb-1">Starting Consultation Fee (₹)</label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* HIGH-CONTRAST VISIBLE SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                id="auth-submit-btn"
                className="w-full py-4 px-6 bg-trust-blue hover:bg-[#071a2e] active:scale-[0.99] text-white font-extrabold text-sm md:text-base rounded-2xl shadow-xl shadow-trust-blue/25 transition-all flex items-center justify-center gap-2 cursor-pointer ring-offset-2 focus:outline-none focus:ring-2 focus:ring-trust-blue"
              >
                <span>
                  {mode === 'login' 
                    ? `Sign In as ${selectedRole === 'user' ? 'Customer' : selectedRole === 'provider' ? 'Service Provider' : 'Admin'}` 
                    : 'Create Account'
                  }
                </span>
                <ArrowRight size={20} className="stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* DEMO ACCOUNTS HELPER PANEL */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Key size={16} className="text-amber-600 shrink-0" />
                <span>Seeded Demo Credentials</span>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Testing Only
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Use these seeded credentials to log in manually, click <strong className="text-slate-700">Auto-Fill</strong> to test the submit button, or use <strong className="text-slate-700">1-Click Login</strong>.
            </p>

            <div className="space-y-2.5">
              {/* User / Customer Demo Account */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:border-trust-blue/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-800">👤 User / Customer</span>
                    <span className="text-[10px] text-slate-500">(Ariba Khan)</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5 space-x-2">
                    <span>Email: <strong className="text-slate-900">ariba@gmail.com</strong></span>
                    <span>|</span>
                    <span>Password: <strong className="text-slate-900">user123</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials('ariba@gmail.com', 'user123', 'user')}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[10px] font-bold transition-all"
                  >
                    Auto-Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('ariba@gmail.com', 'user', 'user123')}
                    className="px-3 py-1.5 bg-trust-blue text-white hover:bg-trust-blue/90 rounded-xl text-[10px] font-bold shadow-sm transition-all"
                  >
                    1-Click Login
                  </button>
                </div>
              </div>

              {/* Service Provider Demo Account */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 hover:border-trust-blue/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-800">💼 Service Provider</span>
                    <span className="text-[10px] text-slate-500">(Amit Sharma, CA)</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5 space-x-2">
                    <span>Email: <strong className="text-slate-900">amit.sharma@finflex.com</strong></span>
                    <span>|</span>
                    <span>Password: <strong className="text-slate-900">provider123</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials('amit.sharma@finflex.com', 'provider123', 'provider')}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-[10px] font-bold transition-all"
                  >
                    Auto-Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('amit.sharma@finflex.com', 'provider', 'provider123')}
                    className="px-3 py-1.5 bg-trust-blue text-white hover:bg-trust-blue/90 rounded-xl text-[10px] font-bold shadow-sm transition-all"
                  >
                    1-Click Login
                  </button>
                </div>
              </div>

              {/* Administrator Demo Account */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 hover:border-amber-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-amber-950">🛡️ Admin Account</span>
                    <span className="text-[10px] text-amber-800">(FinFlex Governance)</span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-900 mt-0.5 space-x-2">
                    <span>Email: <strong className="text-amber-950">admin@finflex.com</strong></span>
                    <span>|</span>
                    <span>Password: <strong className="text-amber-950">admin123</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials('admin@finflex.com', 'admin123', 'admin')}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[10px] font-bold transition-all"
                  >
                    Auto-Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@finflex.com', 'admin', 'admin123')}
                    className="px-3 py-1.5 bg-amber-700 text-white hover:bg-amber-800 rounded-xl text-[10px] font-bold shadow-sm transition-all"
                  >
                    1-Click Admin Login
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic text-center pt-1">
              ⚠️ Note: Remove or disable this helper panel prior to production deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

