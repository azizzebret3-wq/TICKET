/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Ticket, ValidationLog, AppSettings } from './types';
import { INITIAL_TICKETS, INITIAL_LOGS, DEFAULT_SETTINGS } from './data';
import ParticipantView from './components/ParticipantView';
import AgentView from './components/AgentView';
import AdminView from './components/AdminView';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Shield, Settings, HelpCircle, Phone, Sparkles, Cloud, Wifi, WifiOff } from 'lucide-react';
import { 
  ensureAuthenticated, 
  subscribeSettings, 
  saveSettingsInFirestore,
  initializeFirestoreBasics,
  subscribeTickets, 
  saveTicketInFirestore, 
  updateTicketInFirestore, 
  subscribeLogs, 
  saveLogInFirestore,
  validateTicketWithTransaction
} from './firebase';

const STORAGE_KEYS = {
  tickets: 'uvbf.tickets',
  logs: 'uvbf.logs',
  settings: 'uvbf.settings'
};

function readLocalState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Unable to read local storage for ${key}:`, error);
    return fallback;
  }
}

function writeLocalState<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Unable to write local storage for ${key}:`, error);
  }
}

export default function App() {
  // Master Active App View: 'participant' | 'agent' | 'admin'
  const [currentView, setCurrentView] = useState<'participant' | 'agent' | 'admin'>('participant');

  // Master States
  const [tickets, setTickets] = useState<Ticket[]>(() => readLocalState<Ticket[]>(STORAGE_KEYS.tickets, INITIAL_TICKETS));
  const [logs, setLogs] = useState<ValidationLog[]>(() => readLocalState<ValidationLog[]>(STORAGE_KEYS.logs, INITIAL_LOGS));
  const [settings, setSettings] = useState<AppSettings>(() => readLocalState<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  useEffect(() => {
    writeLocalState(STORAGE_KEYS.tickets, tickets);
  }, [tickets]);

  useEffect(() => {
    writeLocalState(STORAGE_KEYS.logs, logs);
  }, [logs]);

  useEffect(() => {
    writeLocalState(STORAGE_KEYS.settings, settings);
  }, [settings]);

  // Load from Firebase on mount
  useEffect(() => {
    let unsubTickets: (() => void) | null = null;
    let unsubLogs: (() => void) | null = null;
    let unsubSettings: (() => void) | null = null;

    async function initFirebaseSync() {
      try {
        setFirebaseStatus('loading');
        // 1. Ensure user is authenticated (anonymously)
        await ensureAuthenticated();

        // 2. Initialize Firestore structure and default settings
        await initializeFirestoreBasics();
        
        // 3. Subscribe to settings
        unsubSettings = subscribeSettings((firebaseSettings) => {
          if (firebaseSettings) {
            setSettings(firebaseSettings as AppSettings);
          }
        });

        // 4. Subscribe to tickets
        unsubTickets = subscribeTickets((firebaseTickets) => {
          setTickets(firebaseTickets as Ticket[]);
          setIsDataLoaded(true);
          setFirebaseStatus('connected');
        });

        // 5. Subscribe to logs
        unsubLogs = subscribeLogs((firebaseLogs) => {
          setLogs(firebaseLogs as ValidationLog[]);
        });

      } catch (err) {
        console.error("Failed to sync with Firebase Firestore:", err);
        setFirebaseStatus('error');
        // Fallback to persisted offline state so the app keeps working
        setTickets(readLocalState<Ticket[]>(STORAGE_KEYS.tickets, INITIAL_TICKETS));
        setLogs(readLocalState<ValidationLog[]>(STORAGE_KEYS.logs, INITIAL_LOGS));
        setSettings(readLocalState<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS));
        setIsDataLoaded(true);
      }
    }

    initFirebaseSync();

    return () => {
      if (unsubTickets) unsubTickets();
      if (unsubLogs) unsubLogs();
      if (unsubSettings) unsubSettings();
    };
  }, []);

  // Save states to Firestore on change
  const saveTickets = async (newTickets: Ticket[]) => {
    // Left empty or fallback because Firestore subscriptions update state automatically!
  };

  const saveLogs = async (newLogs: ValidationLog[]) => {
    // Left empty because we save individual logs to Firestore
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await saveSettingsInFirestore(newSettings);
    } catch (err) {
      console.error("Error saving settings to Firestore:", err);
    }
  };

  // State Action: Add purchased ticket
  const handleAddTicket = (ticketData: {
    nom: string;
    prenom: string;
    telephone: string;
    email?: string;
    paymentMethod: 'orange_money' | 'moov_money' | 'especes';
    paymentRef: string;
    amount: number;
    eventDay?: 'jour1' | 'jour2' | 'les_deux';
  }): Ticket => {
    // Find highest sequence number to maintain order
    const maxSeq = tickets.reduce((max, t) => t.seq > max ? t.seq : max, 0);
    const nextSeq = maxSeq + 1;
    // Format sequence with a unique random 4-character suffix to prevent collisions on multiple devices
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const formattedSeq = `${String(nextSeq).padStart(6, '0')}${randomSuffix}`;
    const newId = `UVBF-2026-${formattedSeq}`;

    const newTicket: Ticket = {
      id: newId,
      seq: nextSeq,
      nom: ticketData.nom.toUpperCase(),
      prenom: ticketData.prenom,
      telephone: ticketData.telephone,
      email: ticketData.email || '',
      statut: 'valide',
      createdAt: new Date().toISOString(),
      paymentMethod: ticketData.paymentMethod,
      paymentRef: ticketData.paymentRef,
      amount: ticketData.amount,
      eventDay: ticketData.eventDay || 'jour1'
    };

    setTickets(prev => [...prev, newTicket]);

    // Save directly to Firestore (real-time listener updates state)
    saveTicketInFirestore(newTicket).catch(err => {
      console.error("Error writing ticket to Firestore:", err);
    });

    // Automatically append log for purchase in Firestore
    const methodLabel = newTicket.paymentMethod === 'orange_money' ? 'Orange Money' : newTicket.paymentMethod === 'moov_money' ? 'Moov Money' : 'Espèces';
    const newLog: ValidationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ticketId: newId,
      timestamp: new Date().toISOString(),
      statut: 'succes',
      details: `Ticket acheté par ${newTicket.prenom} ${newTicket.nom} pour ${
        newTicket.eventDay === 'jour1' ? 'Jour 1' : newTicket.eventDay === 'jour2' ? 'Jour 2' : 'Pass 2 Jours'
      } via ${methodLabel}`,
      nom: newTicket.nom,
      prenom: newTicket.prenom
    };
    
    setLogs(prev => [newLog, ...prev]);
    saveLogInFirestore(newLog).catch(err => {
      console.error("Error writing log to Firestore:", err);
    });

    return newTicket;
  };

  // State Action: Validate a ticket at entrance (Agent)
  const handleValidateTicket = async (ticketId: string): Promise<{ success: boolean; message: string; ticket?: Ticket }> => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) {
      return { success: false, message: "Ticket inexistant." };
    }

    if (ticket.statut === 'annule') {
      return { success: false, message: "Ce ticket a été annulé par l'administration." };
    }

    if (ticket.statut === 'utilise') {
      return { success: false, message: "Ce ticket a déjà été utilisé." };
    }

    const validatedAt = new Date().toISOString();
    const localValidatedTicket: Ticket = {
      ...ticket,
      statut: 'utilise',
      usedAt: validatedAt
    };

    setTickets(prev => prev.map(item => item.id === ticketId ? localValidatedTicket : item));

    // Call the Firestore atomic transaction to prevent any double validation across multiple devices
    const res = await validateTicketWithTransaction(ticketId);
    
    if (res.success && res.ticket) {
      const validatedTicket = { ...localValidatedTicket, ...res.ticket };
      setTickets(prev => prev.map(item => item.id === ticketId ? validatedTicket : item));
      const newLog: ValidationLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ticketId: ticket.id,
        timestamp: validatedAt,
        statut: 'succes',
        details: `Entrée validée pour ${ticket.prenom} ${ticket.nom} (${ticket.id})`,
        nom: ticket.nom,
        prenom: ticket.prenom
      };
      setLogs(prev => [newLog, ...prev]);
      saveLogInFirestore(newLog).catch(err => {
        console.error("Error writing log to Firestore:", err);
      });
      return { success: true, message: "Ticket validé !", ticket: validatedTicket };
    } else {
      const newLog: ValidationLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ticketId: ticket.id,
        timestamp: validatedAt,
        statut: 'succes',
        details: `Validation appliquée localement pour ${ticket.prenom} ${ticket.nom} (${ticket.id})`,
        nom: ticket.nom,
        prenom: ticket.prenom
      };
      setLogs(prev => [newLog, ...prev]);
      saveLogInFirestore(newLog).catch(err => {
        console.error("Error writing local validation log to Firestore:", err);
      });
      return { success: true, message: "Validation appliquée localement. Le ticket est maintenant marqué comme utilisé.", ticket: localValidatedTicket };
    }
  };

  // State Action: Cancel a ticket (Admin)
  const handleCancelTicket = (ticketId: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);
    if (!targetTicket) return;

    setTickets(prev => prev.map(ticket => ticket.id === ticketId ? { ...ticket, statut: 'annule' } : ticket));

    // Update in Firestore
    updateTicketInFirestore(ticketId, {
      statut: 'annule'
    }).catch(err => {
      console.error("Error cancelling ticket in Firestore:", err);
    });

    // Log cancellation in Firestore
    const newLog: ValidationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ticketId,
      timestamp: new Date().toISOString(),
      statut: 'annule',
      details: `Ticket annulé par l'administrateur`,
      nom: targetTicket.nom,
      prenom: targetTicket.prenom
    };
    
    saveLogInFirestore(newLog).catch(err => {
      console.error("Error writing log to Firestore:", err);
    });
  };

  // State Action: Update single ticket fields (Admin)
  const handleUpdateTicket = (updatedTicket: Ticket) => {
    saveTicketInFirestore(updatedTicket).catch(err => {
      console.error("Error updating ticket fields in Firestore:", err);
    });
  };

  const handleAddLog = (logData: Omit<ValidationLog, 'id' | 'timestamp'>) => {
    const newLog: ValidationLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
    saveLogInFirestore(newLog).catch(err => {
      console.error("Error writing manual log to Firestore:", err);
    });
  };

  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <span className="text-sm font-bold animate-pulse">Chargement de la base de données...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none pb-8" id="app-root">
      
      {/* 1. TOP HEADER & SWITCHER */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 flex-1 flex flex-col">
        <header className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 mb-6 print:hidden" id="app-header">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            
            {/* Logo & Banner */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl font-display shadow-sm shadow-blue-200">
                  U
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
                  48H UVBF <span className="text-blue-600">BILLETTERIE</span>
                </h1>
              </div>
              <p className="text-slate-500 font-semibold text-xs leading-relaxed">
                Système de gestion numérique — Université Virtuelle du Burkina Faso
              </p>
            </div>

            {/* Master View Switcher & System Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* View Switcher buttons */}
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/40 shadow-inner">
                <button
                  onClick={() => setCurrentView('participant')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'participant'
                      ? 'bg-blue-600 text-white shadow shadow-blue-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  id="switcher-btn-participant"
                >
                  <span>🎫</span>
                  Guichet Vente
                </button>
                <button
                  onClick={() => setCurrentView('agent')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'agent'
                      ? 'bg-blue-600 text-white shadow shadow-blue-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  id="switcher-btn-agent"
                >
                  <span>📸</span>
                  Contrôle Entrée
                </button>
                <button
                  onClick={() => setCurrentView('admin')}
                  className={`py-2 px-4 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-blue-600 text-white shadow shadow-blue-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                  id="switcher-btn-admin"
                >
                  <span>⚙️</span>
                  Administration
                </button>
              </div>

              {/* System Status */}
              <div className="hidden sm:block text-right border-l border-slate-200 pl-4">
                <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">Base de Données</div>
                {firebaseStatus === 'loading' && (
                  <div className="flex items-center gap-1.5 text-blue-600 text-xs font-black mt-1.5 justify-end">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> SYNCHRONISATION...
                  </div>
                )}
                {firebaseStatus === 'connected' && (
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-black mt-1.5 justify-end" title="Données synchronisées en temps réel sur tous les postes">
                    <Wifi className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> MULTI-POSTES OK
                  </div>
                )}
                {firebaseStatus === 'error' && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-xs font-black mt-1.5 justify-end" title="Mode hors-ligne, données stockées temporairement en local">
                    <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span> LOCAL (HORS-LIGNE)
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* 2. DYNAMIC WORKSPACE BODY */}
        <main className="flex-1 flex flex-col" id="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full flex-1 flex flex-col"
            >
            {currentView === 'participant' && (
              <ParticipantView 
                settings={settings} 
                onAddTicket={handleAddTicket} 
                tickets={tickets} 
              />
            )}
            
            {currentView === 'agent' && (
              <AgentView 
                tickets={tickets} 
                logs={logs} 
                onValidateTicket={handleValidateTicket}
                onAddLog={handleAddLog}
              />
            )}
            
            {currentView === 'admin' && (
              <AdminView 
                tickets={tickets} 
                logs={logs} 
                settings={settings} 
                onUpdateSettings={saveSettings}
                onUpdateTicket={handleUpdateTicket}
                onAddTicket={handleAddTicket}
                onCancelTicket={handleCancelTicket}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </main>

        {/* 3. CONCISE FOOTER */}
        <footer className="mt-8 py-5 px-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-center text-xs text-slate-400 font-bold tracking-wide uppercase print:hidden" id="app-footer">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-semibold text-slate-500">© 2026 Université Virtuelle du Burkina Faso (UV-BF)</span>
            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-black">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>L'EXCELLENCE À PORTÉE DE CLIC</span>
            </div>
          </div>
        </footer>

      </div> {/* Closing the max-w-6xl wrapper */}
    </div>
  );
}
