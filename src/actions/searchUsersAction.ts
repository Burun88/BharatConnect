
'use server';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<BharatConnectFirestoreUser[]> {
  const trimmedSearchTerm = searchTerm.trim();
  if (!trimmedSearchTerm) {
    console.log("[SearchAction] Search term is empty after trimming. Returning empty array.");
    return [];
  }
  const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
  console.log(`[SearchAction] Original search term: "${searchTerm}", Lowercase search term for query: "${lowerSearchTerm}"`);

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // Query by displayName (which is stored as lowercase)
  const nameQuery = query(
    usersRef,
    orderBy('displayName'), // Expects 'displayName' field in Firestore to be lowercase
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by email (which is stored as lowercase)
  const emailQuery = query(
    usersRef,
    orderBy('email'), // Expects 'email' field in Firestore to be lowercase
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    console.log(`[SearchAction] Executing nameQuery against 'displayName' (expected lowercase) with term: "${lowerSearchTerm}"`);
    const nameSnapshot = await getDocs(nameQuery);
    console.log(`[SearchAction] Name query returned ${nameSnapshot.size} documents.`);
    nameSnapshot.forEach(doc => {
      console.log(`[SearchAction] Raw data from name query for doc ${doc.id}:`, JSON.stringify(doc.data()));
    });

    console.log(`[SearchAction] Executing emailQuery against 'email' (expected lowercase) with term: "${lowerSearchTerm}"`);
    const emailSnapshot = await getDocs(emailQuery);
    console.log(`[SearchAction] Email query returned ${emailSnapshot.size} documents.`);
     emailSnapshot.forEach(doc => {
      console.log(`[SearchAction] Raw data from email query for doc ${doc.id}:`, JSON.stringify(doc.data()));
    });

    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    nameSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      if (userData.id !== currentUserIdToExclude) {
        // Use originalDisplayName for display if available, otherwise the (lowercase) displayName
        usersMap.set(userData.id, { ...userData, displayName: userData.originalDisplayName || userData.displayName });
      }
    });

    emailSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      if (userData.id !== currentUserIdToExclude && !usersMap.has(userData.id)) {
        // Use originalDisplayName for display if available
        usersMap.set(userData.id, { ...userData, displayName: userData.originalDisplayName || userData.displayName });
      }
    });
    
    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    console.log(`[SearchAction] Combined and filtered results count: ${finalResults.length}`);
    return finalResults;

  } catch (error) {
    console.error("[SearchAction] Error searching users:", error);
    // It's good practice to log the specific error to help debug Firestore rules or other issues.
    if (error instanceof Error) {
        console.error(`[SearchAction] Error name: ${error.name}, message: ${error.message}`);
    }
    return []; 
  }
}
