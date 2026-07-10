/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Ticket, AppSettings } from '../types';
import TicketCard from './TicketCard';
import { Phone, User, Mail, CreditCard, ChevronRight, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Send, Search, HelpCircle } from 'lucide-react';

interface ParticipantViewProps {
  settings: AppSettings;
  onAddTicket: (ticketData: {
    nom: string;
    prenom: string;
    telephone: string;
    email?: string;
    paymentMethod: 'orange_money' | 'moov_money' | 'especes';
    paymentRef: string;
    amount: number;
    eventDay?: 'jour1' | 'jour2' | 'les_deux';
  }) => Ticket;
  tickets: Ticket[];
}

export default function ParticipantView({ settings, onAddTicket, tickets }: ParticipantViewProps) {
  // Navigation tabs within Participant View
  const [activeTab, setActiveTab] = useState<'buy' | 'lookup'>('buy');

  // Form fields
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [eventDay, setEventDay] = useState<'jour1' | 'jour2' | 'les_deux'>('jour1');
  const [paymentMethod, setPaymentMethod] = useState<'orange_money' | 'moov_money' | 'especes'>('orange_money');
  const [paymentRef, setPaymentRef] = useState('');
  
  // Promo code
  const [promoInput, setPromoInput] = useState('');
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Payment states
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);

  // Lookup fields
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookedUpTickets, setLookedUpTickets] = useState<Ticket[]>([]);
  const [hasLookedUp, setHasLookedUp] = useState(false);

  // Computed price based on user instructions
  // Jour 1 (24 Juillet) : 500 FCFA (Soirée Cinématographique)
  // Jour 2 (25 Juillet) : 500 FCFA (Soirée Culturelle)
  // Pass Complet (2 Jours) : 1000 FCFA
  const getBasePrice = (day: 'jour1' | 'jour2' | 'les_deux') => {
    if (day === 'jour1') return 500;
    if (day === 'jour2') return 500;
    return 1000;
  };
  const basePrice = getBasePrice(eventDay);
  const ticketPrice = isPromoApplied ? Math.max(0, basePrice - settings.promoDiscount) : basePrice;

  // Apply promo code
  const handleApplyPromo = () => {
    if (promoInput.trim().toUpperCase() === settings.promoCode) {
      setIsPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError("Code promo invalide");
      setIsPromoApplied(false);
    }
  };

  const handleRemovePromo = () => {
    setIsPromoApplied(false);
    setPromoInput('');
  };

  // Submit form and directly generate the ticket (no simulators, direct cashier mode)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !telephone.trim()) {
      return;
    }
    // Clean telephone input
    const cleanPhone = telephone.replace(/\s+/g, '');
    if (cleanPhone.length < 8) {
      alert("Veuillez saisir un numéro de téléphone valide (8 chiffres minimum)");
      return;
    }
    
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      // Auto-generate transaction reference if empty
      let finalRef = paymentRef.trim();
      if (!finalRef) {
        if (paymentMethod === 'orange_money') {
          finalRef = 'OM-' + Math.floor(Math.random() * 900000000 + 100000000);
        } else if (paymentMethod === 'moov_money') {
          finalRef = 'MM-' + Math.floor(Math.random() * 900000000 + 100000000);
        } else {
          finalRef = 'CASH-' + Math.floor(Math.random() * 900000 + 100000);
        }
      }
      
      // Create and save ticket
      const newTicket = onAddTicket({
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        telephone: cleanPhone,
        email: email.trim() || undefined,
        paymentMethod: paymentMethod,
        paymentRef: finalRef,
        amount: ticketPrice,
        eventDay: eventDay
      });

      setGeneratedTicket(newTicket);
      setStep('success');
    }, 600);
  };

  // Handle ticket search by telephone
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) return;
    
    const searchVal = lookupPhone.trim().replace(/\s+/g, '');
    const found = tickets.filter(t => t.telephone.replace(/\s+/g, '') === searchVal);
    setLookedUpTickets(found);
    setHasLookedUp(true);
  };

  const handleResetBuyFlow = () => {
    setNom('');
    setPrenom('');
    setTelephone('');
    setEmail('');
    setEventDay('jour1');
    setPaymentMethod('orange_money');
    setPaymentRef('');
    setPromoInput('');
    setIsPromoApplied(false);
    setStep('form');
    setGeneratedTicket(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-4" id="participant-panel">
      {/* Selector tab buy vs find tickets */}
      <div className="flex justify-center mb-8 bg-slate-100 p-1.5 rounded-xl max-w-sm mx-auto shadow-inner print:hidden">
        <button
          onClick={() => setActiveTab('buy')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-black transition-all duration-200 ${
            activeTab === 'buy'
              ? 'bg-[#006633] text-white shadow-md scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
          id="tab-buy-ticket"
        >
          Acheter un Ticket
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-black transition-all duration-200 ${
            activeTab === 'lookup'
              ? 'bg-[#006633] text-white shadow-md scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
          id="tab-find-ticket"
        >
          Mes Tickets
        </button>
      </div>

      {activeTab === 'buy' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-w-4xl mx-auto">
          
          {/* Header Flyer Style Banner */}
          <div className="bg-gradient-to-r from-[#004d26] via-[#006633] to-[#E30613] p-6 text-white text-center relative overflow-hidden print:hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10 max-w-2xl mx-auto space-y-1">
              <span className="text-xs bg-yellow-400 text-slate-950 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                U.V.B.F. • ÉDITION 2026
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight leading-none mt-2">
                Les 48 Heures de l'Université Virtuelle
              </h2>
              <p className="text-xs font-bold text-slate-100 max-w-md mx-auto leading-relaxed">
                "Ensemble, construisons le savoir de demain !" • Rejoignez-nous pour deux jours de culture, d'innovation et de partage.
              </p>
              <div className="pt-2 flex items-center justify-center gap-4 text-xs font-black text-yellow-300">
                <span>📅 {settings.eventDates}</span>
                <span>•</span>
                <span>📍 Ouagadougou ENO Karpala</span>
              </div>
            </div>
          </div>

          {/* Flow content */}
          <div className="p-6 md:p-8">
            
            {/* STEP 1: Registration Form */}
            {step === 'form' && (
              <form onSubmit={handleFormSubmit} className="max-w-xl mx-auto space-y-6" id="buy-form">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900">Enregistrement & Vente Directe</h3>
                  <p className="text-xs text-gray-500 font-bold">Saisissez les informations du participant pour générer instantanément son ticket d'entrée</p>
                </div>

                <div className="space-y-4">
                  {/* Name fields in a grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Nom <span className="text-[#E30613]">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: OUEDRAOGO"
                          value={nom}
                          onChange={(e) => setNom(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-semibold uppercase"
                          id="input-nom"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Prénom <span className="text-[#E30613]">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Ibrahim"
                          value={prenom}
                          onChange={(e) => setPrenom(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-semibold"
                          id="input-prenom"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Téléphone <span className="text-[#E30613]">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          required
                          placeholder="Ex: 70123456"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value.replace(/\D/g, ''))}
                          maxLength={12}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-mono font-bold"
                          id="input-telephone"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Adresse Email (Facultatif)</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          placeholder="Ex: ibrahim.ouedraogo@uvbf.bf"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-semibold"
                          id="input-email"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Event Day Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                      Option de l'Événement <span className="text-[#E30613]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setEventDay('jour1')}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          eventDay === 'jour1'
                            ? 'border-[#006633] bg-emerald-50/50 ring-2 ring-[#006633]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        id="btn-select-jour1"
                      >
                        <div>
                          <span className="text-xs font-black block text-slate-900">Jour 1</span>
                          <span className="text-[10px] font-bold text-slate-500 block leading-tight mt-1">Soirée Cinématographique</span>
                        </div>
                        <span className="text-xs font-mono font-black text-[#006633] mt-3 block">500 FCFA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventDay('jour2')}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          eventDay === 'jour2'
                            ? 'border-[#006633] bg-emerald-50/50 ring-2 ring-[#006633]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        id="btn-select-jour2"
                      >
                        <div>
                          <span className="text-xs font-black block text-slate-900">Jour 2</span>
                          <span className="text-[10px] font-bold text-slate-500 block leading-tight mt-1">Soirée Culturelle</span>
                        </div>
                        <span className="text-xs font-mono font-black text-[#006633] mt-3 block">500 FCFA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventDay('les_deux')}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          eventDay === 'les_deux'
                            ? 'border-[#006633] bg-emerald-50/50 ring-2 ring-[#006633]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                        id="btn-select-les-deux"
                      >
                        <div>
                          <span className="text-xs font-black block text-slate-900">Pass Complet</span>
                          <span className="text-[10px] font-bold text-slate-500 block leading-tight mt-1">Jour 1 & Jour 2</span>
                        </div>
                        <span className="text-xs font-mono font-black text-[#006633] mt-3 block">1 000 FCFA</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">
                      Mode d'Encaissement du Participant <span className="text-[#E30613]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('orange_money')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          paymentMethod === 'orange_money'
                            ? 'border-[#F58220] bg-orange-50/50 ring-2 ring-[#F58220]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#F58220] flex items-center justify-center text-white font-black text-xs shrink-0">
                          OM
                        </div>
                        <div>
                          <span className="text-xs font-black block text-slate-900">Orange Money</span>
                          <span className="text-[9px] text-gray-500 font-bold block">Paiement Mobile</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('moov_money')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          paymentMethod === 'moov_money'
                            ? 'border-[#009639] bg-green-50/50 ring-2 ring-[#009639]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[#009639] flex items-center justify-center text-white font-black text-xs shrink-0">
                          Moov
                        </div>
                        <div>
                          <span className="text-xs font-black block text-slate-900">Moov Money</span>
                          <span className="text-[9px] text-gray-500 font-bold block">Paiement Mobile</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('especes')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          paymentMethod === 'especes'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                          CASH
                        </div>
                        <div>
                          <span className="text-xs font-black block text-slate-900">Espèces</span>
                          <span className="text-[9px] text-gray-500 font-bold block">Paiement Physique</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Reference field */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">Référence d'encaissement (Optionnel)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Ex: ID de transaction OM/Moov, ou laisser vide pour génération automatique"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-semibold"
                        id="input-payment-ref"
                      />
                    </div>
                  </div>

                  {/* Promo Code section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs font-black text-slate-700 block uppercase tracking-wider mb-2">Code Réduction Étudiant</label>
                    {isPromoApplied ? (
                      <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2.5 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Code Réduction appliqué (-{settings.promoDiscount} FCFA)</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="text-red-500 hover:text-red-700 font-black cursor-pointer px-1.5 py-0.5 hover:bg-red-50 rounded animate-pulse"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Entrez le code promo (Ex: UVBF2026)"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#006633] text-xs font-mono font-bold uppercase"
                          />
                          <button
                            type="button"
                            onClick={handleApplyPromo}
                            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors cursor-pointer animate-none"
                          >
                            Appliquer
                          </button>
                        </div>
                        {promoError && (
                          <span className="text-[10px] text-red-500 font-bold block">{promoError}</span>
                        )}
                        <span className="text-[9px] text-gray-400 font-semibold block">Indice : Saisissez <b className="font-mono">{settings.promoCode}</b> pour accorder la réduction.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Display and Submit */}
                <div className="pt-4 border-t border-dashed border-gray-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Montant encaissé :</span>
                    <span className="text-2xl font-black text-[#006633] font-mono">
                      {ticketPrice} <span className="text-sm font-bold">FCFA</span>
                    </span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-[#006633] text-white hover:bg-[#004d26] transition-all py-3 px-6 rounded-xl text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg hover:translate-y-[-1px] cursor-pointer disabled:opacity-50"
                    id="btn-submit-momo"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Génération du Ticket...
                      </>
                    ) : (
                      <>
                        Générer le Ticket d'Entrée
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Success, Display Fresh Ticket */}
            {step === 'success' && generatedTicket && (
              <div className="space-y-8 animate-fade-in text-center" id="buy-success-screen">
                <div className="max-w-md mx-auto space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">Ticket Généré avec Succès !</h3>
                  <p className="text-xs text-gray-500 font-bold leading-normal">
                    Le ticket sécurisé pour le participant <b>{generatedTicket.prenom} {generatedTicket.nom}</b> a été créé. Vous pouvez le partager directement ou le télécharger ci-dessous.
                  </p>
                </div>

                {/* REAL WhatsApp & SMS Dispatch helper */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 max-w-lg mx-auto text-left space-y-4 print:hidden">
                  <div className="flex items-center justify-between text-xs font-black text-emerald-800 uppercase pb-2 border-b border-emerald-100/50">
                    <span className="flex items-center gap-1.5 text-xs">
                      📲 Envoi direct au participant
                    </span>
                    <span className="bg-[#006633] text-white text-[9px] px-2.5 py-0.5 rounded-full font-bold">Guichet Prêt</span>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-[11px] text-emerald-800 leading-normal font-semibold">
                      Vous avez encaissé <b className="font-mono text-emerald-950">{generatedTicket.amount} FCFA</b> par <b>{
                        generatedTicket.paymentMethod === 'orange_money' ? 'Orange Money' : generatedTicket.paymentMethod === 'moov_money' ? 'Moov Money' : 'Espèces'
                      }</b> (Réf: <code className="bg-emerald-100/50 px-1 rounded font-mono font-bold text-emerald-950">{generatedTicket.paymentRef}</code>).
                    </p>
                    
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Message WhatsApp Préparé :</p>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {`Bonjour ${generatedTicket.prenom} ${generatedTicket.nom}, votre ticket numérique sécurisé pour les 48H de l'UVBF a été généré !\n\n` +
                         `🎟️ Ticket ID : ${generatedTicket.id}\n` +
                         `📅 Événement : ${
                           generatedTicket.eventDay === 'jour1' 
                             ? 'Jour 1 : Soirée Cinématographique' 
                             : generatedTicket.eventDay === 'jour2' 
                               ? 'Jour 2 : Soirée Culturelle' 
                               : 'Pass Complet (2 Jours)'
                         }\n` +
                         `💵 Tarif : ${generatedTicket.amount} FCFA\n` +
                         `🔒 Statut : PAYÉ & VALIDÉ`}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={`https://wa.me/${
                          generatedTicket.telephone.replace(/\D/g, '').startsWith('226') 
                            ? generatedTicket.telephone.replace(/\D/g, '') 
                            : '226' + generatedTicket.telephone.replace(/\D/g, '')
                        }?text=${encodeURIComponent(
                          `Bonjour ${generatedTicket.prenom} ${generatedTicket.nom}, voici votre ticket pour les 48H de l'UVBF !\n\n` +
                          `🎟️ ID du Ticket : ${generatedTicket.id}\n` +
                          `📅 Programme : ${
                            generatedTicket.eventDay === 'jour1' 
                              ? 'Jour 1 : Soirée Cinématographique (500F)' 
                              : generatedTicket.eventDay === 'jour2' 
                                ? 'Jour 2 : Soirée Culturelle (500F)' 
                                : 'Pass Complet 2 Jours (1000F)'
                          }\n` +
                          `💵 Montant : ${generatedTicket.amount} FCFA\n` +
                          `🔒 Présentez ce message à l'entrée de l'événement.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-center cursor-pointer"
                      >
                        <span>💬</span>
                        Envoyer par WhatsApp au participant
                      </a>
                    </div>
                  </div>
                </div>

                {/* High fidelity Ticket Card */}
                <div className="py-2">
                  <div className="max-w-md mx-auto bg-slate-50 rounded-2xl p-3 border border-slate-200/50 text-left mb-2 text-[10px] text-gray-500 font-bold flex items-center gap-2">
                    <span>💡</span>
                    <span>Cliquez sur <b>"Télécharger / Partager PNG"</b> pour afficher le ticket. Sur mobile, faites un appui long sur l'image pour l'enregistrer ou l'envoyer directement sur WhatsApp !</span>
                  </div>
                  <TicketCard ticket={generatedTicket} settings={settings} />
                </div>

                <div className="flex justify-center gap-4 pt-4 print:hidden">
                  <button
                    type="button"
                    onClick={handleResetBuyFlow}
                    className="bg-slate-800 text-white hover:bg-slate-900 text-xs font-black px-6 py-3 rounded-xl transition-colors cursor-pointer"
                    id="btn-buy-another"
                  >
                    Générer un autre ticket
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* FIND / LOOKUP ACTIVE TICKETS */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 md:p-8 max-w-2xl mx-auto" id="lookup-panel">
          <div className="text-center space-y-2 mb-6">
            <h3 className="text-xl font-black text-slate-900">Retrouver mes Tickets</h3>
            <p className="text-xs text-gray-500 font-bold max-w-sm mx-auto leading-normal">
              Entrez le numéro de téléphone utilisé lors de l'achat pour afficher et télécharger vos tickets numériques sécurisés.
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2 max-w-md mx-auto mb-8" id="form-lookup-tickets">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                required
                placeholder="Ex: 70123456"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#006633] focus:border-[#006633] text-sm font-mono font-bold"
                id="input-lookup-phone"
              />
            </div>
            <button
              type="submit"
              className="bg-[#006633] text-white hover:bg-[#004d26] px-5 py-2.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              id="btn-lookup-search"
            >
              Rechercher
            </button>
          </form>

          {hasLookedUp && (
            <div className="space-y-6" id="lookup-results">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-gray-100">
                Résultats de recherche ({lookedUpTickets.length} ticket{lookedUpTickets.length > 1 ? 's' : ''})
              </h4>

              {lookedUpTickets.length > 0 ? (
                <div className="space-y-8" id="looked-up-list">
                  {lookedUpTickets.map((t) => (
                    <div key={t.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-4" id={`lookup-item-${t.id}`}>
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                          {t.id}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 font-bold">
                            Acheté le {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                          {t.statut === 'valide' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase">
                              Actif
                            </span>
                          )}
                          {t.statut === 'utilise' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-black uppercase">
                              Utilisé
                            </span>
                          )}
                          {t.statut === 'annule' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-800 text-[10px] font-black uppercase">
                              Annulé
                            </span>
                          )}
                        </div>
                      </div>

                      <TicketCard ticket={t} settings={settings} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2 border-2 border-dashed border-gray-100 rounded-xl" id="no-tickets-found">
                  <div className="text-3xl">🎫</div>
                  <div className="text-sm font-black text-slate-900">Aucun ticket trouvé</div>
                  <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto">
                    Aucun ticket n'est enregistré pour le numéro <b className="font-mono">+{lookupPhone}</b>. Veuillez vérifier le numéro de téléphone saisi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
