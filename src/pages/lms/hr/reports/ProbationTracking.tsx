import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function ProbationTracking() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Probation Tracking</h1><p className="text-muted-foreground">Employees on probation</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Probation Status</CardTitle></CardHeader>
        <CardContent><div className="text-center py-8 text-muted-foreground">Track probation periods by setting employment status and confirmation dates.</div></CardContent>
      </Card>
    </div>
  );
}
