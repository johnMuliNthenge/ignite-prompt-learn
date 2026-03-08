import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function MyBorrowedBooks() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user?.id) fetchIssues(); }, [user?.id]);

  const fetchIssues = async () => {
    // Get student → library_member → issues
    const { data: student } = await supabase.from('students').select('id').eq('user_id', user!.id).single();
    if (!student) { setLoading(false); return; }

    const { data: member } = await supabase.from('library_members').select('id').eq('student_id', student.id).single();
    if (!member) { setLoading(false); return; }

    const { data } = await supabase.from('library_issues')
      .select('*, library_books(title, book_code, author)')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false });
    setIssues((data as any[]) || []);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          My Borrowed Books
        </h1>
        <p className="text-muted-foreground">View your current and past borrowings</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : issues.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">No borrowed books</TableCell></TableRow>
              ) : issues.map(issue => {
                const isOverdue = issue.status === 'issued' && new Date(issue.due_date) < new Date();
                const overdueDays = isOverdue ? differenceInDays(new Date(), new Date(issue.due_date)) : 0;
                return (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{issue.library_books?.title}</p>
                        <p className="text-xs text-muted-foreground">{issue.library_books?.book_code} • {issue.library_books?.author}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(issue.issue_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className={isOverdue ? 'text-destructive font-medium' : ''}>
                      {format(new Date(issue.due_date), 'dd/MM/yyyy')}
                      {isOverdue && <span className="block text-xs">({overdueDays} days overdue)</span>}
                    </TableCell>
                    <TableCell>{issue.return_date ? format(new Date(issue.return_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={isOverdue ? 'destructive' : issue.status === 'returned' ? 'secondary' : 'default'}>
                        {isOverdue ? 'OVERDUE' : issue.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
