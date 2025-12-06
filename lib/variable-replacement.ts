/**
 * Variable replacement utility for personalizing campaign content
 * Replaces placeholders like [Recipient's Name] with actual member data
 */

export interface Member {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  membership_type?: string;
  batch?: string;
  [key: string]: any;
}

/**
 * Available variable placeholders:
 * - [Recipient's Name] or [Name] - Member's name
 * - [Recipient's Email] or [Email] - Member's email
 * - [Recipient's Mobile] or [Mobile] or [Phone] - Member's mobile number
 * - [Membership Type] - Member's membership type
 * - [Batch] - Member's batch
 */
export const VARIABLE_PATTERNS = {
  NAME: /\[Recipient'?s?\s*Name\]|\[Name\]/gi,
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
    { placeholder: '[Recipient\'s Email]', description: 'Member\'s email address' },
    { placeholder: '[Email]', description: 'Member\'s email address (short form)' },
    { placeholder: '[Recipient\'s Mobile]', description: 'Member\'s mobile number' },
    { placeholder: '[Mobile]', description: 'Member\'s mobile number (short form)' },
    { placeholder: '[Phone]', description: 'Member\'s phone number' },
    { placeholder: '[Membership Type]', description: 'Member\'s membership type (e.g., GM-001)' },
    { placeholder: '[Batch]', description: 'Member\'s batch name' },
  ];
}

