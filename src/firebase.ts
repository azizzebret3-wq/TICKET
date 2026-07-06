/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  deleteDoc,
  runTransaction
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';

// Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyC4QtxQqSoKtNBTZrv-aim7tDAUc-ll4zM",
  authDomain: "tiket-33d24.firebaseapp.com",
  projectId: "tiket-33d24",
  storageBucket: "tiket-33d24.firebasestorage.app",
  messagingSenderId: "2502323579",
  appId: "1:2502323579:web:4a5f62993435e8e05021de",
  measurementId: "G-TBSRJD7Z8R"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Initialize Firestore with the default database for this project
export const db = initializeFirestore(app, {});

// Initialize Auth
export const auth = getAuth(app);

// Collection References
export const TICKETS_COLL = 'tickets';
export const LOGS_COLL = 'logs';
export const SETTINGS_COLL = 'settings';
export const SETTINGS_DOC_ID = 'global';

// Ensure the user is signed in (anonymously by default on launch)
export async function ensureAuthenticated(): Promise<FirebaseUser> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const credential = await signInAnonymously(auth);
          unsubscribe();
          resolve(credential.user);
        } catch (error) {
          console.error("Firebase Anonymous Auth failed:", error);
          unsubscribe();
          reject(error);
        }
      }
    });
  });
}

// Settings Synchronization Helpers
export function subscribeSettings(onUpdate: (settings: any) => void) {
  const settingsDocRef = doc(db, SETTINGS_COLL, SETTINGS_DOC_ID);
  return onSnapshot(settingsDocRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data());
    } else {
      // Default fallback settings
      const defaultSettings = {
        eventName: "Les 48H de l'Université Virtuelle du Burkina Faso",
        eventDates: "24 au 25 Juillet 2026",
        eventLocation: "Université Virtuelle du Burkina Faso (ENO de Karpala)",
        ticketPrice: 500,
        promoCode: "UVBF2026",
        promoDiscount: 50
      };
      setDoc(settingsDocRef, defaultSettings).then(() => {
        onUpdate(defaultSettings);
      }).catch(err => {
        console.error("Error creating default settings:", err);
      });
    }
  }, (error) => {
    console.error("Error subscribing to settings:", error);
  });
}

export async function saveSettingsInFirestore(settings: any) {
  const settingsDocRef = doc(db, SETTINGS_COLL, SETTINGS_DOC_ID);
  await setDoc(settingsDocRef, settings, { merge: true });
}

export async function initializeFirestoreBasics() {
  await ensureAuthenticated();

  const defaultSettings = {
    eventName: "Les 48H de l'Université Virtuelle du Burkina Faso",
    eventDates: "24 au 25 Juillet 2026",
    eventLocation: "Université Virtuelle du Burkina Faso (ENO de Karpala)",
    ticketPrice: 500,
    promoCode: "UVBF2026",
    promoDiscount: 50
  };

  await saveSettingsInFirestore(defaultSettings);
}

// Tickets Synchronization Helpers
export function subscribeTickets(onUpdate: (tickets: any[]) => void) {
  const ticketsQuery = query(collection(db, TICKETS_COLL), orderBy('seq', 'asc'));
  return onSnapshot(ticketsQuery, (querySnapshot) => {
    const ticketsList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      ticketsList.push({ id: docSnap.id, ...docSnap.data() });
    });
    onUpdate(ticketsList);
  }, (error) => {
    console.error("Error subscribing to tickets:", error);
  });
}

export async function saveTicketInFirestore(ticket: any) {
  const ticketDocRef = doc(db, TICKETS_COLL, ticket.id);
  await setDoc(ticketDocRef, ticket, { merge: true });
}

export async function updateTicketInFirestore(ticketId: string, fieldsToUpdate: any) {
  const ticketDocRef = doc(db, TICKETS_COLL, ticketId);
  await updateDoc(ticketDocRef, fieldsToUpdate);
}

// Logs Synchronization Helpers
export function subscribeLogs(onUpdate: (logs: any[]) => void) {
  const logsQuery = query(collection(db, LOGS_COLL), orderBy('timestamp', 'desc'), limit(150));
  return onSnapshot(logsQuery, (querySnapshot) => {
    const logsList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      logsList.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Return them sorted by timestamp ascending for internal App representation or descending for easy logs view
    onUpdate(logsList.reverse());
  }, (error) => {
    console.error("Error subscribing to logs:", error);
  });
}

export async function saveLogInFirestore(log: any) {
  const logDocRef = doc(db, LOGS_COLL, log.id);
  await setDoc(logDocRef, log, { merge: true });
}

// Atomic Validation Transaction to guarantee anti-fraud double-entry prevention
export async function validateTicketWithTransaction(ticketId: string): Promise<{ success: boolean; message: string; ticket?: any }> {
  const ticketDocRef = doc(db, TICKETS_COLL, ticketId);
  try {
    const result = await runTransaction(db, async (transaction) => {
      const ticketDoc = await transaction.get(ticketDocRef);
      if (!ticketDoc.exists()) {
        return { success: false, message: "Ticket inexistant dans la base centrale." };
      }
      const ticketData = ticketDoc.data();
      if (ticketData.statut === 'annule') {
        return { success: false, message: "Ce ticket a été annulé par l'administration." };
      }
      if (ticketData.statut === 'utilise') {
        return { success: false, message: "Ce ticket a déjà été utilisé ! Double validation interdite." };
      }

      const usedAt = new Date().toISOString();
      transaction.update(ticketDocRef, {
        statut: 'utilise',
        usedAt: usedAt
      });

      return {
        success: true,
        message: "Ticket validé avec succès !",
        ticket: { ...ticketData, id: ticketId, statut: 'utilise', usedAt }
      };
    });
    return result;
  } catch (error: any) {
    console.error("Anti-fraud validation transaction failed:", error);
    return { success: false, message: "Erreur de connexion avec le serveur central. Veuillez réessayer." };
  }
}
