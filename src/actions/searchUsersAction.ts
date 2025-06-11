
'use server';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<BharatConnectFirestoreUser[]> {
  if (!searchTerm.trim()) {
    return [];
  }
  // Firestore prefix queries are case-sensitive.
  // For case-insensitive search, you'd typically store a lowercase version of the field.
  // This is a simplified query for demonstration.

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // Query by displayName prefix
  const nameQuery = query(
    usersRef,
    orderBy('displayName'),
    startAt(searchTerm),
    endAt(searchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by email prefix
  const emailQuery = query(
    usersRef,
    orderBy('email'),
    startAt(searchTerm),
    endAt(searchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  try {
    const [nameSnapshot, emailSnapshot] = await Promise.all([
      getDocs(nameQuery),
      getDocs(emailQuery)
    ]);

    const usersMap = new Map<string, BharatConnectFirestoreUser>();

    nameSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      if (userData.id !== currentUserIdToExclude) {
        usersMap.set(userData.id, userData);
      }
    });

    emailSnapshot.forEach((doc) => {
      const userData = doc.data() as BharatConnectFirestoreUser;
      if (userData.id !== currentUserIdToExclude && !usersMap.has(userData.id)) {
        usersMap.set(userData.id, userData);
      }
    });
    
    // Return a combined list, potentially further sorted or limited if necessary
    return Array.from(usersMap.values()).slice(0, resultsLimit);

  } catch (error) {
    console.error("Error searching users in searchUsersAction:", error);
    // It's common for Firestore queries to fail if the necessary indexes don't exist.
    // Firestore usually provides a link in the error message to create them.
    // For this prototype, basic single-field indexes on 'displayName' and 'email' should exist by default.
    return []; // Return empty array or throw error based on desired error handling
  }
}
