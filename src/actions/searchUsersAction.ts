
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

  // Query by username (which is stored as lowercase)
  console.log(`[SearchAction] Preparing usernameQuery. orderBy('username'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const usernameQuery = query(
    usersRef,
    orderBy('username'),
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

    console.log(`[SearchAction] Executing usernameQuery against 'username' (expected lowercase) with term: "${lowerSearchTerm}"`);
    const usernameSnapshot = await getDocs(usernameQuery);
    console.log(`[SearchAction] Username query returned ${usernameSnapshot.size} documents.`);
    usernameSnapshot.forEach(doc => {
      console.log(`[SearchAction] Raw data from USERNAME query for doc ${doc.id}:`, JSON.stringify(doc.data()));
    });


    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    const processSnapshot = (snapshot: any, queryType: string) => {
      snapshot.forEach((doc: any) => {
        const userData = doc.data() as BharatConnectFirestoreUser;
        console.log(`[SearchAction] Processing ${queryType} result for ${doc.id}. UserData before map modification:`, JSON.stringify(userData));
        if (userData.id !== currentUserIdToExclude) {
           // Ensure displayName uses originalDisplayName for the map, then fallback to potentially lowercase displayName from DB
          usersMap.set(userData.id, { ...userData, displayName: userData.originalDisplayName || userData.displayName });
          console.log(`[SearchAction] Added/Updated user ${doc.id} from ${queryType} query into usersMap. Current displayName in map: "${userData.originalDisplayName || userData.displayName}"`);
        } else {
          console.log(`[SearchAction] Skipped user ${doc.id} from ${queryType} query (is current user).`);
        }
      });
    };

    processSnapshot(nameSnapshot, "NAME");
    processSnapshot(emailSnapshot, "EMAIL");
    processSnapshot(usernameSnapshot, "USERNAME");
    
    console.log(`[SearchAction] UsersMap before converting to array (size ${usersMap.size}):`);
    usersMap.forEach((value, key) => {
        console.log(`  Map Entry - Key: ${key}, Value: ${JSON.stringify(value)}`);
    });

    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    console.log(`[SearchAction] Combined and filtered results count for UI: ${finalResults.length}`);
    console.log(`[SearchAction] Final results being returned:`, JSON.stringify(finalResults.map(u => ({id: u.id, displayName: u.displayName, email: u.email, username: u.username, originalDisplayName: u.originalDisplayName })))); // Log key fields
    return finalResults;

  } catch (error) {
    console.error("[SearchAction] Error searching users:", error);
    if (error instanceof Error) {
        console.error(`[SearchAction] Error name: ${error.name}, message: ${error.message}`);
    }
    return []; 
  }
}
