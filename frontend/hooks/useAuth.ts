import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

export interface UserRole {
  role: 'member' | 'teacher' | 'game_admin' | 'super_admin' | null;
  isLoading: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>({ role: null, isLoading: true });

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        try {
          // Get ID token to access custom claims
          const idTokenResult = await currentUser.getIdTokenResult();
          const userRole = (idTokenResult.claims.role as string) || 'member';

          setRole({
            role: userRole as UserRole['role'],
            isLoading: false
          });
        } catch (error) {
          console.error('Failed to get user role:', error);
          setRole({ role: 'member', isLoading: false });
        }
      } else {
        setRole({ role: null, isLoading: false });
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    role: role.role,
    roleLoading: role.isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: role.role === 'super_admin',
    isGameAdmin: role.role === 'game_admin' || role.role === 'super_admin',
    isTeacher: ['teacher', 'game_admin', 'super_admin'].includes(role.role || ''),
    isMember: !!user, // Any authenticated user is at least a member
  };
}
