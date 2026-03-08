import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { payslipId } = await req.json();
    if (!payslipId) throw new Error("payslipId is required");

    // Get payslip with employee and period data
    const { data: payslip, error: psErr } = await supabase
      .from("payslips")
      .select("*, hr_employees(employee_no, first_name, middle_name, last_name, email, hr_departments(name)), payroll_periods(name)")
      .eq("id", payslipId)
      .single();
    if (psErr || !payslip) throw new Error("Payslip not found");

    const employeeEmail = payslip.hr_employees?.email;
    if (!employeeEmail) throw new Error("Employee has no email address");

    // Get payslip details
    const { data: details } = await supabase
      .from("payroll_item_details")
      .select("*")
      .eq("payroll_item_id", payslip.payroll_item_id)
      .order("component_type");

    // Get institution settings
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("institution_name")
      .limit(1)
      .single();

    // Get payroll settings for email template
    const { data: payrollSettings } = await supabase
      .from("payroll_settings")
      .select("payslip_email_template")
      .limit(1)
      .single();

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

    const institutionName = siteSettings?.institution_name || "Institution";
    const empName = `${payslip.hr_employees?.first_name || ""} ${payslip.hr_employees?.last_name || ""}`.trim();
    const periodName = payslip.payroll_periods?.name || "Period";

    const earnings = (details || []).filter((d: any) => d.component_type === "earning");
    const deductions = (details || []).filter((d: any) => d.component_type === "deduction");
    const reliefs = (details || []).filter((d: any) => d.component_type === "relief");
    const employerItems = (details || []).filter((d: any) => d.component_type === "employer");

    const fmt = (n: number) => new Intl.NumberFormat("en-KE").format(n || 0);

    // Build email body template
    let emailIntro = payrollSettings?.payslip_email_template || 
      `Dear {employee_name},\n\nPlease find your payslip for {period} below.\n\nRegards,\nHR Department`;
    emailIntro = emailIntro
      .replace(/\{employee_name\}/g, empName)
      .replace(/\{period\}/g, periodName)
      .replace(/\{net_pay\}/g, fmt(payslip.net_pay))
      .replace(/\{gross_pay\}/g, fmt(payslip.gross_pay))
      .replace(/\n/g, "<br>");

    const earningsRows = earnings.map((d: any) => 
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${d.component_name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.amount)}</td></tr>`
    ).join("");

    const deductionRows = deductions.map((d: any) => 
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${d.component_name}${d.is_statutory ? ' <small>(Statutory)</small>' : ''}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.amount)}</td></tr>`
    ).join("");

    const reliefRows = reliefs.map((d: any) =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#2563eb">${d.component_name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#2563eb">(${fmt(d.amount)})</td></tr>`
    ).join("");

    const employerRows = employerItems.map((d: any) =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${d.component_name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${fmt(d.amount)}</td></tr>`
    ).join("");

    const emailHtml = `
      <html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
          <div style="background:#1a1a2e;color:#fff;padding:20px;text-align:center">
            <h1 style="margin:0;font-size:20px">${institutionName}</h1>
            <p style="margin:5px 0 0;font-size:13px;opacity:0.8">PAYSLIP - ${periodName}</p>
          </div>
          <div style="padding:20px">
            <p style="font-size:14px;color:#333">${emailIntro}</p>
            <hr style="border:none;border-top:1px solid #eee;margin:15px 0">
            <table style="width:100%;font-size:13px;margin-bottom:10px">
              <tr><td><strong>Employee:</strong> ${empName}</td><td><strong>Staff ID:</strong> ${payslip.hr_employees?.employee_no || '-'}</td></tr>
              <tr><td><strong>Department:</strong> ${payslip.hr_employees?.hr_departments?.name || '-'}</td><td><strong>Payslip #:</strong> ${payslip.payslip_number}</td></tr>
            </table>
            
            <h3 style="color:#16a34a;font-size:14px;margin:15px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px">Earnings</h3>
            <table style="width:100%;font-size:13px">${earningsRows}
              <tr style="font-weight:bold;border-top:2px solid #333"><td style="padding:8px 12px">Gross Pay</td><td style="padding:8px 12px;text-align:right">${fmt(payslip.gross_pay)}</td></tr>
            </table>
            
            <h3 style="color:#dc2626;font-size:14px;margin:15px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px">Deductions</h3>
            <table style="width:100%;font-size:13px">${deductionRows}${reliefRows}
              <tr style="font-weight:bold;border-top:2px solid #333;color:#dc2626"><td style="padding:8px 12px">Total Deductions</td><td style="padding:8px 12px;text-align:right">${fmt(payslip.total_deductions)}</td></tr>
            </table>

            ${employerRows ? `
              <h3 style="color:#2563eb;font-size:14px;margin:15px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px">Employer Contributions</h3>
              <table style="width:100%;font-size:13px">${employerRows}</table>
            ` : ''}
            
            <div style="text-align:center;font-size:20px;font-weight:bold;margin:20px 0;padding:15px;border:2px solid #333;border-radius:8px;background:#f9fafb">
              NET PAY: ${fmt(payslip.net_pay)}
            </div>
            
            <p style="text-align:center;font-size:11px;color:#999;margin-top:20px">This is a computer-generated payslip. No signature required.</p>
          </div>
        </div>
      </body></html>
    `;

    // Send via SMTP
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
      to: employeeEmail,
      subject: `Payslip - ${periodName} | ${institutionName}`,
      content: `Your payslip for ${periodName}. Net Pay: ${fmt(payslip.net_pay)}`,
      html: emailHtml,
    });
    await client.close();

    // Update payslip status
    await supabase.from("payslips").update({
      email_sent: true,
      email_sent_at: new Date().toISOString(),
    }).eq("id", payslipId);

    console.log(`Payslip ${payslip.payslip_number} sent to ${employeeEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: `Payslip sent to ${employeeEmail}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending payslip:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send payslip. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
