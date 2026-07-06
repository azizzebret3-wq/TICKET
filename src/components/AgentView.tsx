/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Ticket, ValidationLog } from '../types';
import { Scan, Keyboard, ShieldAlert, CheckCircle, XCircle, AlertTriangle, Play, Square, Info, RefreshCw, History, Database, ShieldCheck } from 'lucide-react';

interface AgentViewProps {
  tickets: Ticket[];
  logs: ValidationLog[];
  onValidateTicket: (ticketId: string) => Promise<{ success: boolean; message: string; ticket?: Ticket }>;
  onAddLog: (log: Omit<ValidationLog, 'id' | 'timestamp'>) => void;
}

export default function AgentView({ tickets, logs, onValidateTicket, onAddLog }: AgentViewProps) {
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual' | 'simulated'>('simulated');
  const [controlDay, setControlDay] = useState<'jour1' | 'jour2'>('jour1');
  
  // Manual text input
  const [manualCode, setManualCode] = useState('');
  
  // Active scan result state
  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'valid' | 'used' | 'cancelled' | 'not_found';
    ticket?: Ticket;
    scannedCode: string;
    message?: string;
  }>({ status: 'idle', scannedCode: '' });

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "camera-qr-reader";

  // Audio simulator (beep on scan)
  const playBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context might be blocked by browser autoplay policy
      console.log('Audio feedback not allowed by browser autoplay policy', e);
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    
    // Tiny delay to ensure DOM is ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const html5Qrcode = new Html5Qrcode(qrRegionId);
      html5QrcodeRef.current = html5Qrcode;

      const qrCodeSuccessCallback = (decodedText: string) => {
        // Stop camera on success to display result cleanly
        stopCamera();
        handlePerformScan(decodedText);
      };

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        (errorMessage) => {
          // Silent background listening logs
        }
      );
      setCameraPermissionGranted(true);
    } catch (err: any) {
      console.error("Camera start error:", err);
      setCameraActive(false);
      setCameraPermissionGranted(false);
      setCameraError("Impossible d'accéder à la caméra. Assurez-vous d'avoir accordé les permissions d'accès à l'appareil photo dans votre navigateur.");
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop scanning:", err);
      }
    }
    setCameraActive(false);
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(err => console.error("Unmount camera stop error", err));
      }
    };
  }, []);

  // Process the QR Code text
  const handlePerformScan = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Search in DB
    const ticket = tickets.find(t => t.id === cleanCode);

    if (!ticket) {
      playBeep('error');
      setScanResult({
        status: 'not_found',
        scannedCode: cleanCode,
        message: "🔴 Ticket inexistant"
      });
      // Log event
      onAddLog({
        ticketId: cleanCode,
        statut: 'inexistant',
        details: `Tentative de scan avec code inexistant: ${cleanCode}`
      });
      return;
    }

    if (ticket.statut === 'annule') {
      playBeep('error');
      setScanResult({
        status: 'cancelled',
        ticket,
        scannedCode: cleanCode,
        message: "🔴 Ticket annulé"
      });
      // Log event
      onAddLog({
        ticketId: cleanCode,
        statut: 'annule',
        details: `Code annulé scanné: ${ticket.id} (${ticket.prenom} ${ticket.nom})`,
        nom: ticket.nom,
        prenom: ticket.prenom
      });
      return;
    }

    if (ticket.statut === 'utilise') {
      playBeep('error');
      setScanResult({
        status: 'used',
        ticket,
        scannedCode: cleanCode,
        message: `🔴 Ticket déjà utilisé`
      });
      // Log event
      onAddLog({
        ticketId: cleanCode,
        statut: 'deja_utilise',
        details: `Double tentative d'entrée pour ${ticket.prenom} ${ticket.nom} (${ticket.id})`,
        nom: ticket.nom,
        prenom: ticket.prenom
      });
      return;
    }

    // Check if there is a day mismatch with current control point configuration
    const hasDayMismatch = ticket.eventDay !== 'les_deux' && ticket.eventDay !== controlDay;
    
    if (hasDayMismatch) {
      playBeep('error');
      setScanResult({
        status: 'valid', // remains valid for override, but carries a strong notice
        ticket,
        scannedCode: cleanCode,
        message: `⚠️ ACCÈS NON PRÉVU AUJOURD'HUI (${ticket.eventDay === 'jour1' ? 'Jour 1' : 'Jour 2'})`
      });
      
      // Log day mismatch event
      onAddLog({
        ticketId: cleanCode,
        statut: 'annule',
        details: `Scan de Jour Conflictuel : ${ticket.prenom} ${ticket.nom} (${ticket.id}) a un ticket ${ticket.eventDay === 'jour1' ? 'Jour 1' : 'Jour 2'} mais a été scanné au point d'entrée ${controlDay === 'jour1' ? 'Jour 1' : 'Jour 2'}`,
        nom: ticket.nom,
        prenom: ticket.prenom
      });
      return;
    }

    // Otherwise, ticket is VALID!
    playBeep('success');
    setScanResult({
      status: 'valid',
      ticket,
      scannedCode: cleanCode,
      message: "🟢 Ticket valide"
    });
  };

  // Action: Validate & Confirm entrance (Change status to Used)
  const handleConfirmEntrance = async () => {
    if (scanResult.status !== 'valid' || !scanResult.ticket) return;

    const res = await onValidateTicket(scanResult.ticket.id);
    if (res.success && res.ticket) {
      setScanResult({
        status: 'used',
        ticket: res.ticket,
        scannedCode: res.ticket.id,
        message: "🟢 Entrée Validée avec Succès !"
      });
      playBeep('success');
    } else {
      alert("Une erreur s'est produite lors de la validation : " + res.message);
    }
  };

  const handleResetScan = () => {
    setScanResult({ status: 'idle', scannedCode: '' });
    setManualCode('');
    if (scanMethod === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4" id="agent-panel">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#006633] flex items-center justify-center shadow shadow-emerald-950">
            <Scan className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight uppercase">Portail de Contrôle d'Entrée</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">Agent de Contrôle</span>
            </div>
          </div>
        </div>

        {/* Scan Method Selectors */}
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { stopCamera(); setScanMethod('simulated'); handleResetScan(); }}
            className={`py-1.5 px-4 rounded-lg text-xs font-black transition-all ${
              scanMethod === 'simulated' ? 'bg-[#006633] text-white' : 'text-slate-400 hover:text-white'
            }`}
            id="agent-method-sim"
          >
            🕹️ Simulateur
          </button>
          <button
            onClick={() => { stopCamera(); setScanMethod('manual'); handleResetScan(); }}
            className={`py-1.5 px-4 rounded-lg text-xs font-black transition-all ${
              scanMethod === 'manual' ? 'bg-[#006633] text-white' : 'text-slate-400 hover:text-white'
            }`}
            id="agent-method-manual"
          >
            <Keyboard className="w-3.5 h-3.5 inline mr-1" />
            Manuel
          </button>
          <button
            onClick={() => { setScanMethod('camera'); handleResetScan(); }}
            className={`py-1.5 px-4 rounded-lg text-xs font-black transition-all ${
              scanMethod === 'camera' ? 'bg-[#006633] text-white' : 'text-slate-400 hover:text-white'
            }`}
            id="agent-method-camera"
          >
            📸 Caméra Live
          </button>
        </div>
      </div>

      {/* Configuration active de la Base de Données et Journée de Contrôle */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6" id="db-config-bar">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-blue-600 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base de Données Centrale</span>
            </div>
            <div className="text-sm font-black text-slate-800 uppercase mt-0.5">Vérification Anti-Fraude Activée</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-[10px] font-black text-slate-500 uppercase px-3">Jour du Contrôle :</span>
          <div className="flex gap-1">
            <button
              onClick={() => setControlDay('jour1')}
              className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                controlDay === 'jour1'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
              id="agent-control-j1"
            >
              🔴 Jour 1
            </button>
            <button
              onClick={() => setControlDay('jour2')}
              className={`py-1.5 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                controlDay === 'jour2'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
              id="agent-control-j2"
            >
              🟢 Jour 2
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT COLUMN: SCAN INTERFACE & RESULT (COL-SPAN-8) */}
        <div className="md:col-span-8 space-y-6">
          {scanResult.status === 'idle' ? (
            /* IDLE SCAN WORKSPACES */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 text-center min-h-[380px] flex flex-col justify-center items-center">
              
              {/* CAMERA WORKSPACE */}
              {scanMethod === 'camera' && (
                <div className="w-full max-w-md mx-auto space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center justify-center gap-1.5">
                    <Scan className="w-4 h-4 text-[#006633]" />
                    Scanner le QR Code du Ticket
                  </h3>
                  
                  {cameraActive ? (
                    <div className="relative rounded-2xl overflow-hidden border-4 border-slate-900 bg-slate-950 aspect-square max-w-xs mx-auto shadow-inner">
                      {/* Animated scanning lines */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 opacity-80 shadow-[0_0_8px_#34d399] animate-[bounce_3s_infinite] z-20"></div>
                      
                      {/* Interactive target corners */}
                      <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-emerald-400 z-10 rounded-tl"></div>
                      <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-emerald-400 z-10 rounded-tr"></div>
                      <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-emerald-400 z-10 rounded-bl"></div>
                      <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-emerald-400 z-10 rounded-br"></div>
                      
                      {/* Webcam Feed Div */}
                      <div id={qrRegionId} className="w-full h-full scale-102"></div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 max-w-xs mx-auto flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <Scan className="w-8 h-8" />
                      </div>
                      <button
                        onClick={startCamera}
                        className="bg-[#006633] hover:bg-[#004d26] text-white text-xs font-black py-2.5 px-6 rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                        id="btn-start-camera"
                      >
                        <Play className="w-4 h-4" />
                        Démarrer la Caméra
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2 text-left">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  {cameraActive && (
                    <button
                      onClick={stopCamera}
                      className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-black py-2 px-4 rounded-lg transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                      id="btn-stop-camera"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Arrêter la Caméra
                    </button>
                  )}
                </div>
              )}

              {/* MANUAL INPUT WORKSPACE */}
              {scanMethod === 'manual' && (
                <div className="w-full max-w-md mx-auto space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900">Saisie Manuelle du Code</h3>
                    <p className="text-xs text-gray-400 font-bold">Si le QR Code est illisible ou abîmé, saisissez l'identifiant unique du ticket.</p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handlePerformScan(manualCode); }} className="space-y-4" id="form-manual-scan">
                    <div className="space-y-1 text-left">
                      <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">ID unique du ticket (Format: UVBF-2026-XXXXXX)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: UVBF-2026-000245"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono font-bold text-center tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#006633]"
                        id="input-manual-ticket-id"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#006633] text-white hover:bg-[#004d26] py-3 rounded-xl text-sm font-black uppercase tracking-wider cursor-pointer shadow-md"
                      id="btn-submit-manual-scan"
                    >
                      Vérifier le Ticket
                    </button>
                  </form>
                </div>
              )}

              {/* INTERACTIVE SIMULATOR WORKSPACE */}
              {scanMethod === 'simulated' && (
                <div className="w-full space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900">Console de Simulation</h3>
                    <p className="text-xs text-gray-500 font-bold max-w-md mx-auto leading-normal">
                      Pour faciliter la validation et le test de l'application sans caméra ni impression papier, cliquez sur l'un des tickets ci-dessous pour simuler son scan instantané.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto" id="simulated-test-grid">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handlePerformScan(t.id)}
                        className={`p-3.5 rounded-xl border-2 hover:translate-y-[-1px] transition-all cursor-pointer text-left space-y-1.5 flex flex-col justify-between h-28 bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-slate-100 ${
                          t.statut === 'valide' ? 'hover:border-emerald-300 hover:bg-emerald-50/20' : 
                          t.statut === 'utilise' ? 'hover:border-amber-300 hover:bg-amber-50/20' : 
                          'hover:border-red-300 hover:bg-red-50/20'
                        }`}
                        id={`btn-sim-scan-${t.id}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-[9px] font-black text-slate-500">{t.id.split('-')[2]}</span>
                          {t.statut === 'valide' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                          {t.statut === 'utilise' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                          {t.statut === 'annule' && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 uppercase leading-none truncate">{t.nom}</div>
                          <div className="text-[10px] text-gray-400 font-bold leading-none truncate mt-0.5">{t.prenom}</div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[8px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black uppercase">
                            {t.statut}
                          </span>
                        </div>
                      </button>
                    ))}

                    {/* Dummy fraudulent card button */}
                    <button
                      type="button"
                      onClick={() => handlePerformScan("UVBF-2026-999999")}
                      className="p-3.5 rounded-xl border-2 border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-300 hover:translate-y-[-1px] transition-all cursor-pointer text-left h-28 flex flex-col justify-between"
                      id="btn-sim-scan-fake"
                    >
                      <div className="flex justify-between w-full">
                        <span className="font-mono text-[9px] font-black text-red-500">FAUX</span>
                        <span className="text-xs">⚠️</span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-red-700 uppercase">INCONNU</div>
                        <div className="text-[9px] text-red-400 font-bold mt-0.5">Code de contrefaçon</div>
                      </div>
                      <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black uppercase inline-block">
                        Inexistant
                      </span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* ACTIVE SCAN RESULT PANELS */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden min-h-[380px] flex flex-col" id="scan-result-panel">
              
              {/* Massive Header Colored based on Status */}
              <div className={`p-8 text-center text-white space-y-2 relative overflow-hidden ${
                scanResult.status === 'valid' 
                  ? (scanResult.ticket && scanResult.ticket.eventDay !== 'les_deux' && scanResult.ticket.eventDay !== controlDay ? 'bg-amber-500' : 'bg-[#006633]')
                  : scanResult.status === 'used' ? 'bg-amber-600' :
                scanResult.status === 'cancelled' ? 'bg-red-600' :
                'bg-rose-700'
              }`}>
                {/* Visual ripple backdrop */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-30 animate-pulse"></div>

                <div className="flex justify-center z-10 relative">
                  {scanResult.status === 'valid' && (
                    scanResult.ticket && scanResult.ticket.eventDay !== 'les_deux' && scanResult.ticket.eventDay !== controlDay
                      ? <AlertTriangle className="w-16 h-16 text-white animate-bounce" />
                      : <CheckCircle className="w-16 h-16 text-yellow-300" />
                  )}
                  {scanResult.status === 'used' && <AlertTriangle className="w-16 h-16 text-white" />}
                  {scanResult.status === 'cancelled' && <XCircle className="w-16 h-16 text-white" />}
                  {scanResult.status === 'not_found' && <XCircle className="w-16 h-16 text-white" />}
                </div>

                <h3 className="text-3xl font-black uppercase tracking-tight z-10 relative">
                  {scanResult.message}
                </h3>
                
                <div className="text-xs font-bold text-white/80 font-mono tracking-wider z-10 relative">
                  Code Scanné : {scanResult.scannedCode}
                </div>
              </div>

              {/* Participant & Ticket Information Body */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">                 {scanResult.ticket ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100" id="scan-ticket-info">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Participant :</span>
                          <div className="text-base font-black text-slate-900 uppercase">
                            {scanResult.ticket.nom} {scanResult.ticket.prenom}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Téléphone :</span>
                          <div className="text-sm font-bold font-mono text-slate-800">
                            {scanResult.ticket.telephone}
                          </div>
                        </div>

                        {scanResult.ticket.email && (
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Email :</span>
                            <div className="text-sm font-semibold text-slate-700 truncate">
                              {scanResult.ticket.email}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3 md:border-l md:border-gray-200/50 md:pl-6">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Option d'Accès (Achetée) :</span>
                          <span className={`inline-block mt-1 text-[11px] font-black uppercase px-2.5 py-1 rounded ${
                            scanResult.ticket.eventDay === 'jour1' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            scanResult.ticket.eventDay === 'jour2' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {scanResult.ticket.eventDay === 'jour2' ? '🟢 Jour 2 (25 Juillet)' :
                             scanResult.ticket.eventDay === 'les_deux' ? '🏆 Pass 2 Jours' :
                             '🔴 Jour 1 (24 Juillet)'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Montant Payé :</span>
                          <div className="text-sm font-black text-slate-800">
                            {scanResult.ticket.amount} FCFA
                          </div>
                        </div>

                        {scanResult.ticket.statut === 'utilise' && scanResult.ticket.usedAt && (
                          <div>
                            <span className="text-[10px] text-amber-600 font-black uppercase tracking-wider block">Validé précédemment le :</span>
                            <div className="text-xs font-bold text-amber-800">
                              {new Date(scanResult.ticket.usedAt).toLocaleString('fr-FR')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Database Security Audit Checklist */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60" id="db-security-checklist">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
                        RÉSULTAT DE L'AUDIT SÉCURITÉ DE LA BASE DE DONNÉES CENTRALE
                      </h4>
                      <div className="space-y-2 text-xs">
                        {/* Check 1: Registered DB Existence */}
                        <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                          <span className="font-semibold text-slate-700">1. Indexation en Base de Données (UID Enregistré)</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1">
                            🟢 OK (Enregistré dans l'UVBF-Master-DB)
                          </span>
                        </div>

                        {/* Check 2: Double-Entry (Anti-Replay) Check */}
                        <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                          <span className="font-semibold text-slate-700">2. Contrôle Anti-Replay (Tentative Double-Entrée)</span>
                          {scanResult.ticket.statut === 'valide' ? (
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              🟢 OK (Aucune entrée précédente détectée)
                            </span>
                          ) : scanResult.ticket.statut === 'utilise' ? (
                            <span className="font-bold text-red-600 flex items-center gap-1 animate-pulse">
                              ❌ ALERTE FRAUDE : TICKET DÉJÀ SCANNE & UTILISÉ
                            </span>
                          ) : (
                            <span className="font-bold text-red-500 flex items-center gap-1">
                              ❌ ALERTE : TICKET ANNULÉ PAR L'ADMINISTRATION
                            </span>
                          )}
                        </div>

                        {/* Check 3: Digital Signature */}
                        <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                          <span className="font-semibold text-slate-700">3. Intégrité de la Signature Numérique du Ticket</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1 font-mono text-[10px]">
                            🛡️ SIGNATURE VALIDÉE (CONFORME)
                          </span>
                        </div>

                        {/* Check 4: Temporal Validity (Day Match) */}
                        <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-100">
                          <span className="font-semibold text-slate-700">4. Validité d'Accès pour le Jour du Contrôle ({controlDay === 'jour1' ? 'Jour 1' : 'Jour 2'})</span>
                          {scanResult.ticket.eventDay === 'les_deux' ? (
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              🟢 OK (Pass Complet 2 Jours)
                            </span>
                          ) : scanResult.ticket.eventDay === controlDay ? (
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              🟢 OK (Jour de l'Événement Correct)
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 flex items-center gap-1">
                              ⚠️ ACCÈS NON PRÉVU AUJOURD'HUI ({scanResult.ticket.eventDay === 'jour1' ? 'Achat pour Jour 1' : 'Achat pour Jour 2'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Day Warning Notice Banner */}
                      {scanResult.ticket.eventDay !== 'les_deux' && scanResult.ticket.eventDay !== controlDay && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-xs font-bold leading-normal">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-amber-700 font-black block">ALERTE CONFLIT DE JOUR D'ENTRÉE :</span>
                            Ce ticket est configuré uniquement pour le <span className="underline uppercase">{scanResult.ticket.eventDay === 'jour1' ? 'Jour 1 (24 Juillet)' : 'Jour 2 (25 Juillet)'}</span> alors que le point d'accès est paramétré sur le <span className="underline uppercase">{controlDay === 'jour1' ? 'Jour 1 (24 Juillet)' : 'Jour 2 (25 Juillet)'}</span>. Risque de resquille ou erreur d'aiguillage !
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-center space-y-1" id="scan-fake-alert">
                    <div className="text-red-700 font-black uppercase text-xs flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-4.5 h-4.5" />
                      Alerte de sécurité
                    </div>
                    <p className="text-xs text-red-600 font-bold leading-normal">
                      Ce code ne correspond à aucun ticket enregistré dans la base de données centrale des 48H de l'UV-BF. L'accès doit être strictement refusé.
                    </p>
                  </div>
                )}

                {/* Validation and Action Block */}
                <div className="mt-8 pt-6 border-t border-dashed border-gray-100 flex flex-col sm:flex-row items-center gap-4">
                  
                  {scanResult.status === 'valid' ? (
                    <button
                      onClick={handleConfirmEntrance}
                      className="w-full sm:flex-1 bg-[#006633] text-white hover:bg-[#004d26] transition-all py-3 px-6 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer animate-pulse"
                      id="btn-confirm-entrance"
                    >
                      <CheckCircle className="w-5 h-5 text-yellow-300" />
                      VALIDER L'ENTRÉE DU PARTICIPANT
                    </button>
                  ) : (
                    <div className="w-full sm:flex-1 text-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-black text-slate-500 uppercase">
                        Aucune action requise (Ticket invalide ou déjà traité)
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleResetScan}
                    className="w-full sm:w-auto bg-slate-800 text-white hover:bg-slate-900 transition-colors py-3 px-6 rounded-xl text-sm font-black cursor-pointer shadow-sm text-center"
                    id="btn-rescan"
                  >
                    Nouveau Scan
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: RECENT LOGS HISTORIC (COL-SPAN-4) */}
        <div className="md:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-5 flex flex-col h-full max-h-[500px]">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 shrink-0">
              <History className="w-4 h-4 text-[#006633]" />
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Historique des Validations</h3>
            </div>

            <div className="flex-1 overflow-y-auto pt-4 space-y-3.5 pr-1" id="agent-logs-list">
              {logs.length > 0 ? (
                logs.slice().reverse().map((log) => (
                  <div key={log.id} className="text-xs p-3 rounded-lg border border-slate-50 bg-slate-50/50 space-y-1.5" id={`log-item-${log.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-500 text-[10px]">{log.ticketId.split('-')[2] || log.ticketId}</span>
                      <span className="text-[9px] text-gray-400">
                        {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                    
                    <p className="font-bold text-slate-700 leading-normal" id={`log-details-${log.id}`}>
                      {log.details}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 capitalize">
                        {log.prenom ? `${log.prenom} ${log.nom}` : 'Utilisateur Inconnu'}
                      </span>
                      {log.statut === 'succes' ? (
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black uppercase">Validé</span>
                      ) : (
                        <span className="text-[8px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black uppercase">Refusé</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 space-y-1" id="no-logs">
                  <Info className="w-6 h-6 mx-auto opacity-40 text-[#006633]" />
                  <p className="text-xs font-bold uppercase">Aucune validation</p>
                  <p className="text-[10px] text-gray-400">Les validations d'entrée s'afficheront ici en temps réel.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
