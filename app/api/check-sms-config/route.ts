import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to verify BulkSMSBD API configuration and connectivity
 * Similar to check-email-config but for SMS
 */
export async function GET() {
  try {
    const apiKey = process.env.BULKSMSBD_API_KEY;
    const senderId = process.env.SMS_SENDER_ID || 'MALLICK NDC';
    const apiBaseUrl = process.env.BULKSMSBD_API_URL || 'http://bulksmsbd.net/api';

    // Get current server IP address (for whitelisting)
    let serverIP: string | null = null;
    try {
      // Try to get IP from a service that shows your server's IP
      const ipResponse = await fetch('https://api.ipify.org?format=json', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        serverIP = ipData.ip || null;
      }
    } catch (e) {
      // Failed to get IP, that's okay
      console.log('Could not fetch server IP:', e);
    }

    const diagnostics: any = {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyFormat: apiKey ? (apiKey.length > 10 ? 'VALID' : 'TOO_SHORT') : 'MISSING',
      senderId: senderId,
      apiBaseUrl: apiBaseUrl,
      serverIP: serverIP,
      note: 'SMS configuration check'
    };

    // Check balance API (if available)
    if (apiKey) {
      try {
        const balanceUrl = `${apiBaseUrl}/getBalanceApi?api_key=${apiKey}`;
        const balanceResponse = await fetch(balanceUrl, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
            'User-Agent': 'CampaignManager/1.0',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        const balanceText = await balanceResponse.text();
        
        // Check if response is HTML (error page)
        if (balanceText.trim().startsWith('<!DOCTYPE') || balanceText.trim().startsWith('<html')) {
          diagnostics.balanceCheck = 'FAILED - API returned HTML error page';
          diagnostics.balance = null;
          diagnostics.canAccessAPI = false;
        } else {
          // Try to parse balance (could be a number or error code)
          const balanceValue = parseFloat(balanceText.trim());
          if (!isNaN(balanceValue)) {
            diagnostics.balanceCheck = 'SUCCESS';
            diagnostics.balance = balanceValue;
            diagnostics.canAccessAPI = true;
          } else {
            // Might be an error code
            const errorCode = parseInt(balanceText.trim());
            if (!isNaN(errorCode)) {
              diagnostics.balanceCheck = 'ERROR_CODE';
              diagnostics.balance = null;
              diagnostics.errorCode = errorCode;
              diagnostics.canAccessAPI = true; // API is accessible, just returned an error
              
              // Map common error codes
              const errorMessages: Record<number, string> = {
                1011: 'User ID not found',
                1031: 'Account not verified',
                1032: 'IP not whitelisted',
                1007: 'Balance insufficient',
              };
              diagnostics.errorMessage = errorMessages[errorCode] || `Error code: ${errorCode}`;
            } else {
              diagnostics.balanceCheck = 'UNKNOWN_RESPONSE';
              diagnostics.balance = null;
              diagnostics.rawResponse = balanceText.substring(0, 200);
              diagnostics.canAccessAPI = true;
            }
          }
        }
      } catch (balanceError: any) {
        diagnostics.balanceCheck = 'FAILED';
        diagnostics.balance = null;
        diagnostics.canAccessAPI = false;
        diagnostics.balanceError = balanceError.message || 'Failed to check balance';
      }
    } else {
      diagnostics.balanceCheck = 'SKIPPED - No API key';
      diagnostics.canAccessAPI = false;
    }

    // Determine overall status
    const hasValidConfig = diagnostics.hasApiKey && diagnostics.apiKeyFormat === 'VALID';
    const isWorking = hasValidConfig && diagnostics.canAccessAPI;

    return NextResponse.json({
      success: isWorking,
      message: isWorking 
        ? 'SMS configuration looks good!' 
        : hasValidConfig 
          ? 'SMS API key is configured but API is not accessible. Check your network or API status.'
          : 'SMS API key is missing or invalid. Please set BULKSMSBD_API_KEY in environment variables.',
      diagnostics: diagnostics,
      recommendations: !hasValidConfig ? [
        'Set BULKSMSBD_API_KEY in your environment variables (Vercel Dashboard → Settings → Environment Variables)',
        'Get your API key from BulkSMSBD dashboard',
        'Redeploy your application after adding the key'
      ] : !diagnostics.canAccessAPI ? [
        'Check your network connection',
        'Verify BulkSMSBD API is online',
        'Check if your IP is whitelisted (error code 1032)',
        'Verify your account is active and verified (error code 1031)'
      ] : diagnostics.errorCode ? [
        `API returned error code ${diagnostics.errorCode}: ${diagnostics.errorMessage || 'Unknown error'}`,
        'Check BulkSMSBD dashboard for account status',
        'Contact BulkSMSBD support if issue persists'
      ] : [
        'SMS system is ready to use!',
        `Current balance: ${diagnostics.balance !== null ? diagnostics.balance : 'Unable to check'}`,
        `Sender ID: ${senderId}`,
        serverIP ? `Your current server IP: ${serverIP} (whitelist this in BulkSMSBD if you get error 1032)` : 'Could not determine server IP',
        'Note: Sender ID must match exactly as registered (case-sensitive)',
        'Note: If using Vercel, IP may change. Contact BulkSMSBD support for IP range whitelisting.'
      ]
    });
  } catch (error: any) {
    console.error('SMS config check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check SMS configuration',
        diagnostics: {
          error: error.message
        }
      },
      { status: 500 }
    );
  }
}





