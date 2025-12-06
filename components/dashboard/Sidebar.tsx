'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, FileText, Send, Upload, Home, LogOut, Share2, List } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Members', href: '/dashboard/members', icon: Users },
    { name: 'Create Campaign', href: '/dashboard/campaigns', icon: Send },
    { name: 'Campaign List', href: '/dashboard/campaigns/list', icon: List },
    { name: 'Social Media', href: '/dashboard/social', icon: Share2 },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Campaign Manager</h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 w-full transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
