import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export default function LeaveBalances() {
  const [search, setSearch] = useState('');

  const { data: balances, isLoading } = useQuery({
    queryKey: ['hr-leave-balances'],
    queryFn: async () => {
      const { data: employees, error: empError } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, employee_no')
        .order('first_name');
      
      if (empError) throw empError;

      const { data: leaveTypes, error: ltError } = await supabase
        .from('hr_leave_types')
        .select('id, name, default_days, is_active')
        .eq('is_active', true);
      
      if (ltError) throw ltError;

      // Get all leave applications
      const { data: applications, error: appError } = await supabase
        .from('hr_leave_applications')
        .select('employee_id, leave_type_id, days_requested, status')
        .eq('status', 'approved');
      
      if (appError) throw appError;

      // Calculate balances per employee
      const result = employees?.map((emp) => {
        const empBalances: any = {
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          employee_no: emp.employee_no,
          leaveBalances: {}
        };

        leaveTypes?.forEach((lt: any) => {
          const taken = applications
            ?.filter(a => a.employee_id === emp.id && a.leave_type_id === lt.id)
            .reduce((sum, a) => sum + (a.days_requested || 0), 0) || 0;
          
          empBalances.leaveBalances[lt.name] = {
            entitled: lt.default_days || 0,
            taken,
            balance: (lt.default_days || 0) - taken
          };
        });

        return empBalances;
      });

      return { employees: result || [], leaveTypes: leaveTypes || [] };
    }
  });

  const filteredEmployees = balances?.employees.filter((emp: any) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_no?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Balances</h1>
        <p className="text-muted-foreground">View employee leave entitlements and balances</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No employees found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee No</TableHead>
                    {balances?.leaveTypes.map((lt: any) => (
                      <TableHead key={lt.id} className="text-center">{lt.name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.employee_no}</TableCell>
                      {balances?.leaveTypes.map((lt: any) => {
                        const balance = emp.leaveBalances[lt.name];
                        return (
                          <TableCell key={lt.id} className="text-center">
                            <div className="space-y-1">
                              <div className={`font-medium ${balance?.balance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {balance?.balance || 0} days
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {balance?.taken || 0} / {balance?.entitled || 0} used
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}