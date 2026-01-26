import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function AbsenteeismReport() {
  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-3xl font-bold">Absenteeism Report</h1><p className="text-muted-foreground">Employee absence patterns and trends</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Absenteeism Analysis</CardTitle></CardHeader>
        <CardContent><div className="text-center py-8 text-muted-foreground">Track attendance to generate absenteeism data.</div></CardContent>
      </Card>
    </div>
  );
}
