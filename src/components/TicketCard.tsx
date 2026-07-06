/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import domtoimage from 'dom-to-image-more';
import { jsPDF } from 'jspdf';
import { Ticket, AppSettings } from '../types';
import { Download, Printer, CheckCircle, Mail, Phone, Calendar, MapPin, Share2, AlertCircle, X, Copy, Check, FileText } from 'lucide-react';
import logoSvg from '../../assets/uvbf-logo.svg';

interface TicketCardProps {
  ticket: Ticket;
  settings: AppSettings;
}

export default function TicketCard({ ticket, settings }: TicketCardProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [renderedPdfUrl, setRenderedPdfUrl] = useState<string | null>(null);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (renderedPdfUrl) {
        URL.revokeObjectURL(renderedPdfUrl);
      }
    };
  }, [renderedPdfUrl]);

  const triggerFileDownload = (blobUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      // Wait for all elements to fully render (QR code, fonts, etc.)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // dom-to-image-more uses SVG foreignObject — renders CSS perfectly including Tailwind
      const dataUrl = await domtoimage.toPng(ticketRef.current, {
        scale: 2,
        bgcolor: '#ffffff',
        style: {
          overflow: 'visible',
        },
      });

      // Show preview modal
      setRenderedImage(dataUrl);
      setShowShareModal(true);

      // Trigger direct download
      const link = document.createElement('a');
      link.download = `Ticket_UVBF_48H_${ticket.id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      console.error('PNG generation error:', err);
      setDownloadError('Erreur de capture PNG. Essayez "Télécharger en PDF" ou le bouton Imprimer.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ticketRef.current) return;
    setDownloadingPdf(true);
    setDownloadError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Generate PNG of the ticket using dom-to-image-more
      const dataUrl = await domtoimage.toPng(ticketRef.current, {
        scale: 2,
        bgcolor: '#ffffff',
        style: {
          overflow: 'visible',
        },
      });

      // Build a landscape A4 PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 8;
      const imageWidth = pageWidth - margin * 2;

      // Calculate height proportionally from the rendered element
      const el = ticketRef.current;
      const ratio = el.offsetHeight / el.offsetWidth;
      const imageHeight = imageWidth * ratio;

      pdf.addImage(dataUrl, 'PNG', margin, margin, imageWidth, imageHeight);

      // Direct download — no popup needed
      const idPart = ticket.id.split('-')[2] || ticket.id;
      pdf.save(`Ticket_UVBF_2026_${idPart}.pdf`);

      // Show PDF viewer modal
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (renderedPdfUrl) URL.revokeObjectURL(renderedPdfUrl);
      setRenderedPdfUrl(pdfUrl);
      setShowPdfModal(true);

    } catch (err) {
      console.error('PDF generation error:', err);
      setDownloadError('Erreur PDF. Essayez le bouton Imprimer (PDF) à droite.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `Bonjour ${ticket.prenom} ${ticket.nom}, voici votre ticket d'entrée pour les 48H de l'UVBF !\n\n` +
      `🎟️ ID du Ticket : ${ticket.id}\n` +
      `📅 Programme : ${ticket.eventDay === 'jour1'
        ? 'Jour 1 : Soirée Cinématographique (1000F)'
        : ticket.eventDay === 'jour2'
          ? 'Jour 2 : Soirée Culturelle (500F)'
          : 'Pass Complet 2 Jours (1500F)'
      }\n` +
      `💵 Montant : ${ticket.amount} FCFA\n\n` +
      `🔒 Présentez ce message à l'entrée de l'événement pour validation.`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          fallbackCopyText(text);
        });
      } else {
        fallbackCopyText(text);
      }
    } catch (e) {
      fallbackCopyText(text);
    }
  };

  const fallbackCopyText = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert("Veuillez sélectionner le texte ci-dessous pour le copier manuellement.");
    }
    document.body.removeChild(textArea);
  };

  const handleDownloadFromModal = () => {
    if (!renderedImage) return;
    const link = document.createElement('a');
    link.download = `Ticket_UVBF_48H_${ticket.id}.png`;
    link.href = renderedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedPhone = ticket.telephone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${formattedPhone.startsWith('226') ? formattedPhone : '226' + formattedPhone
    }?text=${encodeURIComponent(
      `Bonjour ${ticket.prenom} ${ticket.nom}, voici votre ticket d'entrée pour les 48H de l'UVBF !\n\n` +
      `🎟️ ID du Ticket : ${ticket.id}\n` +
      `📅 Programme : ${ticket.eventDay === 'jour1'
        ? 'Jour 1 : Soirée Cinématographique (1000F)'
        : ticket.eventDay === 'jour2'
          ? 'Jour 2 : Soirée Culturelle (500F)'
          : 'Pass Complet 2 Jours (1500F)'
      }\n` +
      `💵 Montant : ${ticket.amount} FCFA\n\n` +
      `🔒 Présentez ce message ou l'image téléchargée à l'entrée pour validation.`
    )}`;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4" id={`ticket-container-${ticket.id}`}>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <button
          onClick={handleDownloadImage}
          disabled={downloading || downloadingPdf}
          className="flex items-center gap-2 bg-[#006633] text-white hover:bg-[#004d26] transition-all px-5 py-3 rounded-xl text-sm font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          id={`btn-download-${ticket.id}`}
        >
          <Download className="w-4.5 h-4.5" />
          {downloading ? "Génération de l'image..." : "Télécharger / Partager PNG"}
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading || downloadingPdf}
          className="flex items-center gap-2 bg-rose-700 text-white hover:bg-rose-800 transition-all px-5 py-3 rounded-xl text-sm font-black shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          id={`btn-download-pdf-${ticket.id}`}
        >
          <FileText className="w-4.5 h-4.5" />
          {downloadingPdf ? "Génération du PDF..." : "Télécharger en PDF"}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-900 transition-colors px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm cursor-pointer"
          id={`btn-print-${ticket.id}`}
        >
          <Printer className="w-4 h-4" />
          Imprimer (PDF)
        </button>
      </div>

      {downloadError && (
        <div className="mb-4 text-xs text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100 print:hidden w-full max-w-2xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Ticket Wrapper - Responsive view for web, styled print view */}
      <div className="w-full overflow-x-auto py-2 flex justify-center scrollbar-none">
        {/* Exact Reproduction of the Mockup Ticket Card */}
        <div
          ref={ticketRef}
          className="relative bg-white w-[920px] h-[550px] min-w-[920px] rounded-2xl shadow-2xl border flex overflow-hidden font-sans select-none text-slate-800 border-emerald-500/30 ring-4 ring-emerald-50"
          id={`ticket-card-${ticket.id}`}

        >
          {/* LEFT PART: MAIN TICKET - 70% WIDTH */}
          <div className="flex-[7] flex flex-col justify-between p-6 bg-gradient-to-br from-white via-slate-50 to-white relative overflow-hidden">

            {/* Fine security grid background */}
            <div
              className="absolute inset-0 opacity-60 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(226,232,240,0.75) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,0.75) 1px, transparent 1px)',
                backgroundSize: '14px 24px',
                maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%)',
              }}
            ></div>

            {/* Huge watermark background seal */}
            <div className="absolute top-[35%] left-[25%] -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-4 border-[#006633]/5 flex items-center justify-center pointer-events-none select-none rotate-12">
              <span className="text-[120px] font-black text-[#006633]/[0.03] tracking-widest font-mono">UVBF</span>
            </div>

            {/* Header Area */}
            <div className="flex items-center justify-between z-10">
              {/* Logo UV-BF */}
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-[#006633] bg-white p-1 shadow-md">
                  <img src={logoSvg} alt="Logo UVBF" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-[#006633] tracking-widest leading-none">UV-BF</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">Burkina Faso</span>
                </div>
              </div>

              {/* Title event */}
              <div className="flex flex-col items-center flex-1 px-4 text-center">
                <h1 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  LES <span className="text-[#E30613]">48H</span> DE
                  <br />
                  <span className="text-[#006633]">L'UNIVERSITÉ VIRTUELLE</span>
                  <br />
                  <span className="text-xs font-bold tracking-widest text-slate-700">DU BURKINA FASO</span>
                </h1>

                <div className="mt-2 bg-[#E30613] text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-sm">
                  INNOVER • PARTAGER • RAYONNER
                </div>
              </div>

              {/* 48 HEURES Visual Badge */}
              <div className="flex flex-col items-center">
                <div className="relative flex items-center justify-center">
                  <span className="text-6xl font-black text-[#006633] tracking-tighter italic drop-shadow-sm">48</span>
                  <div className="absolute right-[-10px] bottom-1 bg-[#E30613] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase rotate-[-5deg] shadow-sm">
                    HEURES
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area with Split Columns */}
            <div className="grid grid-cols-2 gap-6 mt-3 relative border bg-white/80 rounded-2xl p-5 backdrop-blur-sm z-10 shadow-inner border-slate-100 bg-gradient-to-br from-white via-slate-50/10 to-white">
              {/* Left Column: Participant Details */}
              <div className="space-y-3 border-r border-slate-100 pr-4">
                <div className="text-[#006633] text-xs font-black tracking-widest uppercase pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                  <div className="w-2 h-3 bg-[#006633] rounded-full"></div>
                  <span>INFORMATIONS PARTICIPANT</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-slate-500">NOM</span>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nom :</div>
                    <div className="text-lg font-black text-slate-900 uppercase leading-none">{ticket.nom}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-slate-500">PRE</span>
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Prénom :</div>
                    <div className="text-lg font-bold text-slate-800 leading-none">{ticket.prenom}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-[#006633]" />
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Téléphone :</div>
                    <div className="text-sm font-black text-slate-900 font-mono whitespace-nowrap">
                      {ticket.telephone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4")}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4 text-[#006633]" />
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Option d'Accès :</div>
                    <div className="text-xs font-black text-slate-900 uppercase">
                      {settings.eventDates}
                    </div>
                    <div className={`text-xs font-black uppercase mt-1 px-2.5 py-0.5 rounded inline-block ${ticket.eventDay === 'jour1'
                        ? 'bg-rose-50 text-[#E30613] border border-rose-100'
                        : ticket.eventDay === 'jour2'
                          ? 'bg-emerald-50 text-[#006633] border border-emerald-100'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm border border-amber-600'
                      }`}>
                      {ticket.eventDay === 'jour2' ? '🟢 Jour 2 : Soirée Culturelle' :
                        ticket.eventDay === 'les_deux' ? '✨ PASS COMPLET (2 JOURS)' :
                          '🔴 Jour 1 : Cinéma Débat'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-[#006633]" />
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Lieu de l'Événement :</div>
                    <div className="text-xs font-bold text-slate-700 leading-tight">{settings.eventLocation}</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Ticket Number, Badge and Validation */}
              <div className="flex flex-col justify-between items-center text-center pl-4 py-1">
                <div className="w-full">
                  <span className="text-[9px] bg-[#006633] text-white px-3.5 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm">
                    Numéro de Ticket
                  </span>
                  <div className="mt-3 border-2 border-dashed border-[#006633]/30 bg-[#006633]/5 rounded-xl py-3 px-4 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Identifiant d'accès</span>
                    <span className="text-2xl font-black font-mono tracking-wider text-slate-900">
                      {ticket.id.split('-').slice(0, 2).join('-')}-<span className="text-[#E30613]">{ticket.id.split('-')[2]}</span>
                    </span>
                  </div>
                </div>

                {/* Subtext and Holographic Security seal */}
                <div className="relative my-2 w-full flex items-center justify-center">
                  <div className="absolute inset-0 border border-dashed border-amber-300 bg-amber-50/50 rounded-xl p-2 flex flex-col justify-center items-center opacity-30 select-none pointer-events-none rotate-3">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">AUTHENTIQUE</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 leading-tight max-w-[200px] py-1.5 border-y border-slate-100 z-10 bg-white/90 rounded-md">
                    CE TICKET EST STRICTEMENT PERSONNEL ET DONNE DROIT À UNE SEULE ENTRÉE SECURISEE.
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 animate-pulse">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <span className="text-[9px] font-black text-[#006633] mt-1.5 uppercase tracking-wider">
                    ✓ ACCÈS CRIPTÉ & VALIDE
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Area with Wave & Price */}
            <div
              className="h-16 mt-3 rounded-xl flex items-center justify-between px-6 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #006633 0%, #0b7a41 45%, #003d20 100%)' }}
            >
              {/* background design waves */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40"></div>

              <div className="flex items-center gap-4 z-10">
                <div className="border-2 border-white/80 rounded-xl px-4 py-1.5 font-black text-xl tracking-wider bg-white/10 flex items-center gap-1.5 shadow-sm">
                  <span className="text-[11px] font-medium text-white/90">TARIF :</span>
                  <span className="text-yellow-300 font-mono font-black text-2xl">{ticket.amount}</span>
                  <span className="text-xs font-black text-white/95">FCFA</span>
                </div>
                <div className="h-8 w-[1px] bg-white/20"></div>
                <div className="flex flex-col text-left">
                  <span className="text-[8px] text-white/70 font-semibold uppercase leading-none">Organisé par</span>
                  <span className="text-[11px] font-black text-white leading-tight">L'Université Virtuelle du Burkina Faso</span>
                </div>
              </div>

              {/* Socials & Info */}
              <div className="flex items-center gap-2.5 z-10 text-white/80">
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[10px] font-black font-serif">f</div>
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[10px] font-black">X</div>
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[10px] font-black">in</div>
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-white/5 text-[10px] font-black">yt</div>
              </div>
            </div>
          </div>

          {/* DASHED SEPARATOR */}
          <div className="relative w-0 flex items-center justify-center border-l-2 border-dashed border-slate-300">
            {/* Top punch card hole */}
            <div className="absolute top-[-12px] left-[-12px] w-6 h-6 bg-slate-900 rounded-full border border-gray-100 z-10 shadow-inner"></div>
            {/* Bottom punch card hole */}
            <div className="absolute bottom-[-12px] left-[-12px] w-6 h-6 bg-slate-900 rounded-full border border-gray-100 z-10 shadow-inner"></div>
          </div>

          {/* RIGHT PART: THE STUB / SOUVENIR - 30% WIDTH */}
          <div
            className="flex-[3] text-white flex flex-col justify-between p-5 text-center relative"
            style={{ background: 'linear-gradient(145deg, #004d26 0%, #006633 45%, #103d2b 100%)' }}
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 48%)' }}></div>

            {/* Stub Header */}
            <div>
              <div className="text-xs font-black tracking-widest uppercase mb-1">
                COUPON DE CONTRÔLE
              </div>
              <div className="flex justify-center gap-1.5 text-yellow-300 mb-3 text-xs">
                <span>★</span><span>★</span><span>★</span>
              </div>
            </div>

            {/* QR CODE CONTAINER */}
            <div ref={qrContainerRef} className="bg-white p-3.5 rounded-2xl mx-auto inline-block shadow-xl border border-emerald-950/20 relative">
              <QRCodeCanvas
                value={ticket.id}
                size={140}
                level="H"
                includeMargin={false}
              />
              {/* Tiny Center Icon */}
              <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white border border-gray-100 shadow flex items-center justify-center p-0.5">
                <div className="w-full h-full rounded-full bg-[#006633] flex items-center justify-center text-white font-black text-[7px]">
                  UVBF
                </div>
              </div>
            </div>

            {/* ID & LOCK BADGE */}
            <div className="mt-2 space-y-1.5">
              <span className="font-mono text-[11px] font-black tracking-widest bg-black/30 px-3 py-1 rounded-full border border-white/10 block truncate">
                {ticket.id}
              </span>

              <div className="flex items-center justify-center gap-1.5 text-[9px] text-emerald-200 mt-2 font-bold uppercase tracking-wider">
                <div className="w-4 h-4 rounded bg-black/40 flex items-center justify-center">
                  <span className="text-[10px]">🔒</span>
                </div>
                <span>CYBER-SÉCURISÉ</span>
              </div>
            </div>

            {/* Stub Footer details */}
            <div className="border-t border-dashed border-white/20 pt-3 flex flex-col items-center gap-1">
              <div className="text-[10px] font-black text-yellow-300 uppercase tracking-widest px-3 py-0.5 bg-black/30 rounded-full border border-white/5">
                {ticket.eventDay === 'jour1' ? '🔴 ACCÈS JOUR 1' :
                  ticket.eventDay === 'jour2' ? '🟢 ACCÈS JOUR 2' :
                    '🏆 ACCÈS GLOBAL'}
              </div>
              <div className="flex items-center gap-1 text-[9px] font-bold tracking-wide uppercase text-white/80 mt-1">
                <Calendar className="w-3 h-3 text-yellow-300 shrink-0" />
                <span>{settings.eventDates}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket metadata / validation badge under the ticket */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 print:hidden">
        {ticket.statut === 'valide' && (
          <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            TICKET ACTIF • PRÊT À ÊTRE SCANNE
          </span>
        )}
        {ticket.statut === 'utilise' && (
          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            UTILISÉ {ticket.usedAt ? `le ${new Date(ticket.usedAt).toLocaleString('fr-FR')}` : ''}
          </span>
        )}
        {ticket.statut === 'annule' && (
          <span className="px-3 py-1 rounded-full bg-red-100 border border-red-200 text-red-800 text-xs font-black flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            TICKET ANNULÉ • ACCÈS REFUSÉ
          </span>
        )}
      </div>

      {/* SHARE / DOWNLOAD FALLBACK MODAL */}
      {showShareModal && renderedImage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span className="text-emerald-600">🎉</span> Ticket d'Entrée Prêt !
                </h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">
                  Choisissez l'une des méthodes ci-dessous pour envoyer le ticket facilement.
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rendered Image Preview with instructions */}
            <div className="space-y-3">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider block text-left">
                📸 Image du Ticket (Générée avec succès) :
              </div>

              <div className="relative group bg-slate-50 rounded-xl p-3 border border-slate-200 flex justify-center">
                <img
                  src={renderedImage}
                  alt="Ticket UVBF"
                  className="w-full h-auto rounded-lg shadow-md max-h-[250px] object-contain border border-white"
                />
              </div>

              {/* Explicit Simple Mobile / PC Guidance */}
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-2.5 text-left">
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-black uppercase">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Comment télécharger & envoyer facilement ?</span>
                </div>

                <ul className="text-xs text-amber-800 space-y-1.5 font-semibold list-disc pl-4 leading-normal">
                  <li>
                    <b className="text-amber-950">Sur Téléphone Portable :</b> Faites un <b className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-950 animate-pulse">appui long sur l'image</b> ci-dessus, puis sélectionnez <b className="text-amber-950">"Enregistrer l'image"</b> ou <b className="text-amber-950">"Partager"</b> pour l'envoyer sur WhatsApp !
                  </li>
                  <li>
                    <b className="text-amber-950">Sur Ordinateur :</b> Faites un <b className="text-amber-950">clic droit</b> sur l'image et choisissez <b className="text-amber-950">"Enregistrer l'image sous..."</b>.
                  </li>
                  <li>
                    <b className="text-amber-950">Si le téléchargement s'est lancé :</b> Retrouvez le fichier sous le nom <code className="bg-amber-100/50 px-1 font-mono">Ticket_UVBF_48H_{ticket.id.split('-')[2]}.png</code>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Direct Send Buttons / Options */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Retry file download */}
                <button
                  onClick={handleDownloadFromModal}
                  className="w-full bg-[#006633] text-white hover:bg-[#004d26] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le fichier PNG
                </button>

                {/* 2. Direct WhatsApp API */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer"
                >
                  <span>💬</span>
                  Partager via WhatsApp
                </a>
              </div>

              {/* 3. Text copy helper */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-left">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-400 font-black uppercase">Message d'accompagnement :</div>
                  <div className="text-xs font-semibold text-slate-700 truncate font-mono mt-0.5">
                    Bonjour {ticket.prenom} {ticket.nom}, voici votre ticket...
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copier le texte</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Close footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fermer la fenêtre
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PDF DOWNLOAD FALLBACK MODAL */}
      {showPdfModal && renderedPdfUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden" id={`pdf-modal-${ticket.id}`}>
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span className="text-rose-600">📄</span> Document PDF Prêt !
                </h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">
                  Votre billet au format officiel PDF A4 pour l'impression a été généré avec succès.
                </p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Icon / Presentation */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-3 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <span className="text-sm font-black text-slate-800">
                Ticket_UVBF_48H_{ticket.id.split('-')[2] || ticket.id}.pdf
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                Format A4 Officiel • Avec QR Code de sécurité
              </span>
            </div>

            {/* Instruction block for PDF downloading inside sandboxed frames / Safari */}
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2.5 text-left">
              <div className="flex items-center gap-1.5 text-rose-950 text-xs font-black uppercase">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Consignes de téléchargement :</span>
              </div>

              <ul className="text-xs text-rose-800 space-y-1.5 font-semibold list-disc pl-4 leading-normal">
                <li>
                  <b className="text-rose-950">Téléchargement direct :</b> Cliquez sur le gros bouton rouge ci-dessous pour lancer le téléchargement du PDF.
                </li>
                <li>
                  <b className="text-rose-950">Bloqué par le navigateur ou l'aperçu ?</b> Si rien ne se passe, cliquez sur <b className="text-rose-950">"Ouvrir dans un nouvel onglet"</b> pour visualiser et enregistrer le PDF directement depuis votre navigateur.
                </li>
                <li>
                  <b className="text-rose-950">Conseil ultime :</b> Pour un fonctionnement optimal sans restriction, ouvrez l'application dans un <b className="text-rose-950">nouvel onglet</b> à l'aide du bouton en haut de l'écran.
                </li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Direct PDF download link */}
                <a
                  href={renderedPdfUrl}
                  download={`Ticket_UVBF_2026_${ticket.id.split('-')[2] || ticket.id}.pdf`}
                  className="w-full bg-rose-700 hover:bg-rose-800 text-white py-3.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le PDF
                </a>

                {/* 2. Open in new tab fallback */}
                <a
                  href={renderedPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all text-center cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            </div>

            {/* Close footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fermer la fenêtre
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
