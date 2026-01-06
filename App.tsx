import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { BotBuilder } from './components/BotBuilder/BotBuilder';
import { ResellerDashboard } from './components/Reseller/ResellerDashboard';
import { MarketingTools } from './components/Marketing/MarketingTools';
import { LeadsCRM } from './components/CRM/LeadsCRM';
import { WebsiteBuilder } from './components/WebsiteBuilder/WebsiteBuilder';
import { Marketplace } from './components/Marketplace/Marketplace';
import { PhoneAgent } from './components/PhoneAgent/PhoneAgent';
import { ChatLogs } from './components/Chat/ChatLogs';
import { Billing } from './components/Billing/Billing';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Settings } from './components/Settings/Settings';
import { LandingPage } from './components/Landing/LandingPage';
import { PartnerProgramPage } from './components/Landing/PartnerProgramPage';
import { PartnerSignup } from './components/Auth/PartnerSignup';
import { FullPageChat } from './components/Chat/FullPageChat';
import { AuthModal } from './components/Auth/AuthModal';
import { AboutPage } from './components/Landing/pages/AboutPage';
import { BlogPage } from './components/Landing/pages/BlogPage';
import { ArticlePage } from './components/Landing/pages/ArticlePage';
import { CareersPage } from './components/Landing/pages/CareersPage';
import { ContactPage } from './components/Landing/pages/ContactPage';
import { PrivacyPage } from './components/Landing/pages/PrivacyPage';
import { FeaturesPage } from './components/Landing/pages/FeaturesPage';
import { User, UserRole, PlanType, Bot as BotType, ResellerStats, Lead, Conversation } from './types';
import { PLANS, MOCK_ANALYTICS_DATA } from './constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MessageSquare, Users, TrendingUp, DollarSign, Bell, Bot as BotIcon, ArrowRight, Menu, CheckCircle, Flame, Loader } from 'lucide-react';
import { dbService } from './services/dbService';
import { useAuth } from './hooks/useAuth';

const INITIAL_CHAT_LOGS: Conversation[] = []; 
const INITIAL_RESELLER_STATS: ResellerStats = {
  totalClients: 0,
  totalRevenue: 0,
  commissionRate: 0.20,
  pendingPayout: 0,
};

function App() {
  const { user: authUser, isLoading: authLoading, isAuthenticated: replitAuthenticated, logout: replitLogout } = useAuth();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [showPartnerPage, setShowPartnerPage] = useState(false);
  const [showPartnerSignup, setShowPartnerSignup] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [bots, setBots] = useState<BotType[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<Conversation[]>(INITIAL_CHAT_LOGS);
  
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [notification, setNotification] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && replitAuthenticated && authUser) {
      const mappedUser: User = {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        role: (authUser.role as UserRole) || UserRole.OWNER,
        plan: (authUser.plan as PlanType) || PlanType.FREE,
        companyName: authUser.companyName || '',
        avatarUrl: authUser.avatarUrl ?? undefined,
        resellerCode: authUser.resellerCode ?? undefined,
        status: (authUser.status as 'Active' | 'Suspended' | 'Pending' | undefined) ?? undefined,
        createdAt: authUser.createdAt?.toString() || new Date().toISOString(),
      };

      setUser(mappedUser);
      setIsLoggedIn(true);

      if (mappedUser.role === UserRole.ADMIN) {
        setCurrentView('admin');
      }
    }
  }, [authLoading, replitAuthenticated, authUser]);

  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/chat/')) {
     const botId = currentPath.split('/')[2];
     return <FullPageChat botId={botId} />;
  }
  if (currentPath === '/about') {
     return <AboutPage />;
  }
  if (currentPath === '/blog') {
     return <BlogPage />;
  }
  if (currentPath.startsWith('/blog/')) {
     const articleId = parseInt(currentPath.split('/')[2] || '1', 10);
     return <ArticlePage articleId={articleId} />;
  }
  if (currentPath === '/careers') {
     return <CareersPage />;
  }
  if (currentPath === '/contact') {
     return <ContactPage />;
  }
  if (currentPath === '/privacy') {
     return <PrivacyPage />;
  }
  if (currentPath === '/features') {
     return <FeaturesPage />;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('bmb_ref_code', refCode);
      console.log('Referral captured:', refCode);
    }
    
    setTimeout(() => setIsBooting(false), 500);
  }, []);

  useEffect(() => {
    const unsubscribeBots = dbService.subscribeToBots((updatedBots) => {
       setBots(updatedBots);
    });

    const unsubscribeLeads = dbService.subscribeToLeads((updatedLeads) => {
       setLeads(updatedLeads);
    });

    return () => {
      unsubscribeBots();
      unsubscribeLeads();
    };
  }, []);

  const totalConversations = bots.reduce((acc, bot) => acc + bot.conversationsCount, 0);
  const totalLeads = leads.length;
  const estSavings = totalConversations * 5; 
  const avgResponseTime = "0.8s";

  const handleAdminLogin = () => {
      openAuth('login');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setCurrentView('dashboard');
    setBots([]);
    setLeads([]);
    setChatLogs([]);
    setNotification("Logged out successfully");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleManualAuth = (email: string, name?: string, companyName?: string) => {
      const newUser: User = {
          id: 'demo-user-' + Date.now(),
          name: name || email.split('@')[0],
          email: email,
          role: UserRole.OWNER,
          plan: PlanType.FREE,
          companyName: companyName || 'Demo Company',
          createdAt: new Date().toISOString()
      };

      setUser(newUser);
      setIsLoggedIn(true);
      setAuthModalOpen(false);

      setNotification("Logged in successfully");
      setTimeout(() => setNotification(null), 3000);
  };

  const handlePartnerSignup = async (data: any) => {
    const resellerCode = data.companyName.substring(0,3).toUpperCase() + Date.now().toString().slice(-4);
    const newPartner = { 
      email: data.email,
      name: data.name,
      role: UserRole.OWNER,
      plan: PlanType.FREE,
      companyName: data.companyName,
      resellerCode: resellerCode,
      status: 'Pending' as const
    };
    
    const savedPartner = await dbService.createUser(newPartner as any);
    
    if (savedPartner) {
      setUser(savedPartner as any);
      setIsLoggedIn(true);
      setShowPartnerSignup(false);
      setShowPartnerPage(false);
      setCurrentView('dashboard');
      setNotification("Partner application submitted! Your account is pending approval. You'll receive full partner access once approved.");
      setTimeout(() => setNotification(null), 5000);
    } else {
      setNotification("Failed to submit application. The email may already be in use.");
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleInstallTemplate = (template: any) => {
    const newBot: BotType = {
      id: `b${Date.now()}`,
      name: template.name,
      type: template.category === 'All' ? 'Custom' : template.category,
      systemPrompt: `You are a helpful assistant specialized in ${template.category}. ${template.description}. Act professionally and help the user achieve their goals.`,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      knowledgeBase: [],
      active: true,
      conversationsCount: 0,
      themeColor: ['#1e3a8a', '#be123c', '#047857', '#d97706'][Math.floor(Math.random() * 4)],
      maxMessages: 20,
      randomizeIdentity: true
    };
    
    dbService.saveBot(newBot);
    
    setNotification(`Installed "${template.name}" successfully!`);
    setTimeout(() => setNotification(null), 3000);
    setCurrentView('bots');
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    dbService.saveLead(updatedLead);
  };

  const handleLeadDetected = (email: string) => {
    const newLead: Lead = {
      id: Date.now().toString(),
      name: 'Website Visitor',
      email: email,
      score: 85,
      status: 'New',
      sourceBotId: 'test-bot',
      createdAt: new Date().toISOString()
    };
    dbService.saveLead(newLead);
    setNotification("New Hot Lead Detected from Chat! 🔥");
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveBot = async (bot: BotType) => {
     try {
       const savedBot = await dbService.saveBot(bot);
       // Update the bots state immediately with the server-generated ID
       setBots(prevBots => {
         const existingIndex = prevBots.findIndex(b => b.id === bot.id || b.id === savedBot.id);
         if (existingIndex >= 0) {
           const updated = [...prevBots];
           updated[existingIndex] = savedBot;
           return updated;
         }
         return [...prevBots, savedBot];
       });
       setNotification("Bot saved successfully!");
     } catch (error) {
       setNotification("Failed to save bot. Please try again.");
     }
     setTimeout(() => setNotification(null), 2000);
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  if (isBooting) {
      return (
        <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center animate-fade-in">
                <div className="w-20 h-20 bg-blue-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50 mb-6 animate-bounce-slow">
                    <BotIcon size={48} className="text-white" />
                </div>
                <h1 className="text-white font-bold text-2xl tracking-widest uppercase mb-2">BuildMyBot</h1>
                <p className="text-blue-400 text-xs font-mono tracking-wide mb-6">INITIALIZING SYSTEM...</p>
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                </div>
            </div>
        </div>
      );
  }

  if (!isLoggedIn || !user) {
    if (showPartnerSignup) {
        return <PartnerSignup onBack={() => setShowPartnerSignup(false)} onComplete={handlePartnerSignup} />;
    }
    if (showPartnerPage) {
      return <PartnerProgramPage onBack={() => setShowPartnerPage(false)} onLogin={() => openAuth('login')} onSignup={() => setShowPartnerSignup(true)} />;
    }
    return (
      <>
        <LandingPage 
          onLogin={() => openAuth('login')} 
          onNavigateToPartner={() => setShowPartnerPage(true)} 
          onAdminLogin={handleAdminLogin} 
        />
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          defaultMode={authMode} 
          onLoginSuccess={handleManualAuth}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        role={user.role} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        user={user}
        usage={totalConversations}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col h-full md:ml-64">
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
           <div className="flex items-center gap-2 font-bold text-slate-800">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center border border-blue-800 shadow-lg shadow-blue-900/50 text-white">
                <BotIcon size={20} />
              </div>
              BuildMyBot
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
              <Menu size={24} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {notification && (
              <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-lg shadow-xl animate-bounce-slow flex items-center gap-3">
                 <Bell size={18} className="text-blue-400" /> {notification}
              </div>
          )}

          {currentView === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
               <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-slate-500">Welcome back, {user.name.split(' ')[0]}.</p>
                  </div>
                  <button onClick={() => setCurrentView('bots')} className="bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-950 transition">
                    + Create New Bot
                  </button>
               </div>
               
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MessageSquare size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Total Chats</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{totalConversations}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Leads Captured</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{totalLeads}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Est. Savings</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">${estSavings}</p>
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={18}/></div>
                        <span className="text-sm font-medium text-slate-500">Avg. Response</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">{avgResponseTime}</p>
                   </div>
               </div>
               
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                     <h3 className="font-bold text-slate-800 mb-4">Conversation Volume</h3>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_ANALYTICS_DATA}>
                          <defs>
                            <linearGradient id="colorConvos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip />
                          <Area type="monotone" dataKey="conversations" stroke="#1e3a8a" strokeWidth={3} fillOpacity={1} fill="url(#colorConvos)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
                      <h3 className="font-bold text-slate-800 mb-4">Lead Sources</h3>
                      <div className="flex-1 flex items-center justify-center">
                         <div className="text-center space-y-2">
                            <div className="text-4xl font-bold text-blue-900">82%</div>
                            <p className="text-sm text-slate-500">from Sales Bot</p>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                               <div className="bg-blue-900 h-full w-[82%]"></div>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {currentView === 'bots' && <BotBuilder 
              bots={bots} 
              onSave={handleSaveBot} 
              customDomain={user.customDomain} 
              onLeadDetected={handleLeadDetected} 
          />}
          
          {currentView === 'reseller' && <ResellerDashboard user={user} stats={INITIAL_RESELLER_STATS} />}
          
          {currentView === 'marketing' && <MarketingTools />}
          
          {currentView === 'leads' && <LeadsCRM leads={leads} onUpdateLead={handleUpdateLead} />}
          
          {currentView === 'website' && <WebsiteBuilder />}
          
          {currentView === 'marketplace' && <Marketplace onInstall={handleInstallTemplate} />}
          
          {currentView === 'phone' && <PhoneAgent user={user} onUpdate={(u) => { setUser(u); dbService.saveUserProfile(u); }} />}
          
          {currentView === 'chat-logs' && <ChatLogs conversations={chatLogs} />}
          
          {currentView === 'billing' && <Billing user={user} />}
          
          {currentView === 'admin' && <AdminDashboard />}
          
          {currentView === 'settings' && <Settings user={user} onUpdateUser={(u) => { setUser(u); dbService.saveUserProfile(u); }} />}
          
        </div>
      </main>
    </div>
  );
}

export default App;
