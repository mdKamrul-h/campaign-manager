'use client';

import { useEffect, useState } from 'react';
import { Users, Send, FileText, CheckCircle, Clock, Mail, AlertCircle } from 'lucide-react';

interface Stats {
  totalMembers: number;
  totalCampaigns: number;
  totalDocuments: number;
  sentCampaigns: number;
  scheduledCampaigns: number;
  draftCampaigns: number;
  totalMessagesSent: number;
  failedMessages: number;
  error?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    totalCampaigns: 0,
    totalDocuments: 0,
    sentCampaigns: 0,
    scheduledCampaigns: 0,
    draftCampaigns: 0,
    totalMessagesSent: 0,
    failedMessages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Refresh stats when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats(prev => ({ ...prev, error: 'Failed to load statistics' }));
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Total Members', 
      value: stats.totalMembers, 
      icon: Users, 
      color: 'bg-blue-500',
      description: 'Registered members'
    },
    { 
      title: 'Total Campaigns', 
      value: stats.totalCampaigns, 
      icon: Send, 
      color: 'bg-purple-500',
      description: 'All campaigns created'
    },
    { 
      title: 'Sent Campaigns', 
      value: stats.sentCampaigns, 
      icon: CheckCircle, 
      color: 'bg-green-500',
      description: 'Successfully sent'
    },
    { 
      title: 'Scheduled', 
      value: stats.scheduledCampaigns, 
      icon: Clock, 
      color: 'bg-yellow-500',
      description: 'Pending delivery'
    },
    { 
      title: 'Draft Campaigns', 
      value: stats.draftCampaigns, 
      icon: FileText, 
      color: 'bg-gray-500',
      description: 'Not yet sent'
    },
    { 
      title: 'Messages Sent', 
      value: stats.totalMessagesSent, 
      icon: Mail, 
      color: 'bg-indigo-500',
      description: 'Total messages delivered'
    },
    { 
      title: 'Failed Messages', 
      value: stats.failedMessages, 
      icon: AlertCircle, 
      color: 'bg-red-500',
      description: 'Delivery failed'
    },
    { 
      title: 'Documents', 
      value: stats.totalDocuments, 
      icon: FileText, 
      color: 'bg-orange-500',
      description: 'Uploaded files'
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {stats.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {stats.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-gray-500 text-sm font-medium">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {loading ? '...' : stat.value.toLocaleString()}
                  </p>
                  {stat.description && (
                    <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                  )}
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
