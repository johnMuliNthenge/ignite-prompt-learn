import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator } from "lucide-react";

export default function LeaveLiability() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Leave Liability Report</h1><p className="text-muted-foreground">Outstanding leave balances and liability</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Leave Liability</CardTitle></CardHeader>
        <CardContent><div className="text-center py-8 text-muted-foreground">Configure leave types with monetary values to calculate liability.</div></CardContent>
      </Card>
    </div>
  );
}
