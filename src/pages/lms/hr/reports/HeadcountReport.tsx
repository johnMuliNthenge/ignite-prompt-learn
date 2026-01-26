import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

export default function HeadcountReport() {
  const { data, isLoading } = useQuery({
    queryKey: ['hr-headcount-report'],
    queryFn: async () => {
      const { data: employees, error } = await supabase
        .from('hr_employees')
        .select('department_id, gender');
      if (error) throw error;
      
      const { data: depts } = await supabase.from('hr_departments').select('id, name');
      const deptMap: Record<string, string> = {};
      depts?.forEach(d => deptMap[d.id] = d.name);
      
      const byDept: Record<string, { total: number; male: number; female: number }> = {};
      employees?.forEach((emp: any) => {
        const deptName = emp.department_id ? deptMap[emp.department_id] || 'Unassigned' : 'Unassigned';
        if (!byDept[deptName]) byDept[deptName] = { total: 0, male: 0, female: 0 };
        byDept[deptName].total++;
        if (emp.gender === 'male') byDept[deptName].male++;
        else if (emp.gender === 'female') byDept[deptName].female++;
      });
      
      return { byDept, total: employees?.length || 0 };
    }
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Headcount Report</h1>
        <p className="text-muted-foreground">Employee distribution by department and gender</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Total Employees: {data?.total || 0}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Male</TableHead>
                  <TableHead className="text-center">Female</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data?.byDept || {}).map(([dept, counts]) => (
                  <TableRow key={dept}>
                    <TableCell className="font-medium">{dept}</TableCell>
                    <TableCell className="text-center">{counts.total}</TableCell>
                    <TableCell className="text-center">{counts.male}</TableCell>
                    <TableCell className="text-center">{counts.female}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}