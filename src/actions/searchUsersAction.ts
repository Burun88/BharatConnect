
'use server';
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
  diagnostics.log.push("-------------------- NEW SEARCH ACTION START --------------------");
  diagnostics.log.push(`[SearchAction] Called with searchTerm: "${searchTerm}", currentUserIdToExclude: "${currentUserIdToExclude}"`);

  if (firestore) {
    diagnostics.log.push("[SearchAction] Firestore instance appears to be initialized.");
  } else {
    diagnostics.log.push("[SearchAction CRITICAL] Firestore instance is NOT initialized. Search will fail.");
    console.error("[SearchAction CRITICAL] Firestore instance is NOT initialized. Search will fail.");
    return { users: [], diagnostics };
  }

  // --- START DIAGNOSTIC: Direct fetch for a specific user's profile ---
  const specificTestUserId = "UMQIs0ucLbcaJmC8ef3P3jQeRVs2"; // Ayandip's specific UID
  try {
    const testUserDocRef = doc(firestore, 'bharatConnectUsers', specificTestUserId);
    const testDocSnap = await getDoc(testUserDocRef);
    if (testDocSnap.exists()) {
      const msg = `[SearchAction DIAGNOSTIC] Successfully fetched document for ID ${specificTestUserId} directly: ${JSON.stringify(testDocSnap.data())}`;
      diagnostics.log.push(msg);
      diagnostics.directFetchResult = msg;
    } else {
      const msg = `[SearchAction DIAGNOSTIC] Document for ID ${specificTestUserId} NOT found by direct getDoc. This is unexpected if the user exists and rules are permissive.`;
      diagnostics.log.push(msg);
      diagnostics.directFetchResult = msg;
    }
  } catch (e: any) {
    const msg = `[SearchAction DIAGNOSTIC] Error fetching document for ID ${specificTestUserId} directly: ${e.message} ${e.stack}`;
    diagnostics.log.push(msg);
    diagnostics.directFetchResult = `Error: ${e.message}`;
    console.error(msg);
  }
  // --- END DIAGNOSTIC ---

  const trimmedSearchTerm = searchTerm.trim();
  if (!trimmedSearchTerm) {
    diagnostics.log.push("[SearchAction] Search term is empty after trimming. Returning empty array.");
    return { users: [], diagnostics };
  }
  const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
  diagnostics.log.push(`[SearchAction] Original search term: "${searchTerm}", Lowercase search term for query: "${lowerSearchTerm}"`);

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // --- START TEMP_DIAG: Simplified query ---
  try {
    const testQuery = query(usersRef, orderBy('displayName'), limit(5)); // Querying on 'displayName' which should be lowercase
    const testQuerySnapshot = await getDocs(testQuery);
    const msg = `[SearchAction TEMP_DIAG] Simplified testQuery (orderBy lowercase 'displayName', limit 5) returned ${testQuerySnapshot.size} documents.`;
    diagnostics.log.push(msg);
    diagnostics.testQueryResult = msg;
    if (!testQuerySnapshot.empty) {
      testQuerySnapshot.forEach(doc => {
        const data = doc.data();
        diagnostics.log.push(`  [SearchAction TEMP_DIAG] Raw data from testQuery for doc ${doc.id}: id='${data.id}', displayName(lc)='${data.displayName}', originalDisplayName='${data.originalDisplayName}', email(lc)='${data.email}', username(lc)='${data.username}'`);
      });
    } else {
      diagnostics.log.push("[SearchAction TEMP_DIAG] Simplified testQuery returned no documents. This indicates a fundamental issue with querying the collection or data structure/content.");
    }
  } catch (e: any) {
    const msg = `[SearchAction TEMP_DIAG] Error executing simplified testQuery: ${e.message} ${e.stack}`;
    diagnostics.log.push(msg);
    diagnostics.testQueryResult = `Error: ${e.message}`;
    console.error(msg);
  }
  // --- END TEMP_DIAG ---

  diagnostics.log.push(`[SearchAction] Preparing nameQuery against Firestore's lowercase 'displayName' field. orderBy('displayName'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const nameQuery = query(
    usersRef,
    orderBy('displayName'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  diagnostics.log.push(`[SearchAction] Preparing emailQuery against Firestore's lowercase 'email' field. orderBy('email'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const emailQuery = query(
    usersRef,
    orderBy('email'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  diagnostics.log.push(`[SearchAction] Preparing usernameQuery against Firestore's lowercase 'username' field. orderBy('username'), startAt('${lowerSearchTerm}'), endAt('${lowerSearchTerm}\\uf8ff')`);
  const usernameQuery = query(
    usersRef,
    orderBy('username'),
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    diagnostics.log.push(`[SearchAction] Executing nameQuery for term: "${lowerSearchTerm}"`);
    const nameSnapshot = await getDocs(nameQuery);
    diagnostics.log.push(`[SearchAction] Name query (against lowercase 'displayName') returned ${nameSnapshot.size} documents.`);
    diagnostics.nameQueryCount = nameSnapshot.size;
    if (nameSnapshot.empty) {
      diagnostics.log.push("[SearchAction] Name query snapshot was empty.");
    }
    nameSnapshot.forEach(doc => {
      const data = doc.data();
      diagnostics.log.push(`  [SearchAction RAW_DATA_NAME_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    diagnostics.log.push(`[SearchAction] Executing emailQuery for term: "${lowerSearchTerm}"`);
    const emailSnapshot = await getDocs(emailQuery);
    diagnostics.log.push(`[SearchAction] Email query (against lowercase 'email') returned ${emailSnapshot.size} documents.`);
    diagnostics.emailQueryCount = emailSnapshot.size;
    if (emailSnapshot.empty) {
      diagnostics.log.push("[SearchAction] Email query snapshot was empty.");
    }
    emailSnapshot.forEach(doc => {
      const data = doc.data();
      diagnostics.log.push(`  [SearchAction RAW_DATA_EMAIL_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    diagnostics.log.push(`[SearchAction] Executing usernameQuery for term: "${lowerSearchTerm}"`);
    const usernameSnapshot = await getDocs(usernameQuery);
    diagnostics.log.push(`[SearchAction] Username query (against lowercase 'username') returned ${usernameSnapshot.size} documents.`);
    diagnostics.usernameQueryCount = usernameSnapshot.size;
    if (usernameSnapshot.empty) {
      diagnostics.log.push("[SearchAction] Username query snapshot was empty.");
    }
    usernameSnapshot.forEach(doc => {
      const data = doc.data();
      diagnostics.log.push(`  [SearchAction RAW_DATA_USERNAME_QUERY] Doc ID ${doc.id}: displayName(lc)='${data.displayName}', email(lc)='${data.email}', username(lc)='${data.username}', originalDisplayName='${data.originalDisplayName}'`);
    });

    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    const processSnapshot = (snapshot: any, queryType: string) => {
      diagnostics.log.push(`[SearchAction PROCESS_SNAPSHOT - ${queryType}] Processing ${snapshot.size} docs.`);
      snapshot.forEach((docSnapshot: any) => {
        const userData = docSnapshot.data() as BharatConnectFirestoreUser;
        const docId = docSnapshot.id;
        
        diagnostics.log.push(`  [SearchAction PROCESS_SNAPSHOT - ${queryType}] Processing doc ID from snapshot: ${docId}`);
        diagnostics.log.push(`    userData.id (from data obj): ${userData.id} (type: ${typeof userData.id})`);
        diagnostics.log.push(`    userData.displayName (LOWERCASE from DB): '${userData.displayName}' (type: ${typeof userData.displayName})`);
        diagnostics.log.push(`    userData.originalDisplayName (ORIGINAL from DB): '${userData.originalDisplayName}' (type: ${typeof userData.originalDisplayName})`);
        diagnostics.log.push(`    userData.email (LOWERCASE from DB): '${userData.email}' (type: ${typeof userData.email})`);
        diagnostics.log.push(`    userData.username (LOWERCASE from DB): '${userData.username}' (type: ${typeof userData.username})`);

        const isCurrentUser = userData.id === currentUserIdToExclude;
        diagnostics.log.push(`    Is current user (userData.id === currentUserIdToExclude: ${userData.id} === ${currentUserIdToExclude}): ${isCurrentUser}`);

        if (!isCurrentUser) {
          const displayNameToUse = userData.originalDisplayName || userData.displayName || 'Unknown User';
          usersMap.set(userData.id, {
            ...userData,
            displayName: displayNameToUse
          });
          diagnostics.log.push(`    Added/Updated user ${docId} into usersMap. User data in map: ID='${userData.id}', DisplayName (for UI)='${displayNameToUse}', Username(lc)='${userData.username}', Email(lc)='${userData.email}'`);
        } else {
          diagnostics.log.push(`    Skipped user ${docId} (is current user).`);
        }
      });
    };

    processSnapshot(nameSnapshot, "NAME");
    processSnapshot(emailSnapshot, "EMAIL");
    processSnapshot(usernameSnapshot, "USERNAME");
    
    diagnostics.log.push(`[SearchAction] UsersMap size before converting to array: ${usersMap.size}`);
    if (usersMap.size > 0) {
        diagnostics.log.push(`[SearchAction] UsersMap keys: ${Array.from(usersMap.keys()).join(', ')}`);
        usersMap.forEach((value, key) => {
            diagnostics.log.push(`  Map Entry - Key: ${key}, User's DisplayName (for UI): '${value.displayName}', Username(lc): '${value.username}', Email(lc): '${value.email}'`);
        });
    }

    const finalResults = Array.from(usersMap.values()).slice(0, resultsLimit);
    diagnostics.log.push(`[SearchAction] Combined and filtered results count for UI: ${finalResults.length}`);
    if (finalResults.length > 0) {
      diagnostics.log.push(`[SearchAction] Final results being returned (showing key fields for display): ${JSON.stringify(finalResults.map(u => ({id: u.id, displayName: u.displayName, username: u.username, email: u.email })))}`);
    } else {
      diagnostics.log.push(`[SearchAction] Final results array is empty.`);
    }
    diagnostics.log.push("-------------------- SEARCH ACTION END --------------------");
    return { users: finalResults, diagnostics };

  } catch (error: any) {
    diagnostics.log.push(`[SearchAction] Error searching users in Firestore: ${error}`);
    if (error instanceof Error) {
        diagnostics.log.push(`  [SearchAction] Error name: ${error.name}, message: ${error.message}`);
        diagnostics.log.push(`  [SearchAction] Error stack: ${error.stack}`);
    }
    diagnostics.log.push("-------------------- SEARCH ACTION END (WITH ERROR) --------------------");
    console.error("[SearchAction] Error searching users in Firestore:", error);
    return { users: [], diagnostics };
  }
}
