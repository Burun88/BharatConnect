
'use server';
// THIS SERVER ACTION IS NOW OBSOLETE.
// User search functionality has been moved to the client-side in src/app/search/page.tsx.
// This file can be safely deleted from the project after confirming client-side search works.

import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt, doc, getDoc } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export interface SearchUserActionDiagnostics {
  log: string[];
  directFetchResult?: string | null;
  testQueryResult?: string | null;
  nameQueryCount?: number;
  emailQueryCount?: number;
  usernameQueryCount?: number;
}

export interface SearchUserActionResult {
  users: BharatConnectFirestoreUser[];
  diagnostics: SearchUserActionDiagnostics;
}

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<SearchUserActionResult> {
  const diagnostics: SearchUserActionDiagnostics = { log: [] };
  diagnostics.log.push("-------------------- OBSOLETE SEARCH ACTION CALLED --------------------");
  diagnostics.log.push(`[SearchAction OBSOLETE] Called with searchTerm: "${searchTerm}", currentUserIdToExclude: "${currentUserIdToExclude}"`);
  diagnostics.log.push("[SearchAction OBSOLETE] This action should no longer be used. Client-side search is implemented.");
  
  console.warn("[SearchAction OBSOLETE] searchUsersAction was called. This action is obsolete and should be removed.");

  return { users: [], diagnostics };
}

