/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ticket, ValidationLog, AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  eventName: "Les 48H de l'Université Virtuelle du Burkina Faso",
  eventDates: "24 au 25 Juillet 2026",
  eventLocation: "Université Virtuelle du Burkina Faso (ENO de Karpala)",
  ticketPrice: 500,
  promoCode: "UVBF2026",
  promoDiscount: 50, // FCFA discount
};

// Test ticket for offline demo/debugging - will be cleared when Firebase loads real data
export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'test-2026-001',
    seq: 1,
    nom: 'OUEDRAOGO',
    prenom: 'Ibrahim',
    telephone: '70123456',
    email: 'ibrahim.ouedraogo@uvbf.bf',
    statut: 'valide',
    paymentMethod: 'orange_money',
    paymentRef: 'TEST-REF-001',
    amount: 1000,
    eventDay: 'jour1',
    createdAt: new Date().toISOString(),
    usedAt: null
  }
];

export const INITIAL_LOGS: ValidationLog[] = [];
