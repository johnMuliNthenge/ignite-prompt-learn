import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STKPushRequest {
  action?: string;
  phone_number?: string;
  amount?: number;
  student_id?: string;
  invoice_id?: string;
  account_reference?: string;
  transaction_desc?: string;
  // For test connection
  consumer_key?: string;
  consumer_secret?: string;
  environment?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: STKPushRequest = await req.json();

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle test connection
    if (body.action === "test_connection") {
      const { consumer_key, consumer_secret, environment } = body;
      
      if (!consumer_key || !consumer_secret) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing credentials" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const baseUrl = environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

      try {
        const authString = btoa(`${consumer_key}:${consumer_secret}`);
        const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          method: "GET",
          headers: {
            Authorization: `Basic ${authString}`,
          },
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
          return new Response(
            JSON.stringify({ success: true, message: "Connection successful" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, error: tokenData.errorMessage || "Invalid credentials" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Connection test error:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to connect to M-Pesa API" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For STK Push, get settings from database
    const { data: settings, error: settingsError } = await supabaseClient
      .from("mpesa_settings")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error("M-Pesa settings error:", settingsError);
      return new Response(
        JSON.stringify({ error: "M-Pesa is not configured or inactive" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { phone_number, amount, student_id, invoice_id, account_reference, transaction_desc } = body;

    if (!phone_number || !amount) {
      return new Response(
        JSON.stringify({ error: "Phone number and amount are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/\s+/g, "").replace(/^0/, "254").replace(/^\+/, "");
    if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    const baseUrl = settings.environment === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

    // Get access token
    const authString = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${authString}`,
      },
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with M-Pesa" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    
    // Generate password
    const password = btoa(`${settings.business_short_code}${settings.passkey}${timestamp}`);

    // Default callback URL
    const callbackUrl = settings.callback_url || 
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

    // Initiate STK Push
    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: settings.business_short_code,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: settings.business_short_code,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: account_reference || "SchoolFees",
        TransactionDesc: transaction_desc || "Fee Payment",
      }),
    });

    const stkData = await stkResponse.json();
    console.log("STK Push response:", stkData);

    if (stkData.ResponseCode === "0") {
      // Log the transaction
      await supabaseClient.from("mpesa_transactions").insert({
        checkout_request_id: stkData.CheckoutRequestID,
        merchant_request_id: stkData.MerchantRequestID,
        student_id: student_id || null,
        invoice_id: invoice_id || null,
        phone_number: formattedPhone,
        amount: amount,
        account_reference: account_reference || "SchoolFees",
        transaction_desc: transaction_desc || "Fee Payment",
        status: "pending",
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "STK Push sent successfully. Please check your phone.",
          checkout_request_id: stkData.CheckoutRequestID,
          merchant_request_id: stkData.MerchantRequestID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("STK Push failed:", stkData);
      return new Response(
        JSON.stringify({
          success: false,
          error: stkData.errorMessage || stkData.ResponseDescription || "Failed to initiate payment",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
  } catch (error) {
    console.error("M-Pesa STK Push error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
