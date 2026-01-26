import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function TurnoverReport() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Turnover Report</h1><p className="text-muted-foreground">Employee turnover rate and trends</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Turnover Analysis</CardTitle></CardHeader>
        <CardContent><div className="text-center py-8 text-muted-foreground">Add employee exit data to calculate turnover rates.</div></CardContent>
      </Card>
    </div>
  );
}
