import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EmploymentStatus = 'active' | 'probation' | 'confirmed' | 'suspended' | 'resigned' | 'terminated' | 'retired' | 'deceased';

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    national_id: '',
    passport_no: '',
    phone: '',
    email: '',
    physical_address: '',
    employment_term_id: '',
    employee_category_id: '',
    casual_category_id: '',
    designation_id: '',
    department_id: '',
    rank_id: '',
    date_of_hire: '',
    confirmation_date: '',
    supervisor_id: '',
    status: 'active' as EmploymentStatus,
    leave_group_id: '',
    work_week_id: '',
    login_enabled: false,
  });

  // Fetch employee data
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['hr-employee', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Populate form when employee data loads
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name || '',
        middle_name: employee.middle_name || '',
        last_name: employee.last_name || '',
        gender: employee.gender || '',
        date_of_birth: employee.date_of_birth || '',
        national_id: employee.national_id || '',
        passport_no: employee.passport_no || '',
        phone: employee.phone || '',
        email: employee.email || '',
        physical_address: employee.physical_address || '',
        employment_term_id: employee.employment_term_id || '',
        employee_category_id: employee.employee_category_id || '',
        casual_category_id: employee.casual_category_id || '',
        designation_id: employee.designation_id || '',
        department_id: employee.department_id || '',
        rank_id: employee.rank_id || '',
        date_of_hire: employee.date_of_hire || '',
        confirmation_date: employee.confirmation_date || '',
        supervisor_id: employee.supervisor_id || '',
        status: (employee.status as EmploymentStatus) || 'active',
        leave_group_id: employee.leave_group_id || '',
        work_week_id: employee.work_week_id || '',
        login_enabled: employee.login_enabled || false,
      });
    }
  }, [employee]);

  // Fetch reference data
  const { data: departments } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_departments').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: designations } = useQuery({
    queryKey: ['hr-designations'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_designations').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: ranks } = useQuery({
    queryKey: ['hr-ranks'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_ranks').select('*').eq('is_active', true).order('level');
      return data || [];
    }
  });

  const { data: employmentTerms } = useQuery({
    queryKey: ['hr-employment-terms'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_employment_terms').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['hr-employee-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_employee_categories').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: casualCategories } = useQuery({
    queryKey: ['hr-casual-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_casual_categories').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: leaveGroups } = useQuery({
    queryKey: ['hr-leave-groups'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_leave_groups').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: workWeeks } = useQuery({
    queryKey: ['hr-work-weeks'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_work_weeks').select('*').eq('is_active', true);
      return data || [];
    }
  });

  const { data: employees } = useQuery({
    queryKey: ['hr-employees-supervisors'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_employees').select('id, first_name, last_name, employee_no').eq('status', 'active');
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const updateData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        national_id: data.national_id || null,
        passport_no: data.passport_no || null,
        phone: data.phone || null,
        email: data.email || null,
        physical_address: data.physical_address || null,
        employment_term_id: data.employment_term_id || null,
        employee_category_id: data.employee_category_id || null,
        casual_category_id: data.casual_category_id || null,
        designation_id: data.designation_id || null,
        department_id: data.department_id || null,
        rank_id: data.rank_id || null,
        date_of_hire: data.date_of_hire || null,
        confirmation_date: data.confirmation_date || null,
        supervisor_id: data.supervisor_id || null,
        status: data.status,
        leave_group_id: data.leave_group_id || null,
        work_week_id: data.work_week_id || null,
        login_enabled: data.login_enabled,
      };

      const { error } = await supabase.from('hr_employees').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Employee updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      queryClient.invalidateQueries({ queryKey: ['hr-employee', id] });
      navigate('/lms/hr/employees');
    },
    onError: (error: any) => {
      toast({ title: "Error updating employee", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      toast({ title: "First name and last name are required", variant: "destructive" });
      return;
    }
    updateMutation.mutate(formData);
  };

  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/lms/hr/employees')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Employee</h1>
          <p className="text-muted-foreground">
            {employee?.employee_no} - {employee?.first_name} {employee?.last_name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="employment">Employment Details</TabsTrigger>
            <TabsTrigger value="system">System Access</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Basic personal details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="national_id">National ID</Label>
                  <Input
                    id="national_id"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passport_no">Passport Number</Label>
                  <Input
                    id="passport_no"
                    value={formData.passport_no}
                    onChange={(e) => setFormData({ ...formData, passport_no: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="physical_address">Physical Address</Label>
                  <Textarea
                    id="physical_address"
                    value={formData.physical_address}
                    onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>Work-related information</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Employment Term</Label>
                  <Select value={formData.employment_term_id} onValueChange={(v) => setFormData({ ...formData, employment_term_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTerms?.map((term: any) => (
                        <SelectItem key={term.id} value={term.id}>{term.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Employee Category</Label>
                  <Select value={formData.employee_category_id} onValueChange={(v) => setFormData({ ...formData, employee_category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Casual Category</Label>
                  <Select value={formData.casual_category_id} onValueChange={(v) => setFormData({ ...formData, casual_category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select if applicable" />
                    </SelectTrigger>
                    <SelectContent>
                      {casualCategories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept: any) => (
                        <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Select value={formData.designation_id} onValueChange={(v) => setFormData({ ...formData, designation_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations?.map((des: any) => (
                        <SelectItem key={des.id} value={des.id}>{des.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rank</Label>
                  <Select value={formData.rank_id} onValueChange={(v) => setFormData({ ...formData, rank_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
                      {ranks?.map((rank: any) => (
                        <SelectItem key={rank.id} value={rank.id}>{rank.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_hire">Date of Hire</Label>
                  <Input
                    id="date_of_hire"
                    type="date"
                    value={formData.date_of_hire}
                    onChange={(e) => setFormData({ ...formData, date_of_hire: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmation_date">Confirmation Date</Label>
                  <Input
                    id="confirmation_date"
                    type="date"
                    value={formData.confirmation_date}
                    onChange={(e) => setFormData({ ...formData, confirmation_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as EmploymentStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="probation">On Probation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supervisor</Label>
                  <Select value={formData.supervisor_id} onValueChange={(v) => setFormData({ ...formData, supervisor_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.filter((e: any) => e.id !== id).map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} ({emp.employee_no})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Leave Group</Label>
                  <Select value={formData.leave_group_id} onValueChange={(v) => setFormData({ ...formData, leave_group_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveGroups?.map((group: any) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Work Week</Label>
                  <Select value={formData.work_week_id} onValueChange={(v) => setFormData({ ...formData, work_week_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work week" />
                    </SelectTrigger>
                    <SelectContent>
                      {workWeeks?.map((ww: any) => (
                        <SelectItem key={ww.id} value={ww.id}>{ww.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Access</CardTitle>
                <CardDescription>Login and access permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="login_enabled"
                    checked={formData.login_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, login_enabled: checked })}
                  />
                  <Label htmlFor="login_enabled">Enable System Login</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  When enabled, the employee can log in to the system using their email.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/lms/hr/employees')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}