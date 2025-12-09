/**
 * Utility functions for formatting email content
 */

/**
 * Convert plain text with markdown-like formatting to HTML
 * Handles:
 * - Line breaks (\n) -> <br> or <p>
 * - Bold text (*text* or **text**) -> <strong>
 * - Italic (_text_) -> <em>
 * - Lists (- item or * item) -> <ul><li>
 */
export function formatEmailContent(text: string): string {
  if (!text) return '';

  let html = text;

  // Remove any "Subject:" prefix that might have been accidentally included in content
  // Remove "Subject: [text]" from the beginning of the content
  html = html.replace(/^Subject:\s*[^\n]+\n*/i, '').trim();
  // Remove "Subject: [text]" from anywhere in the content (more aggressive)
  html = html.replace(/\n*Subject:\s*[^\n]+\n*/gi, '\n').trim();
  // Remove any remaining "Subject:" lines
  html = html.replace(/^Subject:\s*[^\n]*/i, '').trim();
  html = html.replace(/\nSubject:\s*[^\n]*/gi, '\n').trim();

  // Convert markdown-style bold (**text** first, then *text*)
  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  // Single asterisk for bold (avoid matching list markers)
  html = html.replace(/([^\s*])\*([^*\n\s]+?)\*([^\s*])/g, '$1<strong>$2</strong>$3');
  html = html.replace(/([^\s*])\*([^*\n\s]+?)\*$/g, '$1<strong>$2</strong>');
  html = html.replace(/^\*([^*\n\s]+?)\*([^\s*])/g, '<strong>$1</strong>$2');
  
  // Convert markdown-style italic (_text_)
  html = html.replace(/_([^_\n]+?)_/g, '<em>$1</em>');

  // Escape HTML special characters
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restore HTML tags (they were escaped, so restore them)
  html = html.replace(/&lt;strong&gt;/g, '<strong>');
  html = html.replace(/&lt;\/strong&gt;/g, '</strong>');
  html = html.replace(/&lt;em&gt;/g, '<em>');
  html = html.replace(/&lt;\/em&gt;/g, '</em>');

  // Convert line breaks to HTML
  // Split by double line breaks for paragraphs
  const paragraphs = html.split(/\n\n+/);
  html = paragraphs
    .map((para) => {
      para = para.trim();
      if (!para) return '';

      // Handle lists (lines starting with - or * followed by space)
      const lines = para.split(/\n/);
      const isList = lines.some(line => {
        const trimmed = line.trim();
        return (trimmed.startsWith('- ') || trimmed.startsWith('* ')) && trimmed.length > 2;
      });
      
      if (isList) {
        const listItems = lines
          .filter((line) => {
            const trimmed = line.trim();
            return (trimmed.startsWith('- ') || trimmed.startsWith('* ')) && trimmed.length > 2;
          })
          .map((line) => {
            const itemText = line.replace(/^[-*]\s+/, '').trim();
            return `<li>${itemText}</li>`;
          });
        if (listItems.length > 0) {
          return `<ul>${listItems.join('')}</ul>`;
        }
      }

      // Regular paragraph - convert single line breaks to <br>
      const formatted = para.replace(/\n/g, '<br>');
      return `<p>${formatted}</p>`;
    })
    .filter((p) => p)
    .join('');

  return html;
}

/**
 * Get email signature HTML
 */
function getEmailSignature(): string {
  return `
    <div class="email-signature" style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">Thank You</p>
      //<p style="margin: 8px 0; font-size: 14px; color: #333333; font-weight: 600;">Campaign Team</p>
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">Engr. Md Mallick Nazrul Islam</p>
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">NDC1999, LM 0202</p>
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">EC Member Candidate</p>
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">Ballot No. 7</p>
      <p style="margin: 8px 0; font-size: 14px; color: #333333;">01845960925</p>
      <p style="margin: 8px 0; font-size: 14px; color: #2563eb;">
        <a href="https://mallicknazrul.com" style="color: #2563eb; text-decoration: none;">https://mallicknazrul.com</a>
      </p>
    </div>
  `;
}

/**
 * Get email signature plain text
 */
function getEmailSignatureText(): string {
  return `

Thank You

Campaign Team

Engr. Md Mallick Nazrul Islam
NDC1999, LM 0202
EC Member Candidate
Ballot No. 7
01845960925
https://mallicknazrul.com
  `.trim();
}

/**
 * Create a complete HTML email template with proper structure
 */
export function createEmailHTML(content: string, visualUrl?: string): string {
  const formattedContent = formatEmailContent(content);
  const signature = getEmailSignature();
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Campaign Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .email-container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .email-content {
      font-size: 16px;
      line-height: 1.8;
    }
    .email-content p {
      margin: 0 0 16px 0;
    }
    .email-content ul {
      margin: 16px 0;
      padding-left: 30px;
    }
    .email-content li {
      margin: 8px 0;
    }
    .email-content strong {
      font-weight: 600;
      color: #1a1a1a;
    }
    .email-content em {
      font-style: italic;
    }
    .email-visual {
      margin: 30px 0;
      text-align: center;
      width: 100%;
    }
    .email-visual img {
      max-width: 100%;
      width: 100%;
      height: auto;
      border-radius: 8px;
      display: block;
      margin: 0 auto;
    }
    .email-signature {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .email-signature p {
      margin: 8px 0;
      font-size: 14px;
      color: #333333;
    }
    .email-signature a {
      color: #2563eb;
      text-decoration: none;
    }
    .email-signature a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 30px;">
              <div class="email-content" style="font-size: 16px; line-height: 1.8; color: #333333;">
                ${formattedContent}
              </div>
              ${visualUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <img 
                      src="${visualUrl}" 
                      alt="Campaign visual" 
                      style="max-width: 100%; width: 100%; height: auto; display: block; border-radius: 8px; border: none; outline: none;"
                      width="600"
                    />
                  </td>
                </tr>
              </table>
              ` : ''}
              ${signature}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return html;
}

/**
 * Create plain text version of email (for text fallback)
 */
export function createEmailText(content: string): string {
  if (!content) return '';
  
  // Remove any "Subject:" prefix that might have been accidentally included in content
  // Remove "Subject: [text]" from the beginning of the content
  let text = content.replace(/^Subject:\s*[^\n]+\n*/i, '').trim();
  // Remove "Subject: [text]" from anywhere in the content (more aggressive)
  text = text.replace(/\n*Subject:\s*[^\n]+\n*/gi, '\n').trim();
  // Remove any remaining "Subject:" lines
  text = text.replace(/^Subject:\s*[^\n]*/i, '').trim();
  text = text.replace(/\nSubject:\s*[^\n]*/gi, '\n').trim();
  
  // Remove markdown formatting for plain text
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/_([^_\n]+)_/g, '$1');
  
  // Add signature to plain text
  const signature = getEmailSignatureText();
  text = text + '\n\n' + signature;
  
  return text;
}
