export interface Member {
  id: string;
  name: string;
  email: string;
  mobile: string;
  membership_type: 'GM' | 'LM' | 'FM' | 'OTHER';
  batch?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
  user_id: string;
}

export interface Campaign {
  id: string;
  title: string;
  content: string;
  visual_url?: string;
  custom_visual_url?: string;
  status: 'draft' | 'scheduled' | 'sent';
  channel: 'facebook' | 'instagram' | 'linkedin' | 'whatsapp' | 'sms' | 'email';
  target_audience?: string[] | Record<string, any>;
  created_at: string;
  updated_at: string;
  scheduled_at?: string;
  sent_at?: string;
}

export interface SocialConnection {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  platform_user_id: string;
  platform_username: string;
  connected_at: string;
}

export interface SocialContact {
  id: string;
  connection_id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'whatsapp';
  contact_id: string;
  name: string;
  profile_picture_url?: string;
  email?: string;
  phone?: string;
  metadata?: Record<string, any>;
  synced_at: string;
}

export interface GeneratedContent {
  text: string;
  visual_prompt?: string;
  visual_url?: string;
}

export interface CampaignTarget {
  type: 'all' | 'batch' | 'membership';
  value?: string;
}

export interface SendCampaignRequest {
  campaign_id: string;
  send_visual: boolean;
  send_text: boolean;
  targets: CampaignTarget;
}
