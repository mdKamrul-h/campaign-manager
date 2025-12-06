'use client';

import { useEffect, useState } from 'react';
import { 
  Facebook, 
  Linkedin, 
  MessageCircle, 
  Trash2, 
  RefreshCw, 
  Send, 
  Sparkles,
  Users,
  CheckCircle2,
  Loader2,
  Share2
} from 'lucide-react';

interface SocialConnection {
  id: string;
  platform: 'facebook' | 'linkedin' | 'whatsapp';
  platform_user_id: string;
  platform_username: string;
  connected_at: string;
  expires_at?: string;
  is_expired: boolean;
}

interface SocialContact {
  id: string;
  connection_id: string;
  platform: string;
  contact_id: string;
  name: string;
  profile_picture_url?: string;
  email?: string;
  phone?: string;
}

export default function SocialPage() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [contacts, setContacts] = useState<Record<string, SocialContact[]>>({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [contentPrompt, setContentPrompt] = useState('');
  const [generateContent, setGenerateContent] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Get current user
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.username) {
          setCurrentUser(data.username);
          fetchConnections();
        }
      });

    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    
    if (connected) {
      alert(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!`);
      window.history.replaceState({}, '', '/dashboard/social');
      fetchConnections();
    }
    
    if (error) {
      alert(`Connection failed: ${error}`);
      window.history.replaceState({}, '', '/dashboard/social');
    }
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      fetchContacts(selectedConnection);
    }
  }, [selectedConnection]);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/social/connections');
      const data = await response.json();
      // Ensure data is always an array
      setConnections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
      setConnections([]); // Set empty array on error
    }
  };

  const fetchContacts = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/social/contacts?connection_id=${connectionId}`);
      const data = await response.json();
      setContacts((prev) => ({
        ...prev,
        [connectionId]: data || [],
      }));
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
  const [whatsappBusinessName, setWhatsappBusinessName] = useState('');

  const handleConnect = async (platform: 'facebook' | 'linkedin' | 'whatsapp') => {
    if (platform === 'whatsapp') {
      setShowWhatsAppModal(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/social/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (data.error) {
        alert(`Connection failed: ${data.error}`);
        setLoading(false);
        return;
      }

      if (data.authUrl) {
        // Open OAuth URL in new window
        const oauthWindow = window.open(data.authUrl, 'oauth', 'width=600,height=700');
        
        if (!oauthWindow) {
          alert('Please allow popups to connect your account');
          setLoading(false);
          return;
        }

        // Poll for connection success
        const checkInterval = setInterval(async () => {
          try {
            await fetchConnections();
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('connected') === platform) {
              clearInterval(checkInterval);
              setLoading(false);
              window.history.replaceState({}, '', '/dashboard/social');
            }
          } catch (error) {
            console.error('Error checking connection:', error);
          }
        }, 2000);

        // Clear interval after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          setLoading(false);
        }, 300000);
      }
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to initiate connection. Please try again.');
      setLoading(false);
    }
  };

  const handleWhatsAppConnect = async () => {
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      alert('Please provide Phone Number ID and Access Token');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/social/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: whatsappPhoneNumberId,
          accessToken: whatsappAccessToken,
          businessName: whatsappBusinessName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('WhatsApp connected successfully!');
        setShowWhatsAppModal(false);
        setWhatsappPhoneNumberId('');
        setWhatsappAccessToken('');
        setWhatsappBusinessName('');
        await fetchConnections();
      } else {
        alert(`Failed to connect: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
      alert('Failed to connect WhatsApp. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      const response = await fetch('/api/social/connections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: connectionId }),
      });

      if (response.ok) {
        await fetchConnections();
        if (selectedConnection === connectionId) {
          setSelectedConnection(null);
          setContacts((prev) => {
            const updated = { ...prev };
            delete updated[connectionId];
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const handleSyncContacts = async (connectionId: string, platform: string) => {
    setSyncing((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const response = await fetch('/api/social/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, connectionId }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchContacts(connectionId);
        alert(`Synced ${data.synced} contacts successfully!`);
      } else {
        alert(`Failed to sync contacts: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to sync contacts:', error);
      alert('Failed to sync contacts. Please try again.');
    } finally {
      setSyncing((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleGenerateContent = async () => {
    if (!contentPrompt || !selectedConnection) return;

    setLoading(true);
    try {
      const connection = connections.find((c) => c.id === selectedConnection);
      if (!connection) return;

      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: contentPrompt,
          channel: connection.platform,
          useDocuments: false,
        }),
      });

      const data = await response.json();
      if (data.content) {
        setMessage(data.content);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessages = async () => {
    if (!selectedConnection || selectedContacts.length === 0) {
      alert('Please select a connection and at least one contact.');
      return;
    }

    if (!message.trim() && !generateContent) {
      alert('Please enter a message or enable content generation.');
      return;
    }

    setSending(true);
    try {
      const connection = connections.find((c) => c.id === selectedConnection);
      if (!connection) return;

      const response = await fetch('/api/social/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: connection.platform,
          connectionId: selectedConnection,
          contactIds: selectedContacts,
          message: message.trim(),
          generateContent,
          contentPrompt: generateContent ? contentPrompt : undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Messages sent successfully!\n\nSent: ${result.sent}/${result.total}`);
        setMessage('');
        setSelectedContacts([]);
      } else {
        alert(`Failed to send messages: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to send messages:', error);
      alert('Failed to send messages. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="w-5 h-5" />;
      case 'linkedin':
        return <Linkedin className="w-5 h-5" />;
      case 'whatsapp':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <Share2 className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'linkedin':
        return 'bg-blue-700 hover:bg-blue-800';
      case 'whatsapp':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Social Media Connections</h1>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['facebook', 'linkedin', 'whatsapp'].map((platform) => {
          const connection = Array.isArray(connections) ? connections.find((c) => c.platform === platform) : null;
          const isConnected = !!connection;
          const isExpired = connection?.is_expired;

          return (
            <div
              key={platform}
              className={`bg-white rounded-lg shadow p-6 border-2 ${
                isConnected ? (isExpired ? 'border-yellow-300' : 'border-green-300') : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(platform)}
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">{platform}</h3>
                </div>
                {isConnected && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    isExpired ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isExpired ? 'Expired' : 'Connected'}
                  </span>
                )}
              </div>

              {isConnected ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Connected as: <span className="font-medium">{connection.platform_username}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedConnection(connection.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                      View Contacts
                    </button>
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(platform as any)}
                  disabled={loading}
                  className={`w-full px-4 py-2 text-white rounded-lg transition ${getPlatformColor(platform)} disabled:opacity-50`}
                >
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Contacts and Messaging Section */}
      {selectedConnection && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contacts List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Contacts
              </h2>
              <button
                onClick={() => {
                  const connection = connections.find((c) => c.id === selectedConnection);
                  if (connection) {
                    handleSyncContacts(selectedConnection, connection.platform);
                  }
                }}
                disabled={syncing[selectedConnection]}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${syncing[selectedConnection] ? 'animate-spin' : ''}`} />
                {syncing[selectedConnection] ? 'Syncing...' : 'Sync Contacts'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts[selectedConnection] && contacts[selectedConnection].length > 0 ? (
                contacts[selectedConnection].map((contact) => (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      selectedContacts.includes(contact.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedContacts((prev) =>
                        prev.includes(contact.id)
                          ? prev.filter((id) => id !== contact.id)
                          : [...prev, contact.id]
                      );
                    }}
                  >
                    {contact.profile_picture_url ? (
                      <img
                        src={contact.profile_picture_url}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{contact.name}</p>
                      {contact.email && (
                        <p className="text-xs text-gray-500">{contact.email}</p>
                      )}
                    </div>
                    {selectedContacts.includes(contact.id) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No contacts found. Click "Sync Contacts" to fetch your friends/connections.</p>
                </div>
              )}
            </div>

            {selectedContacts.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          {/* Message Composition */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Send Message</h2>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={generateContent}
                  onChange={(e) => setGenerateContent(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Generate content with AI</span>
              </label>
            </div>

            {generateContent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Prompt
                </label>
                <textarea
                  value={contentPrompt}
                  onChange={(e) => setContentPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 text-sm"
                  placeholder="Describe what you want to communicate..."
                />
                <button
                  onClick={handleGenerateContent}
                  disabled={loading || !contentPrompt}
                  className="mt-2 flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-purple-400 text-sm w-full justify-center"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message {generateContent && '(will be replaced by generated content)'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 text-sm"
                placeholder="Type your message here..."
                disabled={generateContent}
              />
            </div>

            <button
              onClick={handleSendMessages}
              disabled={sending || selectedContacts.length === 0 || (!message.trim() && !generateContent)}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 font-medium"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send to {selectedContacts.length} Contact{selectedContacts.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Info Message */}
      {!selectedConnection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Connect Your Social Media Accounts
          </h3>
          {currentUser && (
            <p className="text-sm text-blue-800 mb-3">
              Logged in as: <span className="font-semibold">{currentUser}</span>
            </p>
          )}
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Click "Connect Account" for Facebook, LinkedIn, or WhatsApp</li>
            <li>You'll be redirected to authorize the app to access your account</li>
            <li>Grant permissions for the app to read your friends/connections and send messages</li>
            <li>After connecting, click "View Contacts" to see your friends/connections</li>
            <li>Click "Sync Contacts" to fetch the latest contacts list</li>
            <li>Select contacts you want to message</li>
            <li>Generate content with AI or type your message</li>
            <li>Send messages directly from this app to your contacts!</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Each user's connections are private. You can only see and use your own connected accounts.
            </p>
          </div>
        </div>
      )}

      {/* WhatsApp Connection Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect WhatsApp Business</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter your WhatsApp Business API credentials to connect your account.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={whatsappBusinessName}
                    onChange={(e) => setWhatsappBusinessName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="My Business"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    value={whatsappPhoneNumberId}
                    onChange={(e) => setWhatsappPhoneNumberId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="123456789012345"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Found in Meta Business Suite → WhatsApp → API Setup
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token *
                  </label>
                  <input
                    type="password"
                    value={whatsappAccessToken}
                    onChange={(e) => setWhatsappAccessToken(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="EAAxxxxxxxxxxxxx"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Found in Meta Business Suite → WhatsApp → API Setup
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>How to get these:</strong>
                  </p>
                  <ol className="text-xs text-blue-700 list-decimal list-inside mt-1 space-y-1">
                    <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">Meta Business Suite</a></li>
                    <li>Navigate to WhatsApp → API Setup</li>
                    <li>Copy your Phone Number ID and Access Token</li>
                    <li>Paste them above and click Connect</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsappPhoneNumberId('');
                    setWhatsappAccessToken('');
                    setWhatsappBusinessName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWhatsAppConnect}
                  disabled={loading || !whatsappPhoneNumberId || !whatsappAccessToken}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-green-400 font-medium"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



