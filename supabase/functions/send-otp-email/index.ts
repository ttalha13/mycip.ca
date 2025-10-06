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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if RESEND_API_KEY is available
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured', 
          details: 'RESEND_API_KEY environment variable is missing' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email, token, name }: EmailRequest = await req.json()

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'Email and token are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return new Response(
        JSON.stringify({ error: 'Token must be 6 digits' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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

    console.log(`Attempting to send email to: ${email}`)

    // Send email via Resend API
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MyCIP <noreply@mycip.ca>',
        to: [email],
        subject: `Your MyCIP Login Code: ${token}`,
        html: emailHtml,
        text: emailText,
      }),
    })

    const responseText = await emailResponse.text()
    console.log(`Resend API response status: ${emailResponse.status}`)
    console.log(`Resend API response: ${responseText}`)

    if (!emailResponse.ok) {
      console.error('Email sending failed:', responseText)
      
      // Parse error response if possible
      let errorMessage = 'Failed to send email'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch (e) {
        // Use default error message
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Email sending failed', 
          details: errorMessage,
          status: emailResponse.status
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = JSON.parse(responseText)
    console.log('Email sent successfully:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: result.id 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-otp-email function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})