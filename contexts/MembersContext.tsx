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
      // Add cache-busting parameter to force fresh data
      const response = await fetch(`/api/members?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        // Set members immediately to avoid blocking UI
        setMembers(data);
        
        // Do debug logging asynchronously to avoid blocking
        if (process.env.NODE_ENV === 'development' && data.length > 0) {
          // Use requestIdleCallback or setTimeout to defer heavy operations
          const logDebugInfo = () => {
            const sampleMember = data[0];
            console.log('MembersContext - Sample member received:', {
              id: sampleMember.id,
              name: sampleMember.name,
              hasNameBangla: 'name_bangla' in sampleMember,
              name_bangla: sampleMember.name_bangla,
              name_bangla_type: typeof sampleMember.name_bangla,
              allKeys: Object.keys(sampleMember)
            });
            
            // Check if any member has name_bangla (defer this heavy operation)
            const membersWithBangla = data.filter(m => m.name_bangla && m.name_bangla.trim());
            console.log(`MembersContext - Members with Bangla names: ${membersWithBangla.length} out of ${data.length}`);
            
            // Log a specific member if we're looking for Ali Asif Khan
            const aliMember = data.find(m => m.name && m.name.includes('Ali Asif'));
            if (aliMember) {
              console.log('MembersContext - Found Ali Asif Khan member:', {
                id: aliMember.id,
                name: aliMember.name,
                name_bangla: aliMember.name_bangla,
                hasNameBangla: !!(aliMember.name_bangla && typeof aliMember.name_bangla === 'string' && aliMember.name_bangla.trim())
              });
            }
          };
          
          // Defer to next tick to avoid blocking
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(logDebugInfo, { timeout: 1000 });
          } else {
            setTimeout(logDebugInfo, 0);
          }
        }
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
    // Debounce to avoid multiple rapid refreshes
    let memberUpdateTimeout: NodeJS.Timeout | null = null;
    const handleMemberUpdate = () => {
      if (memberUpdateTimeout) {
        clearTimeout(memberUpdateTimeout);
      }
      // Debounce: wait 300ms before refreshing to batch multiple updates
      memberUpdateTimeout = setTimeout(() => {
        console.log('Member updated event received, refreshing members...');
        fetchMembers();
      }, 300);
    };
    
    window.addEventListener('memberUpdated', handleMemberUpdate);
    
    return () => {
      if (memberUpdateTimeout) {
        clearTimeout(memberUpdateTimeout);
      }
      window.removeEventListener('memberUpdated', handleMemberUpdate);
    };
  }, []);

  // Refresh members when page becomes visible (user navigates back or switches tabs)
  useEffect(() => {
    let visibilityTimeout: NodeJS.Timeout | null = null;
    let focusTimeout: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Debounce visibility change to avoid rapid refreshes
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout);
        }
        visibilityTimeout = setTimeout(() => {
          fetchMembers();
        }, 500);
      }
    };

    const handleFocus = () => {
      // Debounce focus events to avoid blocking UI
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
      focusTimeout = setTimeout(() => {
        fetchMembers();
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
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




