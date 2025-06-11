
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
  console.log(`[SearchAction] Preparing nameQuery. orderBy('displayName'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const nameQuery = query(
    usersRef,
    orderBy('displayName'), 
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by email (which is stored as lowercase)
  console.log(`[SearchAction] Preparing emailQuery. orderBy('email'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const emailQuery = query(
    usersRef,
    orderBy('email'), 
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    console.log(`[SearchAction] Executing nameQuery against 'displayName' (expected lowercase) with term: "${lowerSearchTerm}"`);
    const nameSnapshot = await getDocs(nameQuery);
    console.log(`[SearchAction] Name query returned ${nameSnapshot.size} documents.`);
    nameSnapshot.forEach(doc => {
      console.log(`[SearchAction] Raw data from NAME query for doc ${doc.id}:`, JSON.stringify(doc.data()));
    });

    console.log(`[SearchAction] Executing emailQuery against 'email' (expected lowercase) with term: "${lowerSearchTerm}"`);
    const emailSnapshot = await getDocs(emailQuery);
    console.log(`[SearchAction] Email query returned ${emailSnapshot.size} documents.`);
     emailSnapshot.forEach(doc => {
      console.log(`[SearchAction] Raw data from EMAIL query for doc ${doc.id}:`, JSON.stringify(doc.data()));
    });

    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    nameSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      console.log(`[SearchAction] Processing NAME result for ${doc.id}. UserData before map modification:`, JSON.stringify(userData));
      if (userData.id !== currentUserIdToExclude) {
        usersMap.set(userData.id, { ...userData, displayName: userData.originalDisplayName || userData.displayName });
        console.log(`[SearchAction] Added/Updated user ${doc.id} from NAME query into usersMap. Current displayName in map: "${userData.originalDisplayName || userData.displayName}"`);
      } else {
        console.log(`[SearchAction] Skipped user ${doc.id} from NAME query (is current user).`);
      }
    });

    emailSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      console.log(`[SearchAction] Processing EMAIL result for ${doc.id}. UserData before map modification:`, JSON.stringify(userData));
      if (userData.id !== currentUserIdToExclude && !usersMap.has(userData.id)) {
        usersMap.set(userData.id, { ...userData, displayName: userData.originalDisplayName || userData.displayName });
        console.log(`[SearchAction] Added user ${doc.id} from EMAIL query into usersMap. Current displayName in map: "${userData.originalDisplayName || userData.displayName}"`);
      } else {
         if (usersMap.has(userData.id)) {
            console.log(`[SearchAction] User ${doc.id} from EMAIL query already in map. Skipping.`);
         } else if (userData.id === currentUserIdToExclude) {
            console.log(`[SearchAction] Skipped user ${doc.id} from EMAIL query (is current user).`);
         }
      }
    });
    
    console.log(`[SearchAction] UsersMap before converting to array (size ${usersMap.size}):`);
    usersMap.forEach((value, key) => {
        console.log(`  Map Entry - Key: ${key}, Value: ${JSON.stringify(value)}`);
    });

    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    console.log(`[SearchAction] Combined and filtered results count for UI: ${finalResults.length}`);
    console.log(`[SearchAction] Final results being returned:`, JSON.stringify(finalResults.map(u => ({id: u.id, displayName: u.displayName, email: u.email, originalDisplayName: u.originalDisplayName })))); // Log key fields
    return finalResults;

  } catch (error) {
    console.error("[SearchAction] Error searching users:", error);
    if (error instanceof Error) {
        console.error(`[SearchAction] Error name: ${error.name}, message: ${error.message}`);
    }
    return []; 
  }
}
