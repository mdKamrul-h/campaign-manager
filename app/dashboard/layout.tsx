'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import { MembersProvider } from '@/contexts/MembersContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MembersProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="ml-64 flex-1 p-8">
          {children}
        </div>
      </div>
    </MembersProvider>
  );
}
