'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Member } from '@/types';

interface MembersContextType {
  members: Member[];
  loading: boolean;
  error: string | null;
  refreshMembers: () => Promise<void>;
}

const MembersContext = createContext<MembersContextType | undefined>(undefined);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/members');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setMembers(data);
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err: any) {
      console.error('Failed to fetch members:', err);
      setError(err.message || 'Failed to fetch members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch members once when provider mounts
  useEffect(() => {
    fetchMembers();

    // Listen for member updates from other pages
    const handleMemberUpdate = () => {
      console.log('Member updated event received, refreshing members...');
      fetchMembers();
    };
    
    window.addEventListener('memberUpdated', handleMemberUpdate);
    
    return () => {
      window.removeEventListener('memberUpdated', handleMemberUpdate);
    };
  }, []);

  // Refresh members when page becomes visible (user navigates back or switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMembers();
      }
    };

    const handleFocus = () => {
      fetchMembers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <MembersContext.Provider value={{ members, loading, error, refreshMembers: fetchMembers }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (context === undefined) {
    throw new Error('useMembers must be used within a MembersProvider');
  }
  return context;
}


