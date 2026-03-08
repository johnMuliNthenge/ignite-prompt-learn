-- Revoke public execute on all number generation functions
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_receipt_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_journal_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_voucher_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_certificate_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_payslip_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_requisition_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_pr_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_rfq_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_po_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_grn_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_supplier_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_item_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_book_code() FROM PUBLIC, anon, authenticated;

-- Grant execute only to service_role (used by triggers and server-side operations)
GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_journal_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_voucher_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_certificate_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_payslip_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_requisition_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_pr_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_rfq_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_grn_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_supplier_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_item_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_book_code() TO service_role;