import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface VoteHead {
  name: string;
  amount: number;
}

interface PaymentReceiptProps {
  receiptNumber: string;
  studentName: string;
  studentNo: string;
  paymentDate: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  voteHeads: VoteHead[];
  receivedBy?: string;
}

const PaymentReceipt = forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ receiptNumber, studentName, studentNo, paymentDate, amount, referenceNumber, notes, voteHeads, receivedBy }, ref) => {
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
      }).format(value);
    };

    return (
      <div ref={ref} className="bg-white p-8 max-w-md mx-auto text-black print:text-black">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold">OFFICIAL RECEIPT</h1>
          <p className="text-sm text-gray-600 mt-1">Fee Payment Receipt</p>
        </div>

        {/* Receipt Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt No:</span>
            <span className="font-mono">{receiptNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Date:</span>
            <span>{format(new Date(paymentDate), 'dd MMMM yyyy')}</span>
          </div>
        </div>

        {/* Student Details */}
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <h3 className="font-semibold mb-2 text-sm uppercase text-gray-600">Student Details</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Name:</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between">
              <span>Student No:</span>
              <span className="font-mono">{studentNo}</span>
            </div>
          </div>
        </div>

        {/* Vote Heads / Payment Breakdown */}
        <div className="mb-6">
          <h3 className="font-semibold mb-2 text-sm uppercase text-gray-600">Payment Breakdown (Vote Heads)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {voteHeads.length > 0 ? (
                voteHeads.map((vh, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-2">{vh.name}</td>
                    <td className="text-right py-2">{formatCurrency(vh.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-2">General Payment</td>
                  <td className="text-right py-2">{formatCurrency(amount)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="py-2 border-t-2 border-black">TOTAL PAID</td>
                <td className="text-right py-2 border-t-2 border-black">{formatCurrency(amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Reference & Notes */}
        {(referenceNumber || notes) && (
          <div className="border-t pt-4 mb-6 space-y-2 text-sm">
            {referenceNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Reference:</span>
                <span>{referenceNumber}</span>
              </div>
            )}
            {notes && (
              <div>
                <span className="text-gray-600">Notes:</span>
                <p className="mt-1">{notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 mt-6">
          <div className="flex justify-between text-sm mb-8">
            <span className="text-gray-600">Received By:</span>
            <span>{receivedBy || 'System'}</span>
          </div>
          
          <div className="flex justify-between mt-8">
            <div className="text-center">
              <div className="border-t border-black w-32 pt-1">
                <span className="text-xs text-gray-600">Cashier Signature</span>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-32 pt-1">
                <span className="text-xs text-gray-600">Official Stamp</span>
              </div>
            </div>
          </div>
        </div>

        {/* Print Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
          <p>This is a computer-generated receipt.</p>
          <p>Printed on: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
        </div>
      </div>
    );
  }
);

PaymentReceipt.displayName = 'PaymentReceipt';

export default PaymentReceipt;
