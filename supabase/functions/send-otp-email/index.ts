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
    console.log('🔍 Checking SendGrid API key...')
    
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    
    if (!SENDGRID_API_KEY) {
      console.error('❌ SENDGRID_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured', 
          details: 'SendGrid API key missing',
          debug: 'Check Supabase Dashboard → Edge Functions → Secrets',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ SendGrid API key found')

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

    console.log('📧 Preparing to send email via SendGrid...')
    console.log('🎯 Target email:', email)

    // Import SendGrid
    const { SendGrid } = await import('https://deno.land/x/sendgrid@0.0.3/mod.ts')
    const sendgrid = new SendGrid(SENDGRID_API_KEY)
    
    const sgEmail = {
      to: email,
      from: {
        email: 'abutalha7778@gmail.com',
        name: 'MyCIP'
      },
      subject: `Your MyCIP Login Code: ${token}`,
      text: emailText,
      html: emailHtml,
    }

    console.log('🚀 Sending via SendGrid...')
    await sendgrid.send(sgEmail)
    console.log('✅ Email sent successfully via SendGrid')

    console.log('🎉 Function completed successfully')
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        service: 'sendgrid',
        debug: {
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