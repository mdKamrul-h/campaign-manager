'use client';

import { useEffect, useState } from 'react';
import { Calendar, Send, Clock, Trash2, Edit, Eye, Sparkles, Plus, Zap, Filter, Search } from 'lucide-react';
import { Campaign } from '@/types';
import Link from 'next/link';

interface CampaignTemplate {
  title: string;
  content: string;
  channel: string;
  visual_url?: string;
}

export default function CampaignListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAutoCampaignModal, setShowAutoCampaignModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto campaign form state
  const [autoCampaignData, setAutoCampaignData] = useState<CampaignTemplate>({
    title: '',
    content: '',
    channel: 'email',
    visual_url: '',
  });

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? '/api/campaigns'
        : `/api/campaigns?status=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesChannel = !channelFilter || campaign.channel === channelFilter;
    const matchesSearch = !searchTerm || 
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const handleSchedule = async (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowScheduleModal(true);
  };

  const handleAISchedule = async () => {
    if (!selectedCampaign) return;

    setScheduling(true);
    try {
      const response = await fetch('/api/campaigns/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          campaignContent: selectedCampaign.content,
          channel: selectedCampaign.channel,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`Campaign scheduled!\n\nScheduled for: ${new Date(result.scheduledAt).toLocaleString()}\n\nReasoning: ${result.reasoning}`);
        await fetchCampaigns();
        setShowScheduleModal(false);
        setSelectedCampaign(null);
      } else {
        alert(`Failed to schedule: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to schedule campaign:', error);
      alert('Failed to schedule campaign. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const handleManualSchedule = async (dateTime: string) => {
    if (!selectedCampaign) return;

    setScheduling(true);
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedCampaign,
          scheduled_at: new Date(dateTime).toISOString(),
          status: 'scheduled',
        }),
      });

      if (response.ok) {
        alert('Campaign scheduled successfully!');
        await fetchCampaigns();
        setShowScheduleModal(false);
        setSelectedCampaign(null);
      } else {
        const result = await response.json();
        alert(`Failed to schedule: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to schedule campaign:', error);
      alert('Failed to schedule campaign. Please try again.');
    } finally {
      setScheduling(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCampaigns();
      } else {
        alert('Failed to delete campaign');
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign. Please try again.');
    }
  };

  const handleCreateAutoCampaign = async () => {
    if (!autoCampaignData.title || !autoCampaignData.content) {
      alert('Please provide title and content');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: autoCampaignData.title,
          content: autoCampaignData.content,
          channel: autoCampaignData.channel,
          visual_url: autoCampaignData.visual_url || null,
          status: 'draft',
        }),
      });

      if (response.ok) {
        alert('Campaign created successfully! You can now schedule it.');
        setShowAutoCampaignModal(false);
        setAutoCampaignData({ title: '', content: '', channel: 'email', visual_url: '' });
        await fetchCampaigns();
      } else {
        const result = await response.json();
        alert(`Failed to create: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleSendNow = async (campaign: Campaign) => {
    if (!confirm(`Send "${campaign.title}" now to all target members?`)) return;

    setLoading(true);
    try {
      // Get target audience from campaign
      const targetAudience = campaign.target_audience as any;
      const targetType = targetAudience?.type || 'all';
      const targetValue = targetAudience?.value || '';

      const response = await fetch('/api/send/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: campaign.title,
          content: campaign.content,
          visual_url: campaign.visual_url,
          channel: campaign.channel,
          targetType,
          targetValue,
          sendText: true,
          sendVisual: !!campaign.visual_url,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Campaign sent successfully!\n\nSent: ${result.sent}/${result.total} messages`);
        await fetchCampaigns();
      } else {
        alert(`Failed to send: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send campaign:', error);
      alert('Failed to send campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'bg-purple-100 text-purple-800';
      case 'sms':
        return 'bg-green-100 text-green-800';
      case 'facebook':
        return 'bg-blue-100 text-blue-800';
      case 'linkedin':
        return 'bg-blue-200 text-blue-900';
      case 'whatsapp':
        return 'bg-green-200 text-green-900';
      case 'instagram':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign List</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and schedule your campaigns</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAutoCampaignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            <Zap className="w-5 h-5" />
            Quick Create
          </button>
          <Link
            href="/dashboard/campaigns"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
          </div>
          {(['all', 'draft', 'scheduled', 'sent'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition capitalize text-sm ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}

          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm font-medium text-gray-700">Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              <option value="">All Channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>

          {(searchTerm || channelFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setChannelFilter('');
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </button>
          )}
        </div>

        {filteredCampaigns.length !== campaigns.length && (
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredCampaigns.length}</span> of <span className="font-semibold">{campaigns.length}</span> campaigns
          </div>
        )}
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading campaigns...</div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-lg mb-2 text-gray-500">No campaigns found</p>
          <p className="text-sm text-gray-400 mb-4">
            {searchTerm || channelFilter ? 'Try adjusting your filters' : 'Create your first campaign'}
          </p>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{campaign.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getChannelColor(campaign.channel)}`}>
                      {campaign.channel}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Created:</span>
                      <p>{formatDate(campaign.created_at)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Scheduled:</span>
                      <p>{formatDate(campaign.scheduled_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                  {campaign.content}
                </p>

                {campaign.visual_url && (
                  <div className="mb-3">
                    <img
                      src={campaign.visual_url}
                      alt="Campaign visual"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {campaign.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleSchedule(campaign)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule
                    </button>
                    <button
                      onClick={() => handleSendNow(campaign)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      <Send className="w-4 h-4" />
                      Send Now
                    </button>
                    <Link
                      href={`/dashboard/campaigns?edit=${campaign.id}`}
                      className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </>
                )}
                
                {campaign.status === 'scheduled' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm w-full justify-center">
                    <Clock className="w-4 h-4" />
                    Scheduled for {formatDate(campaign.scheduled_at)}
                  </div>
                )}

                {campaign.status === 'sent' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm w-full justify-center">
                    <Send className="w-4 h-4" />
                    Sent on {formatDate(campaign.sent_at)}
                  </div>
                )}

                <button
                  onClick={() => handleDelete(campaign.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Campaign</h2>
              <p className="text-sm text-gray-600 mb-4">{selectedCampaign.title}</p>

              <div className="space-y-4">
                <button
                  onClick={handleAISchedule}
                  disabled={scheduling}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition disabled:bg-purple-400 font-medium"
                >
                  <Sparkles className="w-5 h-5" />
                  {scheduling ? 'Scheduling...' : 'Let AI Decide Best Time'}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Manually
                  </label>
                  <input
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleManualSchedule(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedCampaign(null);
                }}
                className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Auto Campaign Modal */}
      {showAutoCampaignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Create Campaign</h2>
              <p className="text-sm text-gray-600 mb-4">
                Create a campaign using pre-generated content. You can schedule it later.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Title *
                  </label>
                  <input
                    type="text"
                    value={autoCampaignData.title}
                    onChange={(e) => setAutoCampaignData({ ...autoCampaignData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter campaign title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel *
                  </label>
                  <select
                    value={autoCampaignData.channel}
                    onChange={(e) => setAutoCampaignData({ ...autoCampaignData, channel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content * (Paste pre-generated content here)
                  </label>
                  <textarea
                    value={autoCampaignData.content}
                    onChange={(e) => setAutoCampaignData({ ...autoCampaignData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32"
                    placeholder="Paste your generated content here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visual URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={autoCampaignData.visual_url}
                    onChange={(e) => setAutoCampaignData({ ...autoCampaignData, visual_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste the URL of your generated or uploaded visual
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Tip:</strong> Generate content and visuals in the "Create Campaign" page, then copy them here for quick campaign creation.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAutoCampaignModal(false);
                    setAutoCampaignData({ title: '', content: '', channel: 'email', visual_url: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAutoCampaign}
                  disabled={creating || !autoCampaignData.title || !autoCampaignData.content}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-purple-400 font-medium"
                >
                  {creating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



