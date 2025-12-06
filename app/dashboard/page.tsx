'use client';

import { useEffect, useState } from 'react';
import { Users, Send, FileText, CheckCircle } from 'lucide-react';

interface Stats {
  totalMembers: number;
  totalCampaigns: number;
  totalDocuments: number;
  sentCampaigns: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalCampaigns: 0,
    totalDocuments: 0,
    sentCampaigns: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const statCards = [
    { title: 'Total Members', value: stats.totalMembers, icon: Users, color: 'bg-blue-500' },
    { title: 'Total Campaigns', value: stats.totalCampaigns, icon: Send, color: 'bg-purple-500' },
    { title: 'Sent Campaigns', value: stats.sentCampaigns, icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Documents', value: stats.totalDocuments, icon: FileText, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/members"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition cursor-pointer"
          >
            <Users className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Manage Members</h3>
            <p className="text-sm text-gray-500 mt-1">Add or edit member database</p>
          </a>
          <a
            href="/dashboard/campaigns"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition cursor-pointer"
          >
            <Send className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Create Campaign</h3>
            <p className="text-sm text-gray-500 mt-1">Generate and send campaigns</p>
          </a>
          <a
            href="/dashboard/documents"
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition cursor-pointer"
          >
            <FileText className="w-8 h-8 text-orange-500 mb-2" />
            <h3 className="font-semibold text-gray-900">Upload Documents</h3>
            <p className="text-sm text-gray-500 mt-1">Add reference documents for AI</p>
          </a>
        </div>
      </div>
    </div>
  );
}
