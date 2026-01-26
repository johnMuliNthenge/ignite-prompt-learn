import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ContractExpiry() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Contract Expiry</h1><p className="text-muted-foreground">Upcoming contract expirations</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Expiring Contracts</CardTitle></CardHeader>
        <CardContent><div className="text-center py-8 text-muted-foreground">Add contract end dates to employees to track expirations.</div></CardContent>
      </Card>
    </div>
  );
}
