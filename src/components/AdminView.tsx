/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Ticket, ValidationLog, AppSettings } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Lock, Settings, Users, CreditCard, CheckSquare, RefreshCcw, Search, Edit2, 
  Trash2, Plus, Download, Send, CheckCircle, AlertTriangle, XCircle, Info, 
  LogOut, Phone, Mail, User, ShieldAlert, Calendar, MapPin
} from 'lucide-react';

interface AdminViewProps {
  tickets: Ticket[];
  logs: ValidationLog[];
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateTicket: (updatedTicket: Ticket) => void;
  onAddTicket: (ticketData: {
    nom: string;
    prenom: string;
    telephone: string;
    email?: string;
    paymentMethod: 'orange_money' | 'moov_money';
    paymentRef: string;
    amount: number;
    eventDay?: 'jour1' | 'jour2' | 'les_deux';
  }) => Ticket;
  onCancelTicket: (ticketId: string) => void;
}

export default function AdminView({ 
  tickets, 
  logs, 
  settings, 
  onUpdateSettings, 
  onUpdateTicket, 
  onAddTicket,
  onCancelTicket 
}: AdminViewProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active sub-view in Admin: 'dashboard' | 'tickets' | 'settings'
  const [adminTab, setAdminTab] = useState<'dashboard' | 'tickets' | 'settings'>('dashboard');
  const [isChartReady, setIsChartReady] = useState(false);

  React.useEffect(() => {
    setIsChartReady(false);
    if (isAuthenticated && adminTab === 'dashboard') {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, adminTab]);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valide' | 'utilise' | 'annule'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'orange_money' | 'moov_money'>('all');

  // Modal edit states
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatut, setEditStatut] = useState<'valide' | 'utilise' | 'annule'>('valide');
  const [editEventDay, setEditEventDay] = useState<'jour1' | 'jour2' | 'les_deux'>('jour1');

  // Modal add manual state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addNom, setAddNom] = useState('');
  const [addPrenom, setAddPrenom] = useState('');
  const [addTelephone, setAddTelephone] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addOperator, setAddOperator] = useState<'orange_money' | 'moov_money'>('orange_money');
  const [addEventDay, setAddEventDay] = useState<'jour1' | 'jour2' | 'les_deux'>('jour1');

  // Notification success popups
  const [notificationMsg, setNotificationMsg] = useState<{ id: string; msg: string } | null>(null);

  // Password confirmation
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Idrissa2026') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Mot de passe incorrect. Astuce: Idrissa2026');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  // Calculations for stats
  const totalTicketsSold = tickets.length;
  const usedTickets = tickets.filter(t => t.statut === 'utilise').length;
  const cancelledTickets = tickets.filter(t => t.statut === 'annule').length;
  const activeTickets = tickets.filter(t => t.statut === 'valide').length;
  
  // Financial stats
  const totalRevenue = tickets
    .filter(t => t.statut !== 'annule')
    .reduce((sum, t) => sum + t.amount, 0);

  // Payments of today (filtered by current local date prefix 2026-07-06)
  const paymentsToday = tickets
    .filter(t => t.statut !== 'annule' && t.createdAt.startsWith('2026-07-06'))
    .reduce((sum, t) => sum + t.amount, 0);

  // Stats data for Charts
  const paymentMethodData = [
    { name: 'Orange Money', value: tickets.filter(t => t.paymentMethod === 'orange_money' && t.statut !== 'annule').length },
    { name: 'Moov Money', value: tickets.filter(t => t.paymentMethod === 'moov_money' && t.statut !== 'annule').length },
  ];

  const statusDistributionData = [
    { name: 'Actif (Non validé)', value: activeTickets, color: '#34d399' },
    { name: 'Validé (Utilisé)', value: usedTickets, color: '#f59e0b' },
    { name: 'Annulé', value: cancelledTickets, color: '#ef4444' },
  ];

  const hourlyValidationData = [
    { hour: '08h-09h', validations: logs.filter(l => l.timestamp.includes('T08:') || l.timestamp.includes('T09:')).length },
    { hour: '10h-11h', validations: logs.filter(l => l.timestamp.includes('T10:') || l.timestamp.includes('T11:')).length },
    { hour: '12h-13h', validations: logs.filter(l => l.timestamp.includes('T12:') || l.timestamp.includes('T13:')).length },
    { hour: '14h-15h', validations: logs.filter(l => l.timestamp.includes('T14:') || l.timestamp.includes('T15:')).length },
  ];

  const COLORS = ['#F58220', '#009639'];

  // Handle ticket edit submit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    const updated: Ticket = {
      ...editingTicket,
      nom: editNom.toUpperCase(),
      prenom: editPrenom,
      telephone: editTelephone,
      email: editEmail || undefined,
      statut: editStatut,
      eventDay: editEventDay,
      usedAt: editStatut === 'utilise' && !editingTicket.usedAt ? new Date().toISOString() : editingTicket.usedAt
    };

    onUpdateTicket(updated);
    setEditingTicket(null);
    triggerNotification(editingTicket.id, "Informations du ticket modifiées !");
  };

  // Handle manually adding ticket
  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addNom || !addPrenom || !addTelephone) return;

    const randomRef = (addOperator === 'orange_money' ? 'OM-' : 'MM-') + Math.floor(Math.random() * 900000000 + 100000000);
    onAddTicket({
      nom: addNom.toUpperCase(),
      prenom: addPrenom,
      telephone: addTelephone,
      email: addEmail || undefined,
      paymentMethod: addOperator,
      paymentRef: randomRef,
      amount: settings.ticketPrice,
      eventDay: addEventDay
    });

    setShowAddModal(false);
    setAddNom('');
    setAddPrenom('');
    setAddTelephone('');
    setAddEmail('');
    setAddEventDay('jour1');
    triggerNotification("manual-add", "Ticket manuel généré avec succès !");
  };

  // Trigger brief alert banner
  const triggerNotification = (id: string, msg: string) => {
    setNotificationMsg({ id, msg });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4000);
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      t.id.toLowerCase().includes(searchLower) ||
      t.nom.toLowerCase().includes(searchLower) ||
      t.prenom.toLowerCase().includes(searchLower) ||
      t.telephone.includes(searchLower);

    const matchesStatus = statusFilter === 'all' || t.statut === statusFilter;
    const matchesPayment = paymentFilter === 'all' || t.paymentMethod === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handleEditClick = (t: Ticket) => {
    setEditingTicket(t);
    setEditNom(t.nom);
    setEditPrenom(t.prenom);
    setEditTelephone(t.telephone);
    setEditEmail(t.email || '');
    setEditStatut(t.statut);
    setEditEventDay(t.eventDay || 'jour1');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4" id="admin-panel">
      {/* 1. LOGIN SCREEN */}
      {!isAuthenticated ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-6 md:p-8 my-12 hover:shadow-3xl transition-all duration-300" id="admin-login-box">
          <div className="text-center space-y-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mx-auto border border-blue-100">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 font-display">Espace Administration Sécurisé</h2>
            <p className="text-xs text-slate-400 font-bold max-w-xs mx-auto leading-normal">
              Entrez le code administrateur d'accès pour gérer les tickets de l'événement.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" id="form-admin-login">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Mot de Passe Admin</label>
              <input
                type="password"
                required
                placeholder="Saisir le mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                id="input-admin-password"
              />
            </div>

            {loginError && (
              <span className="text-[11px] text-red-500 font-bold block text-center bg-red-50 py-1.5 px-3 rounded-lg" id="admin-login-error">
                {loginError}
              </span>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-black uppercase tracking-wider cursor-pointer shadow shadow-blue-200/50 transition-all"
              id="btn-admin-login-submit"
            >
              Se Connecter
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Mot de passe d'évaluation : <b className="font-mono text-slate-700">Idrissa2026</b>
          </div>
        </div>
      ) : (
        /* 2. AUTHENTICATED WORKSPACE */
        <div className="space-y-8" id="admin-workspace">
          
          {/* Header Dashboard Nav */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-black text-slate-900 leading-tight font-display">Portail Administrateur</h2>
              <p className="text-xs text-slate-500 font-semibold">Gestion globale et statistiques des ventes d'accès aux 48H UV-BF</p>
            </div>

            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Tabs Switchers */}
              <div className="flex bg-slate-150 p-1 rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => setAdminTab('dashboard')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all ${
                    adminTab === 'dashboard' ? 'bg-blue-600 text-white shadow shadow-blue-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  id="admin-tab-dash"
                >
                  Tableau de bord
                </button>
                <button
                  onClick={() => setAdminTab('tickets')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all ${
                    adminTab === 'tickets' ? 'bg-blue-600 text-white shadow shadow-blue-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  id="admin-tab-tickets"
                >
                  Tickets vendus ({tickets.length})
                </button>
                <button
                  onClick={() => setAdminTab('settings')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all ${
                    adminTab === 'settings' ? 'bg-blue-600 text-white shadow shadow-blue-200/50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  id="admin-tab-settings"
                >
                  <Settings className="w-3.5 h-3.5 inline mr-1" />
                  Paramètres
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 px-4 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                id="btn-admin-logout"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                Quitter
              </button>
            </div>
          </div>

          {notificationMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-bounce max-w-md mx-auto justify-center shadow">
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>{notificationMsg.msg}</span>
            </div>
          )}

          {/* TAB A: MAIN DASHBOARD AND STATS */}
          {adminTab === 'dashboard' && (
            <div className="space-y-6" id="view-admin-dashboard">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sold */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">Tickets Vendus</span>
                    <span className="text-2xl font-black text-slate-900 font-display mt-1 block">{totalTicketsSold}</span>
                  </div>
                </div>

                {/* Validations/Used count */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">Tickets Validés</span>
                    <span className="text-2xl font-black text-slate-900 font-display mt-1 block">
                      {usedTickets} <span className="text-xs text-slate-400">({totalTicketsSold > 0 ? Math.round((usedTickets/totalTicketsSold)*100) : 0}%)</span>
                    </span>
                  </div>
                </div>

                {/* Turnover */}
                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-lg shadow-slate-950/10 flex items-center gap-4 hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">Chiffre d'affaires</span>
                    <span className="text-xl font-black text-white font-mono mt-1 block">
                      {totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-400">FCFA</span>
                    </span>
                  </div>
                </div>

                {/* Payments today */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block leading-none">Recettes du Jour</span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                      {paymentsToday.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-400">FCFA</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 1. Status Distribution Doughnut Chart (Col-span-4) */}
                <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-200 font-display">
                    Répartition des Statuts
                  </h3>
                  
                  <div className="h-44 w-full flex items-center justify-center relative my-3">
                    {isChartReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name.includes('Actif') ? '#2563eb' : entry.name.includes('Validé') ? '#10b981' : '#ef4444'} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                    )}
                    <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white flex flex-col items-center justify-center">
                      <span className="text-lg font-black leading-none text-slate-900 font-display">{tickets.length}</span>
                      <span className="text-[8px] text-slate-400 font-black uppercase">Tickets</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    {statusDistributionData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.name.includes('Actif') ? '#2563eb' : item.name.includes('Validé') ? '#10b981' : '#ef4444' }}></span>
                          <span className="text-slate-600">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-950">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Operator Sales Bar Chart (Col-span-4) */}
                <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-200 font-display">
                    Méthodes de Paiement (Actifs)
                  </h3>

                  <div className="h-44 w-full my-3 flex items-center justify-center">
                    {isChartReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            dataKey="value"
                            label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {paymentMethodData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F58220]"></span>
                        <span className="text-slate-600">Orange Money</span>
                      </div>
                      <span className="font-bold text-slate-950">{paymentMethodData[0].value}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#009639]"></span>
                        <span className="text-slate-600">Moov Money</span>
                      </div>
                      <span className="font-bold text-slate-950">{paymentMethodData[1].value}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Hourly Validation Chart (Col-span-4) */}
                <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-200 font-display">
                    Affluence des Entrées (Aujourd'hui)
                  </h3>

                  <div className="h-56 w-full my-3 flex items-center justify-center">
                    {isChartReady ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyValidationData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="hour" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="validations" fill="#2563eb" radius={[4, 4, 0, 0]} name="Entrées validées" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold block text-center uppercase tracking-wide">
                    Heure du scan à la porte d'entrée
                  </span>
                </div>
              </div>

              {/* Recent Validations Log */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-200 mb-4 font-display">
                  Journal des Activités de Contrôle
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5">Date / Heure</th>
                        <th className="py-2.5">ID Ticket</th>
                        <th className="py-2.5">Participant</th>
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-slate-700 divide-y divide-slate-100">
                      {logs.slice(-5).reverse().map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                          <td className="py-2.5 font-mono text-[10px] font-bold text-blue-600">{log.ticketId}</td>
                          <td className="py-2.5 capitalize">{log.prenom ? `${log.prenom} ${log.nom}` : 'N/A'}</td>
                          <td className="py-2.5 font-medium">{log.details}</td>
                          <td className="py-2.5 text-right">
                            {log.statut === 'succes' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-150 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">Validé</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-150 text-rose-800 text-[9px] font-black uppercase border border-rose-200">Refusé</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 font-bold uppercase">
                            Aucune validation d'accès pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB B: TICKETS LIST AND MASTER TABLE */}
          {adminTab === 'tickets' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6" id="view-admin-tickets">
              
              {/* Table Toolbar */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher par Nom, Prénom, Téléphone, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-semibold"
                    id="admin-search-input"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-2.5 flex-wrap w-full md:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">Tous les Statuts</option>
                    <option value="valide">Actif (Non validé)</option>
                    <option value="utilise">Validé (Utilisé)</option>
                    <option value="annule">Annulé</option>
                  </select>

                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">Tous les Opérateurs</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="moov_money">Moov Money</option>
                  </select>

                  {/* Add manual button */}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700 transition-all py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 shadow shadow-blue-200/50 cursor-pointer ml-auto md:ml-0"
                    id="btn-add-manual-ticket"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un Ticket
                  </button>
                </div>
              </div>

              {/* Master Tickets Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Numéro ID</th>
                      <th className="py-3 px-3">Participant</th>
                      <th className="py-3 px-3">Téléphone</th>
                      <th className="py-3 px-3">Journée</th>
                      <th className="py-3 px-3">Opérateur</th>
                      <th className="py-3 px-3">Montant</th>
                      <th className="py-3 px-3 text-center">Statut</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-700 divide-y divide-slate-100">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/40" id={`ticket-row-${t.id}`}>
                        <td className="py-3.5 px-3 font-mono font-bold text-blue-600 text-[11px]">{t.id}</td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 uppercase leading-none">{t.nom}</div>
                          <span className="text-[10px] text-slate-400 mt-1 inline-block">{t.prenom}</span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px]">
                          {t.telephone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase border ${
                            t.eventDay === 'jour1' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                            t.eventDay === 'jour2' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>
                            {t.eventDay === 'jour1' ? '🔴 Jour 1' : t.eventDay === 'jour2' ? '🟢 Jour 2' : '🏆 Pass 2J'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 uppercase text-[10px]">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                            t.paymentMethod === 'orange_money' ? 'bg-[#F58220]/10 text-[#F58220]' : 'bg-[#009639]/10 text-[#009639]'
                          }`}>
                            {t.paymentMethod === 'orange_money' ? 'Orange' : 'Moov'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-900">{t.amount} FCFA</td>
                        <td className="py-3.5 px-3 text-center">
                          {t.statut === 'valide' && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[9px] font-black uppercase">Actif</span>
                          )}
                          {t.statut === 'utilise' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black uppercase">Utilisé</span>
                          )}
                          {t.statut === 'annule' && (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-800 text-[9px] font-black uppercase">Annulé</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            {/* Edit */}
                            <button
                              onClick={() => handleEditClick(t)}
                              title="Modifier"
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              id={`btn-edit-${t.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Simulated WhatsApp notification alert */}
                            <button
                              onClick={() => triggerNotification(t.id, `Simulé : Ticket envoyé par WhatsApp à +226 ${t.telephone} !`)}
                              title="Renvoyer WhatsApp"
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              id={`btn-sms-${t.id}`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            {/* Cancel */}
                            {t.statut !== 'annule' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Êtes-vous sûr de vouloir annuler le ticket de ${t.prenom} ${t.nom} ?`)) {
                                    onCancelTicket(t.id);
                                    triggerNotification(t.id, "Ticket annulé !");
                                  }
                                }}
                                title="Annuler le ticket"
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                id={`btn-cancel-${t.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold uppercase">
                          Aucun ticket ne correspond aux critères de recherche.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB C: CONFIGURE APP SETTINGS */}
          {adminTab === 'settings' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto" id="view-admin-settings">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider pb-3 border-b border-slate-200 mb-6 font-display">
                Configuration de l'Événement
              </h3>

              <form onSubmit={(e) => {
                e.preventDefault();
                onUpdateSettings(settings);
                triggerNotification("settings-save", "Paramètres de l'événement sauvegardés !");
              }} className="space-y-4" id="form-update-settings">
                
                {/* Event Name */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Nom de l'Événement</label>
                  <input
                    type="text"
                    value={settings.eventName}
                    onChange={(e) => onUpdateSettings({ ...settings, eventName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* Event Dates */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Dates de l'Événement</label>
                  <input
                    type="text"
                    value={settings.eventDates}
                    onChange={(e) => onUpdateSettings({ ...settings, eventDates: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* Event Location */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Lieu de l'Événement</label>
                  <input
                    type="text"
                    value={settings.eventLocation}
                    onChange={(e) => onUpdateSettings({ ...settings, eventLocation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* Ticket Price & Promo Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Prix Standard (FCFA)</label>
                    <input
                      type="number"
                      value={settings.ticketPrice}
                      onChange={(e) => onUpdateSettings({ ...settings, ticketPrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Code Promo Étudiant</label>
                    <input
                      type="text"
                      value={settings.promoCode}
                      onChange={(e) => onUpdateSettings({ ...settings, promoCode: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Promo discount */}
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Réduction promo (FCFA)</label>
                  <input
                    type="number"
                    value={settings.promoDiscount}
                    onChange={(e) => onUpdateSettings({ ...settings, promoDiscount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700 py-2.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider shadow shadow-blue-200/50 cursor-pointer transition-all"
                  >
                    Sauvegarder les Paramètres
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EDIT TICKET MODAL */}
          {editingTicket && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" id="edit-ticket-modal">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 font-bold"
                >
                  ✕
                </button>

                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-200 mb-4 uppercase font-display">
                  Modifier le Ticket {editingTicket.id}
                </h3>

                <form onSubmit={handleSaveEdit} className="space-y-4" id="form-edit-ticket">
                  
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Nom</label>
                    <input
                      type="text"
                      required
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Surname */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Prénom</label>
                    <input
                      type="text"
                      required
                      value={editPrenom}
                      onChange={(e) => setEditPrenom(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Téléphone</label>
                    <input
                      type="tel"
                      required
                      value={editTelephone}
                      onChange={(e) => setEditTelephone(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Email (Facultatif)</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Event Day */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Jour de l'Événement</label>
                    <select
                      value={editEventDay}
                      onChange={(e) => setEditEventDay(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="jour1">🔴 Jour 1 (24 Juillet)</option>
                      <option value="jour2">🟢 Jour 2 (25 Juillet)</option>
                      <option value="les_deux">🏆 Pass Complet (2 Jours)</option>
                    </select>
                  </div>

                  {/* Status toggle */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Statut d'accès</label>
                    <select
                      value={editStatut}
                      onChange={(e) => setEditStatut(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="valide">🟢 Actif (Non utilisé)</option>
                      <option value="utilise">🟡 Validé (Utilisé)</option>
                      <option value="annule">🔴 Annulé (Accès interdit)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingTicket(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer shadow shadow-blue-200/50"
                    >
                      Sauvegarder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ADD MANUAL TICKET MODAL */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" id="add-ticket-modal">
              <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 font-bold"
                >
                  ✕
                </button>

                <h3 className="text-base font-black text-slate-900 pb-3 border-b border-slate-200 mb-4 uppercase font-display">
                  Ajouter un Ticket (Manuel / VIP)
                </h3>

                <form onSubmit={handleAddManualSubmit} className="space-y-4" id="form-add-manual-ticket">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Nom</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: COULIBALY"
                      value={addNom}
                      onChange={(e) => setAddNom(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Surname */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Prénom</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fatoumata"
                      value={addPrenom}
                      onChange={(e) => setAddPrenom(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Téléphone</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 70112233"
                      value={addTelephone}
                      onChange={(e) => setAddTelephone(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Email (Facultatif)</label>
                    <input
                      type="email"
                      placeholder="Ex: guest@uvbf.bf"
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Event Day */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Jour de l'Événement</label>
                    <select
                      value={addEventDay}
                      onChange={(e) => setAddEventDay(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="jour1">🔴 Jour 1 (24 Juillet)</option>
                      <option value="jour2">🟢 Jour 2 (25 Juillet)</option>
                      <option value="les_deux">🏆 Pass Complet (2 Jours)</option>
                    </select>
                  </div>

                  {/* Sim operator */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Opérateur d'enregistrement</label>
                    <select
                      value={addOperator}
                      onChange={(e) => setAddOperator(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="orange_money">Orange Money</option>
                      <option value="moov_money">Moov Money (Flooz)</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-black uppercase cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer shadow shadow-blue-200/50"
                    >
                      Ajouter
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
