import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users } from "lucide-react";

export default function Structure() {
  const { data: departments, isLoading } = useQuery({
    queryKey: ['hr-departments-structure'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_departments')
        .select('*, parent:parent_id(name)')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: employeeCounts } = useQuery({
    queryKey: ['hr-department-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('department_id')
        .eq('employment_status', 'active');
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(emp => {
        if (emp.department_id) {
          counts[emp.department_id] = (counts[emp.department_id] || 0) + 1;
        }
      });
      return counts;
    }
  });

  const rootDepartments = departments?.filter(d => !d.parent_id) || [];
  const getChildren = (parentId: string) => departments?.filter(d => d.parent_id === parentId) || [];

  const renderDepartment = (dept: any, level: number = 0) => {
    const children = getChildren(dept.id);
    const count = employeeCounts?.[dept.id] || 0;

    return (
      <div key={dept.id} className={`${level > 0 ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
        <div className="flex items-center gap-3 p-4 bg-card border rounded-lg mb-2 hover:shadow-md transition-shadow">
          <Building className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium">{dept.name}</h3>
            {dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">{count}</span>
          </div>
        </div>
        {children.length > 0 && (
          <div className="mt-2">
            {children.map(child => renderDepartment(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Structure</h1>
        <p className="text-muted-foreground">View the organizational hierarchy</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : rootDepartments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No departments found. Add departments in the Departments section.
            </div>
          ) : (
            <div className="space-y-4">
              {rootDepartments.map(dept => renderDepartment(dept))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
