import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PasswordSetupRequest {
  employeeId: string;
  email: string;
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

    const { employeeId, email }: PasswordSetupRequest = await req.json();

    if (!employeeId || !email) {
      throw new Error("Employee ID and email are required");
    }

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabase
      .from("smtp_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error("SMTP settings not configured or not active. Please configure SMTP first.");
    }

    // Generate a password reset link using Supabase Auth
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/lms/auth`,
      }
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      throw new Error(`Failed to generate password reset link: ${resetError.message}`);
    }

    const resetLink = resetData?.properties?.action_link;
    
    if (!resetLink) {
      throw new Error("Failed to generate password reset link");
    }

    // Build email content
    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Set Up Your Password</h1>
          <p>Welcome! Your account has been created in our HR system.</p>
          <p>Please click the button below to set up your password and access the system:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Set Up Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #888; word-break: break-all;">${resetLink}</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">
            This link will expire in 24 hours. If you didn't expect this email, please ignore it.
          </p>
        </body>
      </html>
    `;

    // Send email using SMTP
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
      to: email,
      subject: "Set Up Your Password",
      content: "Please set up your password to access the system.",
      html: emailContent,
    });

    await client.close();

    // Update employee record to mark password setup email as sent
    const { error: updateError } = await supabase
      .from("hr_employees")
      .update({ password_setup_sent_at: new Date().toISOString() })
      .eq("id", employeeId);

    if (updateError) {
      console.error("Error updating employee record:", updateError);
      // Don't throw - email was sent successfully
    }

    console.log(`Password setup email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Password setup email sent to ${email}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending password setup email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
