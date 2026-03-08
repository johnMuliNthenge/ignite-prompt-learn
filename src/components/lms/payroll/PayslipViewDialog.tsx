import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Mail, Loader2 } from 'lucide-react';
import { useInstitution } from '@/contexts/InstitutionContext';

interface PayslipViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payrollItem: any;
  details: any[];
  periodName?: string;
  onSendEmail?: () => void;
  sending?: boolean;
}

const PayslipViewDialog = ({ open, onOpenChange, payrollItem, details, periodName, onSendEmail, sending }: PayslipViewDialogProps) => {
  const { settings: institution } = useInstitution();
  const printRef = useRef<HTMLDivElement>(null);

  if (!payrollItem) return null;

  const earnings = details.filter(d => d.component_type === 'earning');
  const deductions = details.filter(d => d.component_type === 'deduction');
  const reliefs = details.filter(d => d.component_type === 'relief');
  const employerItems = details.filter(d => d.component_type === 'employer');

  const emp = payrollItem.hr_employees || {};
  const empName = `${emp.first_name || ''} ${emp.middle_name || ''} ${emp.last_name || ''}`.trim();

  const printPayslip = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Payslip - ${empName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; }
        .header p { margin: 5px 0; color: #666; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
        .section h3 { font-size: 14px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px dotted #eee; }
        .total { font-weight: bold; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; }
        .columns { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .net-pay { text-align: center; font-size: 18px; font-weight: bold; margin-top: 20px; padding: 15px; border: 2px solid #333; }
        .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #999; }
        @media print { body { padding: 15px; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Payslip: {empName}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={printPayslip}><Printer className="h-4 w-4 mr-1" />Print</Button>
              {onSendEmail && (
                <Button size="sm" onClick={onSendEmail} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}Email
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        <div ref={printRef}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '20px' }}>{institution?.institution_name || 'Institution'}</h1>
            <p style={{ margin: '5px 0', color: '#666', fontSize: '12px' }}>PAYSLIP - {periodName || ''}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
            <div>Employee: <strong>{empName}</strong></div>
            <div>Staff ID: <strong>{emp.employee_no}</strong></div>
            <div>Department: <strong>{emp.hr_departments?.name || '-'}</strong></div>
            <div>Period: <strong>{periodName}</strong></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: 'green' }}>Earnings</h3>
              {earnings.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                  <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                </div>
              ))}
              <div style={{ fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Gross Pay</span><span>{payrollItem.gross_pay?.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: 'red' }}>Deductions</h3>
              {deductions.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                  <span>{d.component_name} {d.is_statutory ? '(Statutory)' : ''}</span><span>{d.amount?.toLocaleString()}</span>
                </div>
              ))}
              {reliefs.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee', color: 'blue' }}>
                  <span>{d.component_name}</span><span>({d.amount?.toLocaleString()})</span>
                </div>
              ))}
              <div style={{ fontWeight: 'bold', borderTop: '2px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', color: 'red' }}>
                <span>Total Deductions</span><span>{payrollItem.total_deductions?.toLocaleString()}</span>
              </div>
            </div>
          </div>
          {employerItems.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '4px', color: '#2563eb' }}>Employer Contributions (Not deducted from salary)</h3>
              {employerItems.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', borderBottom: '1px dotted #eee' }}>
                  <span>{d.component_name}</span><span>{d.amount?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', padding: '15px', border: '2px solid #333' }}>
            NET PAY: {payrollItem.net_pay?.toLocaleString()}
          </div>
          <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px', color: '#999' }}>
            This is a computer-generated payslip. No signature required.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayslipViewDialog;
