/**
 * BulkSMSBD Proxy Service for Railway
 * 
 * This is a simple Express service that can be deployed to Railway
 * to proxy SMS requests through Railway's static outbound IP.
 * 
 * Project Name: bulksms_proxy
 * 
 * Deploy this to Railway:
 * 1. Create a new Railway project named "bulksms_proxy"
 * 2. Connect this directory
 * 3. Enable static outbound IPs in Railway settings
 * 4. Set environment variables (BULKSMSBD_API_KEY, SMS_SENDER_ID, etc.)
 * 5. Deploy
 * 
 * Then set RAILWAY_SMS_SERVICE_URL in your main app to point to this service.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// BulkSMSBD Configuration
const API_KEY = process.env.BULKSMSBD_API_KEY;
const DEFAULT_SENDER_ID = process.env.SMS_SENDER_ID || 'MALLICK NDC';
const API_BASE_URL = process.env.BULKSMSBD_API_URL || 'http://bulksmsbd.net/api';

// Error code mappings
const ERROR_MESSAGES = {
  202: 'SMS Submitted Successfully',
  1001: 'Invalid Number',
  1002: 'Sender ID not correct or sender ID is disabled',
  1003: 'Please provide all required fields',
  1005: 'Internal Error',
  1006: 'Balance Validity Not Available',
  1007: 'Balance Insufficient',
  1011: 'User ID not found',
  1031: 'Your Account Not Verified',
  1032: 'IP Not whitelisted',
};

// Format phone number
function formatPhoneNumber(phone) {
  return phone.replace(/[^\d]/g, '');
}

// Validate phone number
function validatePhoneNumber(phone) {
  const formatted = formatPhoneNumber(phone);
  
  if (formatted.startsWith('880') && formatted.length === 13) {
    return { valid: true };
  }
  
  if (formatted.startsWith('01') && formatted.length === 11) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Invalid phone number format. Expected: 88017XXXXXXXX or 017XXXXXXXX. Received: ${phone}`
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BulkSMSBD Proxy (bulksms_proxy)',
    timestamp: new Date().toISOString(),
    hasApiKey: !!API_KEY,
    senderId: DEFAULT_SENDER_ID
  });
});

// Get current outbound IP (for whitelisting)
app.get('/api/ip', async (req, res) => {
  try {
    // Make a request to a service that returns your IP
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    
    res.json({
      success: true,
      ip: ipData.ip,
      message: 'This is your Railway static outbound IP. Whitelist this in BulkSMSBD.',
      note: 'If you enabled static outbound IPs in Railway, this IP should remain constant.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get IP address',
      message: error.message
    });
  }
});

// Main SMS sending endpoint
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message, senderId, numbers } = req.body;

    // Validate API key
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BulkSMSBD API key not configured. Set BULKSMSBD_API_KEY in Railway environment variables.'
      });
    }

    const senderIdValue = senderId || DEFAULT_SENDER_ID;

    // Handle bulk SMS
    if (numbers && Array.isArray(numbers) && numbers.length > 0) {
      return await sendBulkSMS(numbers, senderIdValue, res);
    }

    // Single SMS
    if (!to || !to.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone number is required'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    // Validate phone number
    const phoneValidation = validatePhoneNumber(to);
    if (!phoneValidation.valid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error
      });
    }

    const formattedNumber = formatPhoneNumber(to);
    const encodedMessage = encodeURIComponent(message.trim());
    const apiUrl = `${API_BASE_URL}/smsapi?api_key=${API_KEY}&type=text&number=${formattedNumber}&senderid=${encodeURIComponent(senderIdValue)}&message=${encodedMessage}`;

    console.log('Sending SMS via BulkSMSBD (from Railway bulksms_proxy):', {
      to: formattedNumber,
      senderId: senderIdValue,
      messageLength: message.length
    });

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'BulkSMS-Proxy/1.0',
        },
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await response.text();
      console.log('BulkSMSBD API Response:', responseText.substring(0, 200));

      // Check for HTML error page
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        return res.status(500).json({
          success: false,
          error: 'API returned HTML error page',
          details: 'Check your API configuration'
        });
      }

      // Try to parse as JSON
      let statusCode = null;
      try {
        const jsonResponse = JSON.parse(responseText.trim());
        if (jsonResponse.response_code) {
          statusCode = jsonResponse.response_code;
          
          if (statusCode === 1032) {
            const ipAddress = jsonResponse.error_message?.match(/\d+\.\d+\.\d+\.\d+/)?.[0] || 'unknown';
            return res.status(403).json({
              success: false,
              error: 'IP Not Whitelisted (Error 1032)',
              statusCode: 1032,
              ipAddress: ipAddress,
              details: jsonResponse.error_message || 'Your Railway IP needs to be whitelisted in BulkSMSBD',
              help: `Your Railway IP (${ipAddress}) needs to be whitelisted in BulkSMSBD dashboard. Since you're using Railway with static outbound IP, whitelist this IP once and it will work permanently.`
            });
          }
        }
      } catch (e) {
        // Not JSON, parse as number
      }

      // Parse as number
      if (statusCode === null) {
        const parsedCode = parseInt(responseText.trim());
        if (isNaN(parsedCode)) {
          return res.status(500).json({
            success: false,
            error: 'Invalid API response format',
            rawResponse: responseText.substring(0, 200)
          });
        }
        statusCode = parsedCode;
      }

      if (statusCode === 202) {
        return res.json({
          success: true,
          status: 'sent',
          statusCode: 202,
          message: 'SMS Submitted Successfully',
          to: formattedNumber,
          senderId: senderIdValue
        });
      } else {
        const errorMessage = ERROR_MESSAGES[statusCode] || `API Error: ${statusCode}`;
        return res.status(400).json({
          success: false,
          error: errorMessage,
          statusCode: statusCode,
          to: formattedNumber
        });
      }
    } catch (fetchError) {
      console.error('Failed to fetch from BulkSMSBD API:', fetchError);
      return res.status(500).json({
        success: false,
        error: `Network error: ${fetchError.message || 'Failed to connect to SMS API'}`
      });
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send SMS'
    });
  }
});

// Bulk SMS handler
async function sendBulkSMS(numbers, senderId, res) {
  const results = [];
  const errors = [];
  const RATE_LIMIT_DELAY_MS = 500;

  for (let i = 0; i < numbers.length; i++) {
    const item = numbers[i];
    
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    const phoneValidation = validatePhoneNumber(item.number);
    if (!phoneValidation.valid) {
      errors.push({
        number: item.number,
        error: phoneValidation.error
      });
      continue;
    }

    const formattedNumber = formatPhoneNumber(item.number);
    const encodedMessage = encodeURIComponent(item.message.trim());
    const apiUrl = `${API_BASE_URL}/smsapi?api_key=${API_KEY}&type=text&number=${formattedNumber}&senderid=${encodeURIComponent(senderId)}&message=${encodedMessage}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 
          'Accept': '*/*',
          'User-Agent': 'BulkSMS-Proxy/1.0'
        },
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await response.text();
      
      // Check for rate limit
      if (responseText.includes('Too many requests') || responseText.includes('rate limit')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Retry once
        const retryResponse = await fetch(apiUrl, {
          method: 'GET',
          headers: { 
            'Accept': '*/*',
            'User-Agent': 'BulkSMS-Proxy/1.0'
          },
          signal: AbortSignal.timeout(30000),
        });
        const retryText = await retryResponse.text();
        
        if (retryText.includes('Too many requests')) {
          errors.push({
            number: formattedNumber,
            error: 'Rate limit exceeded',
            statusCode: 429
          });
          continue;
        }
        
        const retryCode = parseInt(retryText.trim());
        if (!isNaN(retryCode) && retryCode === 202) {
          results.push({
            number: formattedNumber,
            success: true,
            statusCode: 202
          });
        } else {
          errors.push({
            number: formattedNumber,
            error: ERROR_MESSAGES[retryCode] || `Error ${retryCode}`,
            statusCode: retryCode
          });
        }
        continue;
      }
      
      // Parse response
      let statusCode = null;
      try {
        const jsonResponse = JSON.parse(responseText.trim());
        if (jsonResponse.response_code) {
          statusCode = jsonResponse.response_code;
        }
      } catch (e) {
        // Not JSON
      }
      
      if (statusCode === null) {
        statusCode = parseInt(responseText.trim());
      }
      
      if (statusCode === 202) {
        results.push({
          number: formattedNumber,
          success: true,
          statusCode: 202
        });
      } else {
        errors.push({
          number: formattedNumber,
          error: ERROR_MESSAGES[statusCode] || `Error ${statusCode}`,
          statusCode
        });
      }
    } catch (err) {
      errors.push({
        number: formattedNumber,
        error: err.message || 'Failed to send'
      });
    }
  }

  return res.json({
    success: errors.length === 0,
    total: numbers.length,
    sent: results.length,
    failed: errors.length,
    results,
    errors: errors.length > 0 ? errors : undefined
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BulkSMSBD Proxy Service (bulksms_proxy) running on port ${PORT}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Get IP: http://localhost:${PORT}/api/ip`);
  console.log(`📨 Send SMS: POST http://localhost:${PORT}/api/send-sms`);
  
  if (!API_KEY) {
    console.warn('⚠️  BULKSMSBD_API_KEY not set! Set it in Railway environment variables.');
  }
});
