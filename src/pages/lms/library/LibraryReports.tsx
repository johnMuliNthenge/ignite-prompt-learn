import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, AlertTriangle, TrendingUp } from 'lucide-react';

export default function LibraryReports() {
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [bookRes, issRes, fineRes, memRes] = await Promise.all([
      supabase.from('library_books').select('*'),
      supabase.from('library_issues').select('*, library_books(title, book_code)').order('created_at', { ascending: false }).limit(200),
      supabase.from('library_fines').select('*'),
      supabase.from('library_members').select('*'),
    ]);
    setBooks((bookRes.data as any[]) || []);
    setIssues((issRes.data as any[]) || []);
    setFines((fineRes.data as any[]) || []);
    setMembers((memRes.data as any[]) || []);
    setLoading(false);
  };

  const totalBooks = books.reduce((s, b) => s + b.total_copies, 0);
  const totalAvailable = books.reduce((s, b) => s + b.available_copies, 0);
  const activeIssues = issues.filter(i => i.status === 'issued');
  const overdueIssues = activeIssues.filter(i => new Date(i.due_date) < new Date());

  // Most borrowed books
  const borrowCounts: Record<string, {title: string; count: number}> = {};
  issues.forEach(i => {
    const key = i.book_id;
    if (!borrowCounts[key]) borrowCounts[key] = { title: i.library_books?.title || 'Unknown', count: 0 };
    borrowCounts[key].count++;
  });
  const mostBorrowed = Object.values(borrowCounts).sort((a, b) => b.count - a.count).slice(0, 10);

  return (
    <ProtectedPage moduleCode="library.reports" title="Library Reports">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Library Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><BookOpen className="h-4 w-4" />Total Books</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalBooks}</p><p className="text-xs text-muted-foreground">{totalAvailable} available</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-4 w-4" />Members</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{members.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Issues</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{activeIssues.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-destructive" />Overdue</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{overdueIssues.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="borrowed">
          <TabsList>
            <TabsTrigger value="borrowed">Most Borrowed</TabsTrigger>
            <TabsTrigger value="overdue">Overdue Books</TabsTrigger>
            <TabsTrigger value="trends">Borrow Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="borrowed">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Book Title</TableHead><TableHead>Times Borrowed</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mostBorrowed.map((b, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell><Badge>{b.count}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="overdue">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>Due Date</TableHead><TableHead>Days Overdue</TableHead></TableRow></TableHeader>
                <TableBody>
                  {overdueIssues.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">No overdue books 🎉</TableCell></TableRow> :
                  overdueIssues.map(i => {
                    const daysOverdue = Math.ceil((Date.now() - new Date(i.due_date).getTime()) / (1000*60*60*24));
                    return (
                      <TableRow key={i.id}>
                        <TableCell>{i.library_books?.title}</TableCell>
                        <TableCell>{new Date(i.due_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="destructive">{daysOverdue} days</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card><CardContent className="pt-6">
              <p className="text-muted-foreground text-center">Monthly borrow trends based on {issues.length} total transactions.</p>
              <div className="mt-4 space-y-2">
                {(() => {
                  const monthly: Record<string, number> = {};
                  issues.forEach(i => {
                    const month = new Date(i.issue_date).toLocaleDateString('en', { year: 'numeric', month: 'short' });
                    monthly[month] = (monthly[month] || 0) + 1;
                  });
                  return Object.entries(monthly).slice(0, 12).map(([month, count]) => (
                    <div key={month} className="flex items-center gap-4">
                      <span className="w-24 text-sm">{month}</span>
                      <div className="flex-1 bg-muted rounded-full h-4">
                        <div className="bg-primary rounded-full h-4" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(monthly))) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8">{count}</span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedPage>
  );
}
