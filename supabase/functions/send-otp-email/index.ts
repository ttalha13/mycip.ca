import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface EmailRequest {
  email: string
  token: string
  name?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('🚀 Edge Function started - send-otp-email')
  console.log('📝 Request method:', req.method)
  console.log('🌐 Request URL:', req.url)
  console.log('📅 Timestamp:', new Date().toISOString())

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Checking environment variables...')
    
    // Check if RESEND_API_KEY is available
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured', 
          details: 'RESEND_API_KEY environment variable is missing',
          debug: 'Check Supabase Dashboard → Edge Functions → Secrets',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ RESEND_API_KEY found')
    console.log('🔑 API Key length:', RESEND_API_KEY.length)
    console.log('🔑 API Key starts with:', RESEND_API_KEY.substring(0, 3) + '...')

    // Validate API key format
    if (!RESEND_API_KEY.startsWith('re_')) {
      console.error('❌ Invalid RESEND_API_KEY format - should start with "re_"')
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API key format', 
          details: 'Resend API key should start with "re_"',
          debug: `Current key starts with: ${RESEND_API_KEY.substring(0, 3)}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📦 Parsing request body...')
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('📝 Raw request body:', bodyText)
      requestBody = JSON.parse(bodyText)
      console.log('✅ Request body parsed successfully')
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body', 
          details: 'Request body must be valid JSON',
          debug: parseError.message,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, token, name }: EmailRequest = requestBody
    console.log('📧 Email:', email)
    console.log('🎫 Token:', token ? `${token.substring(0, 2)}****` : 'undefined')
    console.log('👤 Name:', name || 'Not provided')

    if (!email || !token) {
      console.error('❌ Missing required fields')
      return new Response(
        JSON.stringify({ 
          error: 'Email and token are required',
          debug: `Email: ${!!email}, Token: ${!!token}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format',
          debug: `Email provided: ${email}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      console.error('❌ Invalid token format:', token)
      return new Response(
        JSON.stringify({ 
          error: 'Token must be 6 digits',
          debug: `Token provided: ${token}, Length: ${token.length}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ All validations passed')

    // Email HTML template
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your MyCIP Login Code</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 20px; text-align: center; }
            .logo { color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px; }
            .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
            .content { padding: 40px 20px; text-align: center; }
            .token-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 30px; margin: 30px 0; }
            .token { font-size: 36px; font-weight: bold; color: #1e293b; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .expires { color: #64748b; font-size: 14px; margin-top: 15px; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; text-align: left; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🇨🇦 MyCIP</div>
                <div class="subtitle">Canadian Immigration Pathways</div>
            </div>
            
            <div class="content">
                <h1 style="color: #1e293b; margin-bottom: 10px;">Your Login Code</h1>
                <p style="color: #64748b; font-size: 16px;">
                    ${name ? `Hi ${name},` : 'Hello,'}<br>
                    Use this code to sign in to your MyCIP account:
                </p>
                
                <div class="token-box">
                    <div class="token">${token}</div>
                    <div class="expires">⏰ Expires in 10 minutes</div>
                </div>
                
                <div class="warning">
                    <strong>🔒 Security Notice:</strong><br>
                    • Never share this code with anyone<br>
                    • MyCIP will never ask for this code via phone or email<br>
                    • If you didn't request this code, please ignore this email
                </div>
                
                <p style="color: #64748b;">
                    Having trouble? Contact us at <a href="https://www.instagram.com/ttalha_13/" style="color: #ef4444;">@ttalha_13</a>
                </p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} MyCIP - Canadian Immigration Pathways</p>
                <p>This email was sent to ${email}</p>
            </div>
        </div>
    </body>
    </html>
    `

    // Email text version (fallback)
    const emailText = `
MyCIP - Your Login Code

Hi ${name || 'there'},

Your 6-digit login code is: ${token}

This code expires in 10 minutes.

Security Notice:
- Never share this code with anyone
- MyCIP will never ask for this code via phone or email
- If you didn't request this code, please ignore this email

Having trouble? Contact us at @ttalha_13

© ${new Date().getFullYear()} MyCIP - Canadian Immigration Pathways
    `

    console.log('📧 Preparing to send email via Resend API...')
    console.log('🎯 Target email:', email)
    console.log('🔍 Email validation check:', emailRegex.test(email))
    console.log('🔍 Token validation check:', /^\d{6}$/.test(token))

    const emailPayload = {
      from: 'MyCIP <noreply@mycip.ca>',
      to: [email],
      subject: `Your MyCIP Login Code: ${token}`,
      html: emailHtml,
      text: emailText,
    }

    console.log('📦 Email payload prepared')
    console.log('📤 From:', emailPayload.from)
    console.log('📥 To:', emailPayload.to)
    console.log('📋 Subject:', emailPayload.subject)
    console.log('🔑 Using API Key prefix:', RESEND_API_KEY.substring(0, 8) + '...')

    // Send email via Resend API
    console.log('🚀 Calling Resend API...')
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    console.log('📡 Resend API response status:', emailResponse.status)
    console.log('📡 Resend API response ok:', emailResponse.ok)
    console.log('📡 Response headers:', Object.fromEntries(emailResponse.headers.entries()))

    const responseText = await emailResponse.text()
    console.log('📡 Resend API response body:', responseText)

    if (!emailResponse.ok) {
      console.error('❌ Email sending failed with status:', emailResponse.status)
      console.error('❌ Response body:', responseText)
      
      // Parse error response if possible
      let errorMessage = 'Failed to send email'
      let errorDetails = responseText
      
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
        errorDetails = JSON.stringify(errorData, null, 2)
        console.error('❌ Parsed error data:', errorData)
      } catch (e) {
        console.log('📝 Could not parse error response as JSON')
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Email sending failed', 
          details: errorMessage,
          status: emailResponse.status,
          debug: {
            resendStatus: emailResponse.status,
            resendResponse: errorDetails,
            apiKeyLength: RESEND_API_KEY.length,
            apiKeyPrefix: RESEND_API_KEY.substring(0, 5),
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
      console.log('✅ Email sent successfully:', result)
    } catch (parseError) {
      console.error('❌ Could not parse success response:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Unexpected response format from email service',
          debug: {
            responseText,
            parseError: parseError.message,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🎉 Function completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: result.id,
        debug: {
          resendStatus: emailResponse.status,
          emailId: result.id,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Unexpected error in send-otp-email function:', error)
    console.error('💥 Error name:', error.name)
    console.error('💥 Error message:', error.message)
    console.error('💥 Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        debug: {
          errorName: error.name,
          errorStack: error.stack,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
