
'use server';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt, doc, getDoc } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<BharatConnectFirestoreUser[]> {
  console.log("-------------------- NEW SEARCH ACTION START --------------------");
  console.log(`[SearchAction] Called with searchTerm: "${searchTerm}", currentUserIdToExclude: "${currentUserIdToExclude}"`);

  if (firestore) {
    console.log("[SearchAction] Firestore instance appears to be initialized.");
  } else {
    console.error("[SearchAction CRITICAL] Firestore instance is NOT initialized. Search will fail.");
    return [];
  }

  // --- START DIAGNOSTIC: Direct fetch for a specific user's profile ---
  const specificTestUserId = "UMQIs0ucLbcaJmC8ef3P3jQeRVs2"; // Ayandip's specific UID
  try {
    const testUserDocRef = doc(firestore, 'bharatConnectUsers', specificTestUserId);
    const testDocSnap = await getDoc(testUserDocRef);
    if (testDocSnap.exists()) {
      console.log(`[SearchAction DIAGNOSTIC] Successfully fetched document for ID ${specificTestUserId} directly:`, JSON.stringify(testDocSnap.data()));
    } else {
      console.log(`[SearchAction DIAGNOSTIC] Document for ID ${specificTestUserId} NOT found by direct getDoc. This is unexpected if the user exists and rules are permissive.`);
    }
  } catch (e: any) {
    console.error(`[SearchAction DIAGNOSTIC] Error fetching document for ID ${specificTestUserId} directly:`, e.message, e.stack);
  }
  // --- END DIAGNOSTIC ---

  const trimmedSearchTerm = searchTerm.trim();
  if (!trimmedSearchTerm) {
    console.log("[SearchAction] Search term is empty after trimming. Returning empty array.");
    return [];
  }
  const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
  console.log(`[SearchAction] Original search term: "${searchTerm}", Lowercase search term for query: "${lowerSearchTerm}"`);

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // --- START TEMP_DIAG: Simplified query ---
  try {
    const testQuery = query(usersRef, orderBy('displayName'), limit(5)); // Querying on 'displayName' which should be lowercase
    const testQuerySnapshot = await getDocs(testQuery);
    console.log(`[SearchAction TEMP_DIAG] Simplified testQuery (orderBy lowercase 'displayName', limit 5) returned ${testQuerySnapshot.size} documents.`);
    if (!testQuerySnapshot.empty) {
      testQuerySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  [SearchAction TEMP_DIAG] Raw data from testQuery for doc ${doc.id}: id='${data.id}', displayName(lc)='${data.displayName}', originalDisplayName='${data.originalDisplayName}', email(lc)='${data.email}', username(lc)='${data.username}'`);
      });
    } else {
      console.log("[SearchAction TEMP_DIAG] Simplified testQuery returned no documents. This indicates a fundamental issue with querying the collection or data structure/content.");
    }
  } catch (e: any) {
    console.error(`[SearchAction TEMP_DIAG] Error executing simplified testQuery:`, e.message, e.stack);
  }
  // --- END TEMP_DIAG ---

  console.log(`[SearchAction] Preparing nameQuery against Firestore's lowercase 'displayName' field. orderBy('displayName'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const nameQuery = query(
    usersRef,
    orderBy('displayName'), // This field MUST be lowercase in Firestore
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  console.log(`[SearchAction] Preparing emailQuery against Firestore's lowercase 'email' field. orderBy('email'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const emailQuery = query(
    usersRef,
    orderBy('email'), // This field MUST be lowercase in Firestore
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  console.log(`[SearchAction] Preparing usernameQuery against Firestore's lowercase 'username' field. orderBy('username'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const usernameQuery = query(
    usersRef,
    orderBy('username'), // This field MUST be lowercase in Firestore
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    console.log(`[SearchAction] Executing nameQuery for term: "${lowerSearchTerm}"`);
    const nameSnapshot = await getDocs(nameQuery);
    console.log(`[SearchAction] Name query (against lowercase 'displayName') returned ${nameSnapshot.size} documents.`);
    if (nameSnapshot.empty) {
      console.log("[SearchAction] Name query snapshot was empty.");
    }
    nameSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  [SearchAction RAW_DATA_NAME_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    console.log(`[SearchAction] Executing emailQuery for term: "${lowerSearchTerm}"`);
    const emailSnapshot = await getDocs(emailQuery);
    console.log(`[SearchAction] Email query (against lowercase 'email') returned ${emailSnapshot.size} documents.`);
    if (emailSnapshot.empty) {
      console.log("[SearchAction] Email query snapshot was empty.");
    }
     emailSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  [SearchAction RAW_DATA_EMAIL_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    console.log(`[SearchAction] Executing usernameQuery for term: "${lowerSearchTerm}"`);
    const usernameSnapshot = await getDocs(usernameQuery);
    console.log(`[SearchAction] Username query (against lowercase 'username') returned ${usernameSnapshot.size} documents.`);
    if (usernameSnapshot.empty) {
      console.log("[SearchAction] Username query snapshot was empty.");
    }
    usernameSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  [SearchAction RAW_DATA_USERNAME_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });


    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    const processSnapshot = (snapshot: any, queryType: string) => {
      console.log(`[SearchAction PROCESS_SNAPSHOT - ${queryType}] Processing ${snapshot.size} docs.`);
      snapshot.forEach((docSnapshot: any) => { // Changed 'doc' to 'docSnapshot' to avoid confusion
        const userData = docSnapshot.data() as BharatConnectFirestoreUser;
        const docId = docSnapshot.id;
        
        console.log(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] Processing doc ID from snapshot: ${docId}`);
        console.log(`    userData.id (from data obj): ${userData.id} (type: ${typeof userData.id})`);
        console.log(`    userData.displayName (LOWERCASE from DB): '${userData.displayName}' (type: ${typeof userData.displayName})`);
        console.log(`    userData.originalDisplayName (ORIGINAL from DB): '${userData.originalDisplayName}' (type: ${typeof userData.originalDisplayName})`);
        console.log(`    userData.email (LOWERCASE from DB): '${userData.email}' (type: ${typeof userData.email})`);
        console.log(`    userData.username (LOWERCASE from DB): '${userData.username}' (type: ${typeof userData.username})`);

        const isCurrentUser = userData.id === currentUserIdToExclude;
        console.log(`    Is current user (userData.id === currentUserIdToExclude: ${userData.id} === ${currentUserIdToExclude}): ${isCurrentUser}`);

        if (!isCurrentUser) {
          const displayNameToUse = userData.originalDisplayName || userData.displayName || 'Unknown User'; // Fallback chain
          usersMap.set(userData.id, {
            ...userData,
            displayName: displayNameToUse // This is what will be used in the UI
          });
          console.log(`    Added/Updated user ${docId} into usersMap. User data in map: ID='${userData.id}', DisplayName (for UI)='${displayNameToUse}', Username(lc)='${userData.username}', Email(lc)='${userData.email}'`);
        } else {
          console.log(`    Skipped user ${docId} (is current user).`);
        }
      });
    };

    processSnapshot(nameSnapshot, "NAME");
    processSnapshot(emailSnapshot, "EMAIL");
    processSnapshot(usernameSnapshot, "USERNAME");
    
    console.log(`[SearchAction] UsersMap size before converting to array: ${usersMap.size}`);
    if (usersMap.size > 0) {
        console.log(`[SearchAction] UsersMap keys: ${Array.from(usersMap.keys()).join(', ')}`);
        usersMap.forEach((value, key) => {
            console.log(`  Map Entry - Key: ${key}, User's DisplayName (for UI): '${value.displayName}', Username(lc): '${value.username}', Email(lc): '${value.email}'`);
        });
    }

    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    console.log(`[SearchAction] Combined and filtered results count for UI: ${finalResults.length}`);
    if (finalResults.length > 0) {
      console.log(`[SearchAction] Final results being returned (showing key fields for display):`, JSON.stringify(finalResults.map(u => ({id: u.id, displayName: u.displayName, username: u.username, email: u.email }))));
    } else {
      console.log(`[SearchAction] Final results array is empty.`);
    }
    console.log("-------------------- SEARCH ACTION END --------------------");
    return finalResults;

  } catch (error) {
    console.error("[SearchAction] Error searching users in Firestore:", error);
    if (error instanceof Error) {
        console.error(`  [SearchAction] Error name: ${error.name}, message: ${error.message}`);
        console.error(`  [SearchAction] Error stack: ${error.stack}`); // Log stack trace
    }
    console.log("-------------------- SEARCH ACTION END (WITH ERROR) --------------------");
    return [];
  }
}
