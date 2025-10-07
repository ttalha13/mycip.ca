import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  console.log('🔑 Environment check - RESEND_API_KEY exists:', !!Deno.env.get('RESEND_API_KEY'))

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('🔍 Checking Resend API key...')
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured', 
          details: 'Resend API key missing',
          debug: 'Check Supabase Dashboard → Edge Functions → Secrets',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Resend API key found, length:', RESEND_API_KEY.length)

    console.log('📦 Parsing request body...')
    let requestBody
    try {
      const bodyText = await req.text()
      console.log('📝 Raw request body length:', bodyText.length)
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
    console.log('🎫 Token length:', token ? token.length : 'undefined')
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
      console.error('❌ Invalid token format, length:', token.length)
      return new Response(
        JSON.stringify({
          error: 'Token must be 6 digits',
          debug: `Token length: ${token.length}`,
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ All validations passed')

    // Check rate limiting
    console.log('🚦 Checking rate limit for:', email)
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_otp_rate_limit', {
        p_email: email,
        p_ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      })

    if (rateLimitError) {
      console.error('❌ Rate limit check failed:', rateLimitError)
    } else {
      console.log('🚦 Rate limit result:', rateLimitResult)

      if (!rateLimitResult.allowed) {
        const retryAfter = rateLimitResult.retry_after_seconds || 1800
        console.log('🚫 Rate limit exceeded for:', email)
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retry_after_seconds: retryAfter,
            blocked_until: rateLimitResult.blocked_until,
            timestamp: new Date().toISOString()
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString()
            }
          }
        )
      }

      console.log('✅ Rate limit check passed, remaining:', rateLimitResult.remaining)
    }

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

    console.log('📧 Preparing to send email via Resend...')
    console.log('🎯 Target email:', email)
    console.log('🔗 Resend API URL: https://api.resend.com/emails')

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MyCIP <noreply@mycip.ca>',
        to: [email],
        subject: `Your MyCIP Login Code: ${token}`,
        text: emailText,
        html: emailHtml,
      }),
    })

    console.log('📡 Resend Response Status:', resendResponse.status)
    console.log('📡 Resend Response Headers:', Object.fromEntries(resendResponse.headers.entries()))

    let resendResult
    try {
      resendResult = await resendResponse.json()
      console.log('📡 Resend Response Body:', resendResult)
    } catch (parseError) {
      console.error('❌ Failed to parse Resend response as JSON:', parseError)
      const responseText = await resendResponse.text()
      console.error('📄 Raw response text:', responseText)
      throw new Error('Invalid response from email service')
    }

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', resendResult)
      throw new Error(`Resend API error: ${resendResult.message || 'Unknown error'}`)
    }

    console.log('✅ Email sent successfully via Resend')
    console.log('📧 Message ID:', resendResult.id)

    console.log('🎉 Function completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        service: 'resend',
        debug: {
          timestamp: new Date().toISOString(),
          messageId: resendResult.id,
          email: email
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
