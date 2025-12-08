'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Image as ImageIcon, Send, Upload, Edit3, Eye, RefreshCw, X, Info, ChevronLeft, ChevronRight, Check, Save } from 'lucide-react';
import { Member } from '@/types';
import { getAvailableVariables, replaceVariables } from '@/lib/variable-replacement';
import { useMembers } from '@/contexts/MembersContext';

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editCampaignId = searchParams.get('edit');
  const [loading, setLoading] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(false);
  const { members, loading: membersLoading } = useMembers();

  // Form state
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState<string>('email');
  const [contentPrompt, setContentPrompt] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedVisual, setGeneratedVisual] = useState('');
  const [customVisual, setCustomVisual] = useState<File | null>(null);
  const [customVisualUrl, setCustomVisualUrl] = useState('');
  const [useDocuments, setUseDocuments] = useState(true);
  const [modificationSuggestion, setModificationSuggestion] = useState('');
  const [useCustomContent, setUseCustomContent] = useState(false);
  const [customContent, setCustomContent] = useState('');

  // Target audience
  const [targetType, setTargetType] = useState<'all' | 'batch' | 'batch-filter' | 'membership' | 'select-members'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [batches, setBatches] = useState<Array<{ batch: string | null; batchDisplay: string; count: number }>>([]);
  const [batchStats, setBatchStats] = useState<{ totalMembers: number; totalWithBatch: number; totalWithoutBatch: number } | null>(null);
  const [batchMembers, setBatchMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [approvedEmails, setApprovedEmails] = useState<Set<string>>(new Set());
  const [modifiedEmails, setModifiedEmails] = useState<Map<string, { subject: string; content: string }>>(new Map());
  
  // Member selection state
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberFilterType, setMemberFilterType] = useState<string>('all');
  const [memberFilterBatch, setMemberFilterBatch] = useState<string>('all');
  const [filteredMembersForSelection, setFilteredMembersForSelection] = useState<Member[]>([]);

  // Send options
  const [sendText, setSendText] = useState(true);
  const [sendVisual, setSendVisual] = useState(true);
  const [smsSenderId, setSmsSenderId] = useState('Mallick NDC'); // SMS Sender ID

  // Templates
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; title: string; content: string; channel: string; visual_url?: string }>>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Filter members for selection - defined before useEffects
  const filterMembersForSelection = useCallback(() => {
    console.log('filterMembersForSelection called', { membersCount: members.length, memberSearchTerm, memberFilterType, memberFilterBatch });
    
    // Ensure members array exists and is not empty
    if (!members || members.length === 0) {
      console.log('No members available, setting empty filtered list');
      setFilteredMembersForSelection([]);
      return;
    }

    let filtered = [...members];
    console.log('Starting with', filtered.length, 'members');

    // Filter by search term
    if (memberSearchTerm && memberSearchTerm.trim()) {
      const searchLower = memberSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.email?.toLowerCase().includes(searchLower) ||
          m.mobile?.includes(memberSearchTerm) ||
          m.batch?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by membership type pattern
    if (memberFilterType && memberFilterType !== 'all') {
      filtered = filtered.filter((m) => {
        const membershipType = m.membership_type || '';
        if (memberFilterType === 'GM') return membershipType.startsWith('GM-');
        if (memberFilterType === 'DM') return membershipType.startsWith('DM-');
        if (memberFilterType === 'FM') return membershipType.startsWith('FM-');
        if (memberFilterType === 'LM') return membershipType.startsWith('LM-');
        return false;
      });
    }

    // Filter by batch
    if (memberFilterBatch && memberFilterBatch !== 'all') {
      if (memberFilterBatch === 'no-batch') {
        filtered = filtered.filter((m) => !m.batch || m.batch.trim() === '');
      } else {
        filtered = filtered.filter((m) => m.batch === memberFilterBatch);
      }
    }

    console.log('Filtered to', filtered.length, 'members');
    setFilteredMembersForSelection(filtered);
  }, [members, memberSearchTerm, memberFilterType, memberFilterBatch]);

  // Load campaign for editing
  useEffect(() => {
    if (editCampaignId) {
      loadCampaignForEdit(editCampaignId);
    }
  }, [editCampaignId]);

  useEffect(() => {
    fetchBatches();
    fetchTemplates();
    
    // Listen for member updates from members page
    const handleMemberUpdate = () => {
      console.log('Member updated event received, refreshing batches...');
      fetchBatches();
      // If select-members is active, refresh the filtered list
      if (targetType === 'select-members') {
        setTimeout(() => {
          filterMembersForSelection();
        }, 500);
      }
    };
    
    window.addEventListener('memberUpdated', handleMemberUpdate);
    
    return () => {
      window.removeEventListener('memberUpdated', handleMemberUpdate);
    };
  }, [targetType, filterMembersForSelection]);

  const loadCampaignForEdit = async (campaignId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (response.ok) {
        const campaign = await response.json();
        setTitle(campaign.title || '');
        setChannel(campaign.channel || 'email');
        setGeneratedContent(campaign.content || '');
        setCustomContent(campaign.content || '');
        setUseCustomContent(true);
        setCustomVisualUrl(campaign.custom_visual_url || campaign.visual_url || '');
        setGeneratedVisual(campaign.visual_url || '');
        
        // Load target audience
        const targetAudience = campaign.target_audience as any;
        if (targetAudience) {
          setTargetType(targetAudience.type || 'all');
          setTargetValue(targetAudience.value || '');
          if (targetAudience.selectedMemberIds) {
            setSelectedMemberIds(targetAudience.selectedMemberIds);
          }
        }
        
        setEditingCampaign(true);
      } else {
        alert('Failed to load campaign for editing');
        router.push('/dashboard/campaigns');
      }
    } catch (error) {
      console.error('Failed to load campaign:', error);
      alert('Failed to load campaign for editing');
      router.push('/dashboard/campaigns');
    } finally {
      setLoading(false);
    }
  };

  // Refetch batches when page becomes visible (user navigates back or switches tabs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchBatches();
      }
    };

    const handleFocus = () => {
      fetchBatches();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    console.log('Target type changed:', targetType, 'Members count:', members.length);
    if (targetType === 'batch' && targetValue !== undefined) {
      // Handle empty string for "No Batch"
      const batchToFetch = targetValue === '' ? '(No Batch)' : targetValue;
      fetchBatchMembers(batchToFetch);
    } else if (targetType === 'select-members') {
      console.log('Select members mode activated');
      // Filter members for selection - ensure members are loaded first
      if (members && members.length > 0) {
        console.log('Members already loaded, filtering now');
        // Call filter immediately
        filterMembersForSelection();
      } else {
        console.log('Members not loaded yet, waiting for context...');
      }
    } else {
      setBatchMembers([]);
      setSelectedMemberIds([]);
    }
  }, [targetType, targetValue, members, filterMembersForSelection]);

  // Filter members when filters change or members are loaded
  useEffect(() => {
    if (targetType === 'select-members') {
      console.log('Filter effect triggered', { membersCount: members.length, memberSearchTerm, memberFilterType, memberFilterBatch });
      if (members && members.length > 0) {
        filterMembersForSelection();
      }
    }
  }, [targetType, members, memberSearchTerm, memberFilterType, memberFilterBatch, filterMembersForSelection]);

  const fetchBatches = async () => {
    try {
      // Add cache-busting query parameter to ensure fresh data
      const response = await fetch(`/api/members/batches?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.batches && Array.isArray(data.batches)) {
        setBatches(data.batches);
        setBatchStats({
          totalMembers: data.totalMembers || 0,
          totalWithBatch: data.totalWithBatch || 0,
          totalWithoutBatch: data.totalWithoutBatch || 0,
        });
      } else {
        // Fallback for old API format
        setBatches(Array.isArray(data) ? data.map((b: any) => ({ ...b, batchDisplay: b.batch })) : []);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchBatchMembers = async (batch: string) => {
    try {
      // Handle "No Batch" - send empty string to API
      const batchParam = batch === '(No Batch)' ? '' : batch;
      const response = await fetch(`/api/members/batch/${encodeURIComponent(batchParam)}`);
      const data = await response.json();
      setBatchMembers(Array.isArray(data) ? data : []);
      // Auto-select all members initially
      setSelectedMemberIds(data.map((m: Member) => m.id));
    } catch (error) {
      console.error('Failed to fetch batch members:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const saveAsTemplate = async () => {
    const finalContent = useCustomContent ? customContent : generatedContent;
    if (!templateName || !finalContent?.trim()) {
      alert('Please provide a template name and content');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          title: title || '',
          content: finalContent,
          channel,
          visual_url: customVisualUrl || generatedVisual || null,
        }),
      });

      if (response.ok) {
        alert('Template saved successfully!');
        setShowSaveTemplate(false);
        setTemplateName('');
        await fetchTemplates();
      } else {
        const result = await response.json();
        alert(`Failed to save template: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = (template: any) => {
    setTitle(template.title || '');
    setChannel(template.channel || 'email');
    setGeneratedContent(template.content || '');
    setCustomContent(template.content || '');
    setUseCustomContent(true);
    if (template.visual_url) {
      setCustomVisualUrl(template.visual_url);
      setGeneratedVisual(template.visual_url);
    }
    setShowTemplates(false);
  };

  const deleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"?`)) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };


  const handleGenerateContent = async () => {
    if (!contentPrompt) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: contentPrompt,
          channel,
          useDocuments,
        }),
      });

      const data = await response.json();
      setGeneratedContent(data.content);
      
      // If subject is returned separately (for email), update the title
      if (data.subject && channel === 'email') {
        setTitle(data.subject);
      }
    } catch (error) {
      console.error('Failed to generate content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVisual = async () => {
    if (!visualPrompt) return;

    setLoading(true);
    try {
      // Generate visual
      const response = await fetch('/api/generate/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: visualPrompt }),
      });

      const data = await response.json();
      const generatedImageUrl = data.imageUrl;
      
      if (generatedImageUrl) {
        // Upload generated image to Supabase Storage for permanent URL
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('imageUrl', generatedImageUrl);
          
          const uploadResponse = await fetch('/api/upload/visual', {
            method: 'POST',
            body: uploadFormData,
          });
          
          const uploadData = await uploadResponse.json();
          
          if (uploadResponse.ok && uploadData.url) {
            setGeneratedVisual(uploadData.url); // Use permanent URL
          } else {
            // Fallback to temporary URL if upload fails
            console.warn('Failed to upload generated visual, using temporary URL');
            setGeneratedVisual(generatedImageUrl);
          }
        } catch (uploadError) {
          console.error('Failed to upload generated visual:', uploadError);
          // Fallback to temporary URL
          setGeneratedVisual(generatedImageUrl);
        }
      }
    } catch (error) {
      console.error('Failed to generate visual:', error);
      alert('Failed to generate visual. Please check your OpenAI API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleModifyContent = async () => {
    if (!modificationSuggestion) return;

    setLoading(true);
    try {
      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Modify the following content based on this suggestion: "${modificationSuggestion}"\n\nOriginal content:\n${generatedContent}`,
          channel,
          useDocuments: false,
        }),
      });

      const data = await response.json();
      setGeneratedContent(data.content);
      setModificationSuggestion('');
    } catch (error) {
      console.error('Failed to modify content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomVisualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        // Upload to Supabase Storage
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload/visual', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (response.ok && data.url) {
          setCustomVisual(file);
          setCustomVisualUrl(data.url); // Use permanent URL from Supabase
        } else {
          alert(data.error || 'Failed to upload visual');
        }
      } catch (error) {
        console.error('Failed to upload visual:', error);
        alert('Failed to upload visual. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendCampaign = async () => {
    // Validation for select-members
    if (targetType === 'select-members' && selectedMemberIds.length === 0) {
      alert('Please select at least one member');
      return;
    }
    
    // Show email preview for email campaigns
    if (channel === 'email' && sendText) {
      const targetMembers = getTargetMembers();
      if (targetMembers.length > 0) {
        setShowEmailPreview(true);
        return;
      }
    }
    
    // Show approval step if batch or select-members is selected with member selection
    if ((targetType === 'batch' && targetValue && selectedMemberIds.length > 0) ||
        (targetType === 'select-members' && selectedMemberIds.length > 0)) {
      setShowApproval(true);
      return;
    }
    
    await sendCampaign();
  };

  const sendCampaign = async () => {
    // Determine which content to use
    const finalContent = useCustomContent ? customContent : generatedContent;
    
    // Validation: Check if content is required and exists
    if (sendText && !finalContent?.trim()) {
      alert(useCustomContent 
        ? 'Please paste your custom content before sending the campaign. Content is required when "Send Text Content" is enabled.'
        : 'Please generate content before sending the campaign. Content is required when "Send Text Content" is enabled.');
      return;
    }

    // Validation: For SMS, content is mandatory and should be within limits
    if (channel === 'sms') {
      if (!finalContent?.trim()) {
        alert(useCustomContent
          ? 'SMS campaigns require content. Please paste your custom content first.'
          : 'SMS campaigns require content. Please generate content first.');
        return;
      }
      if (finalContent.length > 1600) {
        alert('SMS content is too long. Please keep it under 1600 characters (SMS messages are typically 160 characters per message).');
        return;
      }
    }

    // Validation: Must send either text or visual
    if (!sendText && !sendVisual) {
      alert('Please select at least one option: "Send Text Content" or "Send Visual"');
      return;
    }

    // Validation: If sending visual, must have a visual
    if (sendVisual && !customVisualUrl && !generatedVisual) {
      alert('Please generate or upload a visual before sending.');
      return;
    }

    setLoading(true);
    try {
      // If editing, update the campaign first
      if (editingCampaign && editCampaignId) {
        const updateResponse = await fetch(`/api/campaigns/${editCampaignId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: finalContent || '',
            visual_url: sendVisual ? (customVisualUrl || generatedVisual) : null,
            custom_visual_url: sendVisual ? (customVisualUrl || generatedVisual) : null,
            channel,
            target_audience: {
              type: targetType,
              value: targetValue,
              selectedMemberIds: (targetType === 'batch' || targetType === 'select-members') && selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
            },
          status: 'draft',
          }),
        });

        if (!updateResponse.ok) {
          const result = await updateResponse.json();
          alert(`Failed to update campaign: ${result.error}`);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/send/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: finalContent || '',
          visual_url: sendVisual ? (customVisualUrl || generatedVisual) : null,
          channel,
          targetType,
          targetValue,
          selectedMemberIds: (targetType === 'batch' || targetType === 'select-members') && selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
          sendText,
          sendVisual,
          smsSenderId: channel === 'sms' ? smsSenderId : undefined,
          modifiedEmails: channel === 'email' ? Object.fromEntries(modifiedEmails) : undefined,
          approvedMemberIds: channel === 'email' && approvedEmails.size > 0 ? Array.from(approvedEmails) : undefined,
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        const message = result.warning 
          ? `Campaign sent with warnings:\n${result.warning}\n\nSent: ${result.sent}/${result.total}`
          : `Campaign sent successfully!\n\nSent: ${result.sent}/${result.total} messages`;
        alert(message);
        
        // Show detailed results if there were failures
        if (result.failed > 0) {
          const failedResults = result.results.filter((r: any) => !r.success);
          console.error('Failed sends:', failedResults);
          const failedDetails = failedResults.map((r: any) => 
            `- ${r.member}: ${r.error || 'Unknown error'}`
          ).join('\n');
          alert(`Some messages failed:\n\n${failedDetails}\n\nCheck the browser console for more details.`);
        }
        
        if (editingCampaign) {
          router.push('/dashboard/campaigns/list');
        } else {
          resetForm();
        }
        setShowApproval(false);
        setShowEmailPreview(false);
      } else {
        // Show contextual error message based on channel
        const errorMessage = result.error || 'Unknown error';
        let helpMessage = '';
        
        if (channel === 'email') {
          helpMessage = 'Check your email configuration (RESEND_API_KEY) and ensure member email addresses are valid.';
        } else if (channel === 'sms') {
          helpMessage = 'Check your SMS configuration and phone numbers.';
        } else {
          helpMessage = 'Check your configuration and try again.';
        }
        
        alert(`Failed to send campaign: ${errorMessage}\n\n${helpMessage}`);
        setShowApproval(false);
        setShowEmailPreview(false);
      }
    } catch (error: any) {
      console.error('Failed to send campaign:', error);
      
      // Handle network errors (like "fetch failed")
      const errorMessage = error.message || 'Unknown error';
      let helpMessage = '';
      
      if (errorMessage.includes('fetch failed') || errorMessage.includes('Failed to fetch')) {
        if (channel === 'email') {
          helpMessage = 'Network error: Unable to reach the email service. Check:\n1. Your NEXTAUTH_URL environment variable\n2. Email service (Resend) API configuration\n3. Network connectivity';
        } else if (channel === 'sms') {
          helpMessage = 'Network error: Unable to reach the SMS service. Check:\n1. Your NEXTAUTH_URL environment variable\n2. SMS service configuration\n3. Network connectivity';
        } else {
          helpMessage = 'Network error: Unable to reach the service. Check your NEXTAUTH_URL and network connectivity.';
        }
      } else {
        helpMessage = channel === 'email' 
          ? 'Check your email configuration and try again.'
          : channel === 'sms'
          ? 'Check your SMS configuration and try again.'
          : 'Please try again.';
      }
      
      alert(`Failed to send campaign: ${errorMessage}\n\n${helpMessage}`);
      setShowApproval(false);
      setShowEmailPreview(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCustomVisual = () => {
    // No need to revoke URL since we're using permanent Supabase URLs now
    setCustomVisualUrl('');
    setCustomVisual(null);
    if (generatedVisual) {
      setGeneratedVisual('');
    }
  };

  const resetForm = () => {
    setTitle('');
    setContentPrompt('');
    setVisualPrompt('');
    setGeneratedContent('');
    setGeneratedVisual('');
    setCustomVisual(null);
    setCustomVisualUrl('');
    setModificationSuggestion('');
    setUseCustomContent(false);
    setCustomContent('');
    setTargetType('all');
    setTargetValue('');
    setSendText(true);
    setSendVisual(true);
    setBatchMembers([]);
    setSelectedMemberIds([]);
    setShowApproval(false);
    setShowEmailPreview(false);
    setCurrentEmailIndex(0);
    setApprovedEmails(new Set());
    setModifiedEmails(new Map());
    setEditingCampaign(false);
    router.push('/dashboard/campaigns');
  };

  const getBatches = () => {
    return Array.from(new Set(members.map((m) => m.batch).filter(Boolean)));
  };

  const getMembershipTypes = () => {
    // Return pattern-based membership types (GM, DM, FM, LM)
    return ['GM', 'DM', 'FM', 'LM'];
  };

  // Get target members based on current selection
  const getTargetMembers = (): Member[] => {
    if (targetType === 'select-members' && selectedMemberIds.length > 0) {
      return members.filter(m => selectedMemberIds.includes(m.id));
    } else if (targetType === 'batch' && targetValue) {
      if (selectedMemberIds.length > 0) {
        return batchMembers.filter(m => selectedMemberIds.includes(m.id));
      } else {
        return batchMembers;
      }
    } else if (targetType === 'batch-filter' && targetValue) {
      return members.filter(m => {
        if (!m.batch || m.batch.trim() === '') return false;
        const batchNum = parseInt(m.batch);
        if (isNaN(batchNum)) return false;
        
        if (targetValue === 'senior') {
          return batchNum < 1999;
        } else if (targetValue === 'junior') {
          return batchNum > 1999;
        } else if (targetValue === 'batchmate') {
          return batchNum === 1999;
        }
        return false;
      });
    } else if (targetType === 'membership' && targetValue) {
      return members.filter(m => {
        const membershipType = m.membership_type || '';
        return membershipType.startsWith(`${targetValue}-`);
      });
    } else {
      return members;
    }
  };

  // Get all preview emails for all target members
  const getAllPreviewEmails = () => {
    if (channel !== 'email' || !sendText) return [];
    
    const targetMembers = getTargetMembers();
    if (targetMembers.length === 0) return [];
    
    const finalContent = getFinalContent();
    
    return targetMembers.map((member) => {
      // Check if this email has been modified
      const modified = modifiedEmails.get(member.id);
      const personalizedContent = modified 
        ? modified.content 
        : replaceVariables(finalContent || '', member);
      const personalizedTitle = modified
        ? modified.subject
        : replaceVariables(title, member);
      
      const emailContent = sendVisual && (customVisualUrl || generatedVisual)
        ? `${personalizedContent}\n\n<img src="${customVisualUrl || generatedVisual}" alt="Campaign visual" />`
        : personalizedContent;
      
      return {
        memberId: member.id,
        to: member.email || 'No email',
        subject: personalizedTitle,
        text: personalizedContent,
        html: emailContent,
        memberName: member.name,
      };
    });
  };

  // Get preview email for first member (for backward compatibility)
  const getPreviewEmail = () => {
    const emails = getAllPreviewEmails();
    return emails.length > 0 ? emails[0] : null;
  };

  // Get final content (custom or generated)
  const getFinalContent = () => {
    return useCustomContent ? customContent : generatedContent;
  };

  // Get current email being previewed
  const getCurrentPreviewEmail = () => {
    const emails = getAllPreviewEmails();
    if (emails.length === 0) return null;
    const index = Math.min(currentEmailIndex, emails.length - 1);
    return emails[index];
  };

  // Navigate to next email
  const goToNextEmail = () => {
    const emails = getAllPreviewEmails();
    if (currentEmailIndex < emails.length - 1) {
      setCurrentEmailIndex(currentEmailIndex + 1);
    }
  };

  // Navigate to previous email
  const goToPreviousEmail = () => {
    if (currentEmailIndex > 0) {
      setCurrentEmailIndex(currentEmailIndex - 1);
    }
  };

  // Approve current email
  const approveCurrentEmail = () => {
    const currentEmail = getCurrentPreviewEmail();
    if (currentEmail) {
      const newApprovedEmails = new Set(approvedEmails);
      newApprovedEmails.add(currentEmail.memberId);
      setApprovedEmails(newApprovedEmails);
      // Auto-advance to next unapproved email
      const emails = getAllPreviewEmails();
      const nextUnapprovedIndex = emails.findIndex(
        (email, idx) => idx > currentEmailIndex && !newApprovedEmails.has(email.memberId)
      );
      if (nextUnapprovedIndex !== -1) {
        setCurrentEmailIndex(nextUnapprovedIndex);
      } else if (currentEmailIndex < emails.length - 1) {
        goToNextEmail();
      }
    }
  };

  // Approve all emails
  const approveAllEmails = () => {
    const emails = getAllPreviewEmails();
    setApprovedEmails(new Set(emails.map(e => e.memberId)));
  };

  // Modify current email
  const modifyCurrentEmail = () => {
    const currentEmail = getCurrentPreviewEmail();
    if (currentEmail) {
      const newSubject = prompt('Enter new subject:', currentEmail.subject);
      if (newSubject !== null) {
        const newContent = prompt('Enter new content:', currentEmail.text);
        if (newContent !== null) {
          setModifiedEmails(new Map(modifiedEmails.set(currentEmail.memberId, {
            subject: newSubject,
            content: newContent,
          })));
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
        </h1>
        <div className="flex gap-2">
          {editingCampaign && (
            <button
              onClick={() => router.push('/dashboard/campaigns/list')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel Edit
            </button>
          )}
          <button
            onClick={resetForm}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            {editingCampaign ? 'Reset' : 'Reset Form'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Campaign Setup */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Campaign Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter campaign title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Channel *
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value as any);
                      setTargetValue('');
                      setSelectedMemberIds([]);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Members</option>
                    <option value="batch">Specific Batch</option>
                    <option value="batch-filter">Batch Filter (Senior/Junior/Batchmate)</option>
                    <option value="membership">Membership Type</option>
                    <option value="select-members">Select Members</option>
                  </select>
                </div>
              </div>

              {(targetType === 'batch' || targetType === 'membership' || targetType === 'batch-filter') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {targetType === 'batch' ? 'Select Batch' 
                        : targetType === 'batch-filter' ? 'Select Batch Filter'
                        : 'Select Membership Type (Pattern)'}
                    </label>
                    {(targetType === 'batch' || targetType === 'batch-filter') && (
                      <button
                        onClick={fetchBatches}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                        title="Refresh batches list"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    )}
                  </div>
                  {targetType === 'batch-filter' ? (
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Choose a batch filter</option>
                      <option value="senior">Senior (Batches before 1999)</option>
                      <option value="junior">Junior (Batches after 1999)</option>
                      <option value="batchmate">Batchmate (1999 batch)</option>
                    </select>
                  ) : (
                    <select
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Choose {targetType === 'batch' ? 'a batch' : 'a membership type (GM-*, DM-*, FM-*, LM-*)'}</option>
                      {targetType === 'batch' 
                        ? batches.map((b) => (
                            <option key={b.batch || '(No Batch)'} value={b.batch || ''}>
                              {b.batchDisplay} ({b.count} members)
                            </option>
                          ))
                        : getMembershipTypes().map((type) => (
                            <option key={type} value={type}>{type} ({type}-*)</option>
                          ))
                      }
                    </select>
                  )}
                  
                  {targetType === 'batch-filter' && targetValue && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <p className="text-gray-700 mb-2">
                        {targetValue === 'senior' && 'Members with batches before 1999 will be targeted.'}
                        {targetValue === 'junior' && 'Members with batches after 1999 will be targeted.'}
                        {targetValue === 'batchmate' && 'Members with batch 1999 will be targeted.'}
                      </p>
                      <p className="text-gray-600 text-xs">
                        Note: Members without a batch value will be excluded from this filter.
                      </p>
                    </div>
                  )}
                  {targetType === 'batch' && batchStats && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-gray-600">Total</p>
                          <p className="font-bold text-blue-600 text-base">{batchStats.totalMembers}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">With Batch</p>
                          <p className="font-bold text-green-600 text-base">{batchStats.totalWithBatch}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">No Batch</p>
                          <p className="font-bold text-amber-600 text-base">{batchStats.totalWithoutBatch}</p>
                        </div>
                      </div>
                      {batchStats.totalMembers !== (batchStats.totalWithBatch + batchStats.totalWithoutBatch) && (
                        <p className="text-amber-700 mt-2 text-center">⚠️ Count verification: {batchStats.totalWithBatch + batchStats.totalWithoutBatch} (should be {batchStats.totalMembers})</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Select Members UI - Outside the batch/membership conditional */}
              {targetType === 'select-members' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      Select Members ({selectedMemberIds.length} selected)
                    </div>
                    <div className="flex items-center gap-2">
                      {members.length > 0 && (
                        <button
                          onClick={() => {
                            if (selectedMemberIds.length === members.length) {
                              setSelectedMemberIds([]);
                            } else {
                              setSelectedMemberIds(members.map(m => m.id));
                            }
                          }}
                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          {selectedMemberIds.length === members.length ? 'Deselect All Members' : 'Select All Members'}
                        </button>
                      )}
                      {members.length === 0 && (
                        <span className="text-xs text-amber-600">Loading members...</span>
                      )}
                    </div>
                  </div>

                      {/* Filters for member selection */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                          <input
                            type="text"
                            value={memberSearchTerm}
                            onChange={(e) => setMemberSearchTerm(e.target.value)}
                            placeholder="Name, email, mobile..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Membership Type</label>
                          <select
                            value={memberFilterType}
                            onChange={(e) => setMemberFilterType(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="all">All Types</option>
                            <option value="GM">GM-*</option>
                            <option value="DM">DM-*</option>
                            <option value="FM">FM-*</option>
                            <option value="LM">LM-*</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Batch</label>
                          <select
                            value={memberFilterBatch}
                            onChange={(e) => setMemberFilterBatch(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="all">All Batches</option>
                            <option value="no-batch">No Batch</option>
                            {batches.map((b) => (
                              <option key={b.batch || '(No Batch)'} value={b.batch || ''}>
                                {b.batchDisplay}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Member selection list */}
                      <div className="border border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">
                            {filteredMembersForSelection.length} members found
                            {members.length > 0 && filteredMembersForSelection.length === 0 && (
                              <span className="text-amber-600 ml-2">(No members match current filters)</span>
                            )}
                            {members.length === 0 && (
                              <span className="text-amber-600 ml-2">(Loading members...)</span>
                            )}
                          </span>
                          {filteredMembersForSelection.length > 0 && (
                            <button
                              onClick={() => {
                                if (selectedMemberIds.length === filteredMembersForSelection.length) {
                                  setSelectedMemberIds([]);
                                } else {
                                  setSelectedMemberIds(filteredMembersForSelection.map(m => m.id));
                                }
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              {selectedMemberIds.length === filteredMembersForSelection.length ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {members.length === 0 ? (
                            <div className="text-center py-8 text-sm text-gray-500">
                              Loading members...
                            </div>
                          ) : filteredMembersForSelection.length > 0 ? (
                            filteredMembersForSelection.map((member) => (
                              <label
                                key={member.id}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedMemberIds.includes(member.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedMemberIds([...selectedMemberIds, member.id]);
                                    } else {
                                      setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{member.email}</div>
                                  <div className="text-xs text-gray-400">{member.mobile} • {member.membership_type} {member.batch && `• ${member.batch}`}</div>
                                </div>
                              </label>
                            ))
                          ) : (
                            <div className="text-center py-8 text-sm text-gray-500">
                              No members found. Try adjusting your filters.
                              <button
                                onClick={() => {
                                  setMemberSearchTerm('');
                                  setMemberFilterType('all');
                                  setMemberFilterBatch('all');
                                }}
                                className="block mx-auto mt-2 text-xs text-blue-600 hover:text-blue-800"
                              >
                                Clear All Filters
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
              )}

              {channel === 'sms' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Sender ID
                  </label>
                  <input
                    type="text"
                    value={smsSenderId}
                    onChange={(e) => setSmsSenderId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Mallick NDC"
                    maxLength={11}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Max 11 characters. This will appear as the sender name.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Content Generation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Content</h2>
            <div className="space-y-4">
              {/* Toggle between AI Generation and Custom Content */}
              <div className="flex gap-2 border-b pb-4">
                <button
                  type="button"
                  onClick={() => setUseCustomContent(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                    !useCustomContent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Generate with AI
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomContent(true)}
                  className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                    useCustomContent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Paste Custom Content
                </button>
              </div>

              {!useCustomContent ? (
                <>
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={useDocuments}
                        onChange={(e) => setUseDocuments(e.target.checked)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Use uploaded documents as context</span>
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Content Prompt
                        {channel === 'sms' && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">⚠️ Required</span>
                        )}
                      </label>
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800"
                          title="Available variables"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-6 hidden group-hover:block z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[280px]">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Available Variables:</div>
                          <div className="space-y-1 text-xs">
                            {getAvailableVariables().map((v, i) => (
                              <div key={i} className="flex justify-between">
                                <code className="text-blue-600">{v.placeholder}</code>
                                <span className="text-gray-500 ml-2">{v.description}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                            Variables will be replaced with actual member data when sending.
                          </div>
                        </div>
                      </div>
                    </div>
                    <textarea
                      value={contentPrompt}
                      onChange={(e) => setContentPrompt(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
                      placeholder={channel === 'sms' 
                        ? "Describe what you want to communicate (keep it brief, under 160 characters recommended). Use [Recipient's Name] for personalization..."
                        : "Describe what you want to communicate in this campaign. Use [Recipient's Name] for personalization..."
                      }
                    />
                    <button
                      onClick={handleGenerateContent}
                      disabled={loading || !contentPrompt}
                      className="mt-2 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 text-sm"
                    >
                      <Sparkles className="w-4 h-4" />
                      {loading ? 'Generating...' : 'Generate Content'}
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Custom Content
                      {channel === 'sms' && (
                        <span className="ml-2 text-xs text-amber-600 font-normal">⚠️ Required</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {customContent && (
                        <button
                          onClick={() => setShowSaveTemplate(true)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                          title="Save as template"
                        >
                          <Save className="w-3 h-3" />
                          Save Template
                        </button>
                      )}
                      <div className="relative group">
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800"
                          title="Available variables"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-6 hidden group-hover:block z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3 min-w-[280px]">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Available Variables:</div>
                          <div className="space-y-1 text-xs">
                            {getAvailableVariables().map((v, i) => (
                              <div key={i} className="flex justify-between">
                                <code className="text-blue-600">{v.placeholder}</code>
                                <span className="text-gray-500 ml-2">{v.description}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                            Variables will be replaced with actual member data when sending.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={customContent}
                    onChange={(e) => setCustomContent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-48"
                    placeholder={channel === 'sms' 
                      ? "Paste your custom SMS content here. Use [Recipient's Name] for personalization. Keep it under 160 characters per message..."
                      : "Paste your custom content here. Use [Recipient's Name], [Email], [Mobile], etc. for personalization..."
                    }
                    maxLength={channel === 'sms' ? 1600 : undefined}
                  />
                  {channel === 'sms' && customContent.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {customContent.length} / 1600 characters
                      {customContent.length > 160 && ` (~${Math.ceil(customContent.length / 160)} SMS messages)`}
                    </div>
                  )}
                </div>
              )}

              {!useCustomContent && generatedContent && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Generated Content
                      {channel === 'sms' && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({generatedContent.length} / 1600 chars)
                          {generatedContent.length > 160 && ` - ~${Math.ceil(generatedContent.length / 160)} SMS`}
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      {channel === 'sms' && generatedContent.length > 160 && (
                        <span className="text-xs text-amber-600">⚠️ Long SMS</span>
                      )}
                      <button
                        onClick={() => setShowSaveTemplate(true)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                        title="Save as template"
                      >
                        <Save className="w-3 h-3" />
                        Save Template
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32"
                    maxLength={channel === 'sms' ? 1600 : undefined}
                  />
                  
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={modificationSuggestion}
                      onChange={(e) => setModificationSuggestion(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                      placeholder="Modification suggestion..."
                    />
                    <button
                      onClick={handleModifyContent}
                      disabled={loading || !modificationSuggestion}
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:bg-purple-400 text-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Modify
                    </button>
                  </div>
                </div>
              )}

              {/* Templates Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Templates
                  </label>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showTemplates ? 'Hide' : 'Show'} Templates ({templates.length})
                  </button>
                </div>
                {showTemplates && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                    {templates.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No templates saved yet</p>
                    ) : (
                      <div className="space-y-2">
                        {templates
                          .filter(t => !channel || t.channel === channel)
                          .map((template) => (
                            <div key={template.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 hover:bg-gray-50">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{template.name}</div>
                                <div className="text-xs text-gray-500 truncate">{template.title || 'No title'}</div>
                                <div className="text-xs text-gray-400 capitalize">{template.channel}</div>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <button
                                  onClick={() => loadTemplate(template)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                  Load
                                </button>
                                <button
                                  onClick={() => deleteTemplate(template.id, template.name)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        {templates.filter(t => !channel || t.channel === channel).length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">No templates for {channel} channel</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual Generation */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Visual Content</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generate Visual with AI
                </label>
                <div className="flex gap-2">
                  <textarea
                    value={visualPrompt}
                    onChange={(e) => setVisualPrompt(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20"
                    placeholder="Describe the visual you want to create..."
                  />
                  <button
                    onClick={handleGenerateVisual}
                    disabled={loading || !visualPrompt}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 h-20"
                  >
                    <ImageIcon className="w-4 h-4" />
                    {loading ? '...' : 'Generate'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or Upload Your Own Visual
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload image</span>
                  <input
                    type="file"
                    onChange={handleCustomVisualUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </label>
              </div>

              {(generatedVisual || customVisualUrl) && (
                <div className="mt-4 relative">
                  <img
                    src={customVisualUrl || generatedVisual}
                    alt="Visual"
                    className="w-full max-w-md rounded-lg border border-gray-300"
                  />
                  {customVisualUrl && (
                    <button
                      onClick={handleRemoveCustomVisual}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition shadow-lg"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {generatedVisual && !customVisualUrl && (
                    <button
                      onClick={() => setGeneratedVisual('')}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 transition shadow-lg"
                      title="Remove generated image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Send */}
        <div className="space-y-6">
          {/* Send Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Options</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What to Send
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendText}
                      onChange={(e) => setSendText(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Send Text Content</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendVisual}
                      onChange={(e) => setSendVisual(e.target.checked)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Send Visual</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleSendCampaign}
                disabled={loading || (!sendText && !sendVisual) || (sendText && !(useCustomContent ? customContent : generatedContent)?.trim()) || (sendVisual && !customVisualUrl && !generatedVisual) || (targetType === 'batch' && (!targetValue || selectedMemberIds.length === 0)) || (targetType === 'select-members' && selectedMemberIds.length === 0) || (targetType === 'membership' && !targetValue) || (targetType === 'batch-filter' && !targetValue)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 font-medium"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Sending...' : 'Send Campaign'}
              </button>
              
              <button
                onClick={async () => {
                  // Save as draft
                  const finalContent = useCustomContent ? customContent : generatedContent;
                  if (!title || !finalContent?.trim()) {
                    alert('Please provide a title and content to save as draft.');
                    return;
                  }
                  
                  setLoading(true);
                  try {
                    const url = editingCampaign && editCampaignId 
                      ? `/api/campaigns/${editCampaignId}`
                      : '/api/campaigns';
                    const method = editingCampaign && editCampaignId ? 'PUT' : 'POST';
                    
                    const response = await fetch(url, {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title,
                        content: finalContent,
                        visual_url: sendVisual ? (customVisualUrl || generatedVisual) : null,
                        custom_visual_url: sendVisual ? (customVisualUrl || generatedVisual) : null,
                        channel,
                        status: 'draft',
                        target_audience: {
                          type: targetType,
                          value: targetValue,
                          selectedMemberIds: (targetType === 'batch' || targetType === 'select-members') && selectedMemberIds.length > 0 ? selectedMemberIds : undefined,
                        },
                      }),
                    });

                    if (response.ok) {
                      alert(editingCampaign 
                        ? 'Campaign updated successfully!'
                        : 'Campaign saved as draft. You can schedule or send it later from the Campaign List page.');
                      if (editingCampaign) {
                        router.push('/dashboard/campaigns/list');
                      } else {
                        resetForm();
                      }
                    } else {
                      const result = await response.json();
                      alert(`Failed to save draft: ${result.error}`);
                    }
                  } catch (error) {
                    console.error('Failed to save draft:', error);
                    alert('Failed to save draft. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium"
              >
                {editingCampaign ? 'Update Campaign' : 'Save as Draft'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
            </div>
            <div className="space-y-4">
              {sendText && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Text Content</h3>
                  {getFinalContent() ? (
                    <div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{getFinalContent()}</p>
                      {channel === 'sms' && (
                        <p className="text-xs text-gray-500 mt-2">
                          Length: {getFinalContent().length} characters
                          {getFinalContent().length > 160 && ` (~${Math.ceil(getFinalContent().length / 160)} SMS messages)`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-600 italic">No content {useCustomContent ? 'pasted' : 'generated'}</p>
                  )}
                </div>
              )}

              {sendVisual && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Visual</h3>
                  {(customVisualUrl || generatedVisual) ? (
                    <img
                      src={customVisualUrl || generatedVisual}
                      alt="Preview"
                      className="w-full rounded-lg"
                    />
                  ) : (
                    <p className="text-sm text-red-600 italic">No visual available</p>
                  )}
                </div>
              )}

              {!sendText && !sendVisual && (
                <p className="text-sm text-gray-500 italic text-center py-4">
                  Select what to send to see preview
                </p>
              )}
            </div>
          </div>

          {/* Campaign Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Campaign Summary</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Channel:</span>
                <span className="font-medium capitalize">{channel}</span>
              </div>
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="font-medium">
                  {targetType === 'all' 
                    ? 'All Members' 
                    : targetType === 'batch' 
                      ? `Batch: ${targetValue || 'Not selected'}${selectedMemberIds.length > 0 ? ` (${selectedMemberIds.length} selected)` : ''}` 
                      : targetType === 'batch-filter'
                      ? `Batch Filter: ${targetValue === 'senior' ? 'Senior (before 1999)' : targetValue === 'junior' ? 'Junior (after 1999)' : targetValue === 'batchmate' ? 'Batchmate (1999)' : 'Not selected'}`
                      : targetType === 'select-members'
                      ? `Selected Members: ${selectedMemberIds.length}`
                      : `Type: ${targetValue || 'Not selected'}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Content:</span>
                <span className="font-medium">{generatedContent ? 'Ready' : 'Not generated'}</span>
              </div>
              <div className="flex justify-between">
                <span>Visual:</span>
                <span className="font-medium">{(customVisualUrl || generatedVisual) ? 'Ready' : 'Not added'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showEmailPreview && (() => {
        const allEmails = getAllPreviewEmails();
        const currentEmail = getCurrentPreviewEmail();
        const totalEmails = allEmails.length;
        const approvedCount = approvedEmails.size;
        const isCurrentApproved = currentEmail ? approvedEmails.has(currentEmail.memberId) : false;
        const isCurrentModified = currentEmail ? modifiedEmails.has(currentEmail.memberId) : false;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Email Preview & Approval</h2>
                  <div className="text-sm text-gray-600">
                    {approvedCount} of {totalEmails} approved
                  </div>
                </div>
                
                {currentEmail && totalEmails > 0 && (
                  <div className="space-y-4 mb-6">
                    {/* Navigation Header */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <button
                        onClick={goToPreviousEmail}
                        disabled={currentEmailIndex === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">
                          Email {currentEmailIndex + 1} of {totalEmails}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {currentEmail.memberName} {isCurrentApproved && <span className="text-green-600">✓ Approved</span>}
                          {isCurrentModified && <span className="text-blue-600 ml-2">✎ Modified</span>}
                        </div>
                      </div>
                      
                      <button
                        onClick={goToNextEmail}
                        disabled={currentEmailIndex >= totalEmails - 1}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Email Content */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p>This is the actual email that will be sent to <strong>{currentEmail.memberName}</strong> ({currentEmail.to}).</p>
                      <p className="mt-1">Variables have been replaced with actual member data.</p>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="mb-3 pb-3 border-b">
                        <div className="text-xs text-gray-500 mb-1">To:</div>
                        <div className="text-sm font-medium text-gray-900">{currentEmail.to}</div>
                        <div className="text-xs text-gray-500 mt-2 mb-1">Subject:</div>
                        <div className="text-sm font-medium text-gray-900">{currentEmail.subject}</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">Body:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded border border-gray-100 max-h-96 overflow-y-auto">
                        {currentEmail.text}
                      </div>
                      {sendVisual && (customVisualUrl || generatedVisual) && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-xs text-gray-500 mb-2">Visual:</div>
                          <img
                            src={customVisualUrl || generatedVisual}
                            alt="Campaign visual"
                            className="w-full max-w-md rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={modifyCurrentEmail}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                        Modify
                      </button>
                      <button
                        onClick={approveCurrentEmail}
                        disabled={isCurrentApproved}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
                          isCurrentApproved
                            ? 'bg-green-100 text-green-700 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {isCurrentApproved ? 'Approved' : 'Approve This Email'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowEmailPreview(false);
                      setCurrentEmailIndex(0);
                      setApprovedEmails(new Set());
                      setModifiedEmails(new Map());
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={approveAllEmails}
                    disabled={approvedCount === totalEmails}
                    className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                      approvedCount === totalEmails
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Approve All ({approvedCount}/{totalEmails})
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailPreview(false);
                      // Show approval modal if needed, otherwise send directly
                      if ((targetType === 'batch' && targetValue && selectedMemberIds.length > 0) ||
                          (targetType === 'select-members' && selectedMemberIds.length > 0)) {
                        setShowApproval(true);
                      } else {
                        sendCampaign();
                      }
                    }}
                    disabled={approvedCount === 0}
                    className={`flex-1 px-4 py-2 rounded-lg transition font-medium ${
                      approvedCount === 0
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    Send Approved ({approvedCount})
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Save as Template</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Welcome Email Template"
                  />
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <p>This will save your current content and visual as a reusable template.</p>
                  <p className="mt-1">Channel: <strong>{channel}</strong></p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setTemplateName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAsTemplate}
                  disabled={loading || !templateName}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-green-400 font-medium"
                >
                  {loading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApproval && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Approve Campaign</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Campaign Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Title:</span>
                      <span className="font-medium">{title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium capitalize">{channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Target:</span>
                      {targetType === 'batch' && (
                        <span className="font-medium">Batch: {targetValue} ({selectedMemberIds.length} members)</span>
                      )}
                      {targetType === 'batch-filter' && (
                        <span className="font-medium">Batch Filter: {targetValue === 'senior' ? 'Senior (before 1999)' : targetValue === 'junior' ? 'Junior (after 1999)' : 'Batchmate (1999)'} ({getTargetMembers().length} members)</span>
                      )}
                      {targetType === 'select-members' && (
                        <span className="font-medium">Selected Members: {selectedMemberIds.length}</span>
                      )}
                      {targetType === 'membership' && (
                        <span className="font-medium">Membership Type: {targetValue} (pattern: {targetValue}-*)</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Content:</span>
                      <span className="font-medium">{generatedContent ? `${generatedContent.length} chars` : 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Visual:</span>
                      <span className="font-medium">{(customVisualUrl || generatedVisual) ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Members ({selectedMemberIds.length})</h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {(targetType === 'batch' ? batchMembers : members)
                      .filter(m => selectedMemberIds.includes(m.id))
                      .map((member) => (
                        <div key={member.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={member.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                              {member.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-sm text-gray-900">{member.name}</span>
                          <span className="text-xs text-gray-500 ml-auto">{member.email}</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Email Preview - Show actual email that will be sent */}
                {channel === 'email' && sendText && getPreviewEmail() && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Email Preview (Sample for: {getPreviewEmail()?.memberName})
                    </h3>
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="mb-3 pb-3 border-b">
                        <div className="text-xs text-gray-500 mb-1">To:</div>
                        <div className="text-sm font-medium text-gray-900">{getPreviewEmail()?.to}</div>
                        <div className="text-xs text-gray-500 mt-2 mb-1">Subject:</div>
                        <div className="text-sm font-medium text-gray-900">{getPreviewEmail()?.subject}</div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">Body:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 max-h-60 overflow-y-auto">
                        {getPreviewEmail()?.text}
                      </div>
                      {sendVisual && (customVisualUrl || generatedVisual) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-gray-500 mb-2">Visual:</div>
                          <img
                            src={customVisualUrl || generatedVisual}
                            alt="Campaign visual"
                            className="w-full max-w-md rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                        <p>This is how the email will appear to <strong>{getPreviewEmail()?.memberName}</strong>. Variables have been replaced with actual data.</p>
                        <p className="mt-1">All {getTargetMembers().length} recipient{getTargetMembers().length !== 1 ? 's' : ''} will receive personalized emails with their own data.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproval(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowApproval(false);
                    sendCampaign();
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 font-medium"
                >
                  {loading ? 'Sending...' : 'Approve & Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
