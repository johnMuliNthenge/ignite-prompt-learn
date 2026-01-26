import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export default function LeaveApplications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ['hr-leave-applications', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('hr_leave_applications')
        .select(`
          *,
          hr_employees!hr_leave_applications_employee_id_fkey(first_name, last_name, employee_no),
          hr_leave_types(name, is_paid),
          delegated:hr_employees!hr_leave_applications_delegated_to_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: LeaveStatus; remarks: string }) => {
      const { error } = await supabase
        .from('hr_leave_applications')
        .update({
          status,
          hr_remarks: remarks,
          hr_action_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: `Leave ${actionType === 'approve' ? 'approved' : 'rejected'} successfully` });
      queryClient.invalidateQueries({ queryKey: ['hr-leave-applications'] });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleCloseDialog = () => {
    setSelectedLeave(null);
    setActionType(null);
    setRemarks("");
  };

  const handleAction = () => {
    if (!selectedLeave || !actionType) return;
    const newStatus: LeaveStatus = actionType === 'approve' ? 'approved' : 'rejected';
    actionMutation.mutate({
      id: selectedLeave.id,
      status: newStatus,
      remarks,
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leave Applications</h1>
          <p className="text-muted-foreground">Review and manage leave requests</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Applications</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : applications?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No leave applications found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Delegated To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications?.map((app: any) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{app.hr_employees?.first_name} {app.hr_employees?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{app.hr_employees?.employee_no}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{app.hr_leave_types?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.hr_leave_types?.is_paid ? 'Paid' : 'Unpaid'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{app.start_date}</TableCell>
                    <TableCell>{app.end_date}</TableCell>
                    <TableCell>{app.days_requested}</TableCell>
                    <TableCell>
                      {app.delegated?.first_name ? 
                        `${app.delegated.first_name} ${app.delegated.last_name}` : 
                        '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(app.status)} variant="outline">
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-primary"
                            onClick={() => {
                              setSelectedLeave(app);
                              setActionType('approve');
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setSelectedLeave(app);
                              setActionType('reject');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedLeave(app);
                          setActionType(null);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!selectedLeave} onOpenChange={() => handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Leave' : 
               actionType === 'reject' ? 'Reject Leave' : 
               'Leave Details'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee</p>
                  <p className="font-medium">
                    {selectedLeave.hr_employees?.first_name} {selectedLeave.hr_employees?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Leave Type</p>
                  <p className="font-medium">{selectedLeave.hr_leave_types?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {selectedLeave.start_date} to {selectedLeave.end_date}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-medium">{selectedLeave.days_requested}</p>
                </div>
                {selectedLeave.reason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedLeave.reason}</p>
                  </div>
                )}
              </div>

              {actionType && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add your remarks..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {actionType ? 'Cancel' : 'Close'}
            </Button>
            {actionType && (
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={actionMutation.isPending}
              >
                {actionMutation.isPending ? 'Processing...' : 
                 actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
