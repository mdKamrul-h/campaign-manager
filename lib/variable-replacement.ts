/**
 * Variable replacement utility for personalizing campaign content
 * Replaces placeholders like [Recipient's Name] with actual member data
 */

export interface Member {
  id: string;
  name: string;
  name_bangla?: string;
  email?: string;
  mobile?: string;
  membership_type?: string;
  batch?: string;
  [key: string]: any;
}

/**
 * Available variable placeholders:
 * - [Recipient's Name] or [Name] - Member's name
 * - [Recipient's Name Bangla] or [Name Bangla] - Member's Bangla name
 * - [Recipient's Email] or [Email] - Member's email
 * - [Recipient's Mobile] or [Mobile] or [Phone] - Member's mobile number
 * - [Membership Type] - Member's membership type
 * - [Batch] - Member's batch
 */
export const VARIABLE_PATTERNS = {
  NAME: /\[Recipient'?s?\s*Name\]|\[Name\]/gi,
  NAME_BANGLA: /\[Recipient'?s?\s*Name\s+Bangla\]|\[Name\s+Bangla\]/gi,
  EMAIL: /\[Recipient'?s?\s*Email\]|\[Email\]/gi,
  MOBILE: /\[Recipient'?s?\s*Mobile\]|\[Mobile\]|\[Phone\]/gi,
  MEMBERSHIP_TYPE: /\[Membership\s*Type\]/gi,
  BATCH: /\[Batch\]/gi,
};

/**
 * Replace variables in content with member-specific data
 */
export function replaceVariables(content: string, member: Member): string {
  if (!content) return content;

  let personalizedContent = content;

  // Replace Bangla name FIRST (before regular name to avoid partial matches)
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.NAME_BANGLA,
    member.name_bangla || member.name || 'Valued Member'
  );

  // Replace name
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.NAME,
    member.name || 'Valued Member'
  );

  // Replace email
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.EMAIL,
    member.email || ''
  );

  // Replace mobile/phone
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.MOBILE,
    member.mobile || ''
  );

  // Replace membership type
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.MEMBERSHIP_TYPE,
    member.membership_type || ''
  );

  // Replace batch
  personalizedContent = personalizedContent.replace(
    VARIABLE_PATTERNS.BATCH,
    member.batch || ''
  );

  return personalizedContent;
}

/**
 * Get list of available variables for display in UI
 */
export function getAvailableVariables(): Array<{ placeholder: string; description: string }> {
  return [
    { placeholder: '[Recipient\'s Name]', description: 'Member\'s full name' },
    { placeholder: '[Name]', description: 'Member\'s full name (short form)' },
    { placeholder: '[Recipient\'s Name Bangla]', description: 'Member\'s Bangla name' },
    { placeholder: '[Name Bangla]', description: 'Member\'s Bangla name (short form)' },
    { placeholder: '[Recipient\'s Email]', description: 'Member\'s email address' },
    { placeholder: '[Email]', description: 'Member\'s email address (short form)' },
    { placeholder: '[Recipient\'s Mobile]', description: 'Member\'s mobile number' },
    { placeholder: '[Mobile]', description: 'Member\'s mobile number (short form)' },
    { placeholder: '[Phone]', description: 'Member\'s phone number' },
    { placeholder: '[Membership Type]', description: 'Member\'s membership type (e.g., GM-001)' },
    { placeholder: '[Batch]', description: 'Member\'s batch name' },
  ];
}

/**
 * Check if a string contains Unicode characters (non-ASCII)
 * This includes Bangla, Arabic, Chinese, and other non-Latin scripts
 */
export function containsUnicode(text: string): boolean {
  if (!text) return false;
  // Check if any character is outside the ASCII range (0-127)
  // GSM-7 encoding supports ASCII 0-127, Unicode is needed for anything beyond
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode > 127) {
      return true;
    }
  }
  return false;
}

/**
 * Calculate SMS count based on encoding type
 * - GSM-7 (English only): 160 characters per SMS
 * - Unicode (with Bangla/other scripts): 70 characters per SMS
 * 
 * For concatenated messages:
 * - GSM-7: 153 characters per segment (after first)
 * - Unicode: 67 characters per segment (after first)
 */
export function calculateSMSCount(message: string): {
  count: number;
  isUnicode: boolean;
  charsPerSMS: number;
  maxLength: number;
} {
  if (!message) {
    return { count: 0, isUnicode: false, charsPerSMS: 160, maxLength: 1600 };
  }

  const isUnicode = containsUnicode(message);
  const length = message.length;

  if (isUnicode) {
    // Unicode encoding: 70 chars for single SMS, 67 for each additional segment
    if (length <= 70) {
      return { count: 1, isUnicode: true, charsPerSMS: 70, maxLength: 700 };
    }
    // For concatenated Unicode: first SMS = 70, subsequent = 67
    const additionalSegments = Math.ceil((length - 70) / 67);
    return {
      count: 1 + additionalSegments,
      isUnicode: true,
      charsPerSMS: 70,
      maxLength: 700, // ~10 SMS messages (70 + 9*67 = 673 chars)
    };
  } else {
    // GSM-7 encoding: 160 chars for single SMS, 153 for each additional segment
    if (length <= 160) {
      return { count: 1, isUnicode: false, charsPerSMS: 160, maxLength: 1600 };
    }
    // For concatenated GSM-7: first SMS = 160, subsequent = 153
    const additionalSegments = Math.ceil((length - 160) / 153);
    return {
      count: 1 + additionalSegments,
      isUnicode: false,
      charsPerSMS: 160,
      maxLength: 1600, // ~10 SMS messages (160 + 9*153 = 1537 chars)
    };
  }
}





