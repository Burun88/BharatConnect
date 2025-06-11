
'use server';
import { firestore } from '@/lib/firebase';
import { collection, query, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import type { BharatConnectFirestoreUser } from '@/services/profileService';

export async function searchUsersAction(searchTerm: string, currentUserIdToExclude: string): Promise<BharatConnectFirestoreUser[]> {
  const lowerSearchTerm = searchTerm.trim().toLowerCase();
  if (!lowerSearchTerm) {
    return [];
  }

  const usersRef = collection(firestore, 'bharatConnectUsers');
  const resultsLimit = 10;

  // Query by displayName (which is stored as lowercase)
  const nameQuery = query(
    usersRef,
    orderBy('displayName'), // Queries the lowercase displayName field
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
    limit(resultsLimit)
  );

  // Query by email (which is stored as lowercase)
  const emailQuery = query(
    usersRef,
    orderBy('email'), // Queries the lowercase email field
    startAt(lowerSearchTerm),
    endAt(lowerSearchTerm + '\uf8ff'),
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
    
    return Array.from(usersMap.values()).slice(0, resultsLimit);

  } catch (error) {
    console.error("Error searching users in searchUsersAction:", error);
    return []; 
  }
}
