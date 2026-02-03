import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa Callback received:", JSON.stringify(body, null, 2));

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stkCallback = body?.Body?.stkCallback;
    
    if (!stkCallback) {
      console.error("Invalid callback format");
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Find the transaction
    const { data: transaction, error: findError } = await supabaseClient
      .from("mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .single();

    if (findError || !transaction) {
      console.error("Transaction not found:", CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceiptNumber = "";
      let transactionDate = new Date().toISOString();
      let amount = transaction.amount;
      let phoneNumber = transaction.phone_number;

      // Parse callback metadata
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          switch (item.Name) {
            case "MpesaReceiptNumber":
              mpesaReceiptNumber = item.Value;
              break;
            case "TransactionDate":
              // Convert from YYYYMMDDHHMMSS to ISO
              const dateStr = String(item.Value);
              if (dateStr.length === 14) {
                const year = dateStr.slice(0, 4);
                const month = dateStr.slice(4, 6);
                const day = dateStr.slice(6, 8);
                const hour = dateStr.slice(8, 10);
                const minute = dateStr.slice(10, 12);
                const second = dateStr.slice(12, 14);
                transactionDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
              }
              break;
            case "Amount":
              amount = item.Value;
              break;
            case "PhoneNumber":
              phoneNumber = String(item.Value);
              break;
          }
        }
      }

      // Update transaction
      await supabaseClient
        .from("mpesa_transactions")
        .update({
          status: "success",
          result_code: String(ResultCode),
          result_desc: ResultDesc,
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: transactionDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // If linked to an invoice, create fee payment
      if (transaction.invoice_id) {
        // Generate receipt number
        const { data: receiptData } = await supabaseClient.rpc("generate_receipt_number");
        const receiptNumber = receiptData || `RCP-MPESA-${Date.now()}`;

        // Create payment record
        await supabaseClient.from("fee_payments").insert({
          receipt_number: receiptNumber,
          student_id: transaction.student_id,
          invoice_id: transaction.invoice_id,
          payment_date: transactionDate.split("T")[0],
          amount: amount,
          reference_number: mpesaReceiptNumber,
          notes: `M-Pesa payment from ${phoneNumber}`,
          status: "Completed",
        });

        // Update invoice balance
        const { data: invoice } = await supabaseClient
          .from("fee_invoices")
          .select("total_amount, balance_due")
          .eq("id", transaction.invoice_id)
          .single();

        if (invoice) {
          const newBalance = Math.max(0, invoice.balance_due - amount);
          const newStatus = newBalance <= 0 ? "Paid" : "Partial";

          await supabaseClient
            .from("fee_invoices")
            .update({
              amount_paid: invoice.total_amount - newBalance,
              balance_due: newBalance,
              status: newStatus,
            })
            .eq("id", transaction.invoice_id);
        }
      }

      console.log("Payment processed successfully:", mpesaReceiptNumber);
    } else {
      // Payment failed or cancelled
      await supabaseClient
        .from("mpesa_transactions")
        .update({
          status: ResultCode === 1032 ? "cancelled" : "failed",
          result_code: String(ResultCode),
          result_desc: ResultDesc,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      console.log("Payment failed:", ResultDesc);
    }

    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Callback processing error:", error);
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
