import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TestEmailRequest {
  to: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });
    
    if (!roleData) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { to }: TestEmailRequest = await req.json();

    if (!to) {
      throw new Error("Email address is required");
    }

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error("SMTP settings not configured or not active");
    }

    // Build SMTP connection and send test email
    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">SMTP Test Email</h1>
          <p>This is a test email to verify your SMTP configuration.</p>
          <p style="color: #666;">If you received this email, your SMTP settings are working correctly!</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            Sent from: ${smtpSettings.from_name} &lt;${smtpSettings.from_email}&gt;<br>
            Server: ${smtpSettings.host}:${smtpSettings.port}<br>
            Encryption: ${smtpSettings.encryption.toUpperCase()}
          </p>
        </body>
      </html>
    `;

    // Use Deno's SMTP library
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: smtpSettings.host,
        port: smtpSettings.port,
        tls: smtpSettings.encryption === "ssl",
        auth: {
          username: smtpSettings.username,
          password: smtpSettings.password,
        },
      },
    });

    await client.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: to,
      subject: "SMTP Configuration Test",
      content: "This is a test email to verify your SMTP configuration.",
      html: emailContent,
    });

    await client.close();

    console.log(`Test email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: `Test email sent to ${to}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
