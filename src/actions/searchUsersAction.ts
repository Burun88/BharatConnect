
'use server';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<BharatConnectFirestoreUser[]> {
  const trimmedSearchTerm = searchTerm.trim();
  console.log(`[SearchAction] Called with searchTerm: "${searchTerm}", currentUserIdToExclude: "${currentUserIdToExclude}"`);

  if (!trimmedSearchTerm) {
    console.log("[SearchAction] Search term is empty after trimming. Returning empty array.");
    return [];
  }
  const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
  console.log(`[SearchAction] Original search term: "${searchTerm}", Lowercase search term for query: "${lowerSearchTerm}"`);

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // Query by displayName (which is stored as lowercase)
  console.log(`[SearchAction] Preparing nameQuery against Firestore's lowercase 'displayName' field. orderBy('displayName'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const nameQuery = query(
    usersRef,
    orderBy('displayName'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by email (which is stored as lowercase)
  console.log(`[SearchAction] Preparing emailQuery against Firestore's lowercase 'email' field. orderBy('email'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const emailQuery = query(
    usersRef,
    orderBy('email'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by username (which is stored as lowercase)
  console.log(`[SearchAction] Preparing usernameQuery against Firestore's lowercase 'username' field. orderBy('username'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const usernameQuery = query(
    usersRef,
    orderBy('username'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    console.log(`[SearchAction] Executing nameQuery for term: "${lowerSearchTerm}"`);
    const nameSnapshot = await getDocs(nameQuery);
    console.log(`[SearchAction] Name query (against lowercase 'displayName') returned ${nameSnapshot.size} documents.`);
    nameSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`[SearchAction] Raw data from NAME query for doc ${doc.id}: displayName='${data.displayName}', email='${data.email}', username='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    console.log(`[SearchAction] Executing emailQuery for term: "${lowerSearchTerm}"`);
    const emailSnapshot = await getDocs(emailQuery);
    console.log(`[SearchAction] Email query (against lowercase 'email') returned ${emailSnapshot.size} documents.`);
    emailSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`[SearchAction] Raw data from EMAIL query for doc ${doc.id}: displayName='${data.displayName}', email='${data.email}', username='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    console.log(`[SearchAction] Executing usernameQuery for term: "${lowerSearchTerm}"`);
    const usernameSnapshot = await getDocs(usernameQuery);
    console.log(`[SearchAction] Username query (against lowercase 'username') returned ${usernameSnapshot.size} documents.`);
    usernameSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`[SearchAction] Raw data from USERNAME query for doc ${doc.id}: displayName='${data.displayName}', email='${data.email}', username='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });


    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    const processSnapshot = (snapshot: any, queryType: string) => {
      snapshot.forEach((doc: any) => {
        const userData = doc.data() as BharatConnectFirestoreUser;
        
        console.log(`[SearchAction PROCESS_SNAPSHOT - ${queryType}] Processing doc ID: ${doc.id}`);
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] userData.id: ${userData.id} (type: ${typeof userData.id})`);
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] userData.displayName (from DB, should be lc): ${userData.displayName} (type: ${typeof userData.displayName})`);
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] userData.originalDisplayName: ${userData.originalDisplayName} (type: ${typeof userData.originalDisplayName})`);
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] userData.email (from DB, should be lc): ${userData.email} (type: ${typeof userData.email})`);
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] userData.username (from DB, should be lc): ${userData.username} (type: ${typeof userData.username})`);

        const isCurrentUser = userData.id === currentUserIdToExclude;
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] Is current user (userData.id === currentUserIdToExclude: ${userData.id} === ${currentUserIdToExclude}): ${isCurrentUser}`);

        if (!isCurrentUser) {
          usersMap.set(userData.id, {
            ...userData,
            displayName: userData.originalDisplayName || userData.displayName // Prefer original for display
          });
          console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] Added/Updated user ${doc.id} into usersMap. User data in map: ID='${userData.id}', DisplayName (for UI)='${userData.originalDisplayName || userData.displayName}', Username (lc)='${userData.username}', Email (lc)='${userData.email}'`);
        } else {
          console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] Skipped user ${doc.id} (is current user).`);
        }
      });
    };

    processSnapshot(nameSnapshot, "NAME");
    processSnapshot(emailSnapshot, "EMAIL");
    processSnapshot(usernameSnapshot, "USERNAME");
    
    console.log(`[SearchAction] UsersMap size before converting to array: ${usersMap.size}`);
    console.log(`[SearchAction] UsersMap keys: ${Array.from(usersMap.keys()).join(', ')}`);
    usersMap.forEach((value, key) => {
        console.log(`  Map Entry - Key: ${key}, User's DisplayName (for UI): '${value.displayName}', Username: '${value.username}', Email: '${value.email}'`);
    });

    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    console.log(`[SearchAction] Combined and filtered results count for UI: ${finalResults.length}`);
    if (finalResults.length > 0) {
      console.log(`[SearchAction] Final results being returned (showing key fields for display):`, JSON.stringify(finalResults.map(u => ({id: u.id, displayName: u.displayName, username: u.username, email: u.email }))));
    } else {
      console.log(`[SearchAction] Final results array is empty.`);
    }
    return finalResults;

  } catch (error) {
    console.error("[SearchAction] Error searching users in Firestore:", error);
    if (error instanceof Error) {
        console.error(`[SearchAction] Error name: ${error.name}, message: ${error.message}`);
    }
    return [];
  }
}
