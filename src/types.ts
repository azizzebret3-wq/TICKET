/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TicketStatus = 'valide' | 'utilise' | 'annule';

export interface Ticket {
  id: string; // e.g. UVBF-2026-000245
  seq: number; // sequential sequence number
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  statut: TicketStatus;
  createdAt: string; // ISO datetime
  usedAt?: string; // ISO datetime when validated
  paymentMethod: 'orange_money' | 'moov_money' | 'especes';
  paymentRef: string;
  amount: number; // 500 FCFA
  eventDay?: 'jour1' | 'jour2' | 'les_deux';
}

export interface ValidationLog {
  id: string;
  ticketId: string;
  timestamp: string;
  statut: 'succes' | 'deja_utilise' | 'inexistant' | 'annule';
  details: string;
  nom?: string;
  prenom?: string;
}

export interface AppSettings {
  eventName: string;
  eventDates: string;
  eventLocation: string;
  ticketPrice: number;
  promoCode: string;
  promoDiscount: number;
}
