import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  name: string;
}

interface ExamResult {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
  is_absent: boolean;
  exam: {
    id: string;
    name: string;
    subject: string | null;
    total_marks: number | null;
    passing_marks: number | null;
    exam_date: string | null;
  } | null;
}

interface StudentInfo {
  id: string;
  student_no: string;
  other_name: string;
  surname: string;
}

export default function ResultSlip() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchInitialData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedSession && student) {
      fetchResults();
    }
  }, [selectedSession, student]);

  const fetchInitialData = async () => {
    try {
      // Get student by user_id (matches RLS policy)
      const { data: studentData } = await supabase
        .from('students')
        .select('id, student_no, other_name, surname')
        .eq('user_id', user?.id)
        .single();

      if (studentData) {
        setStudent(studentData);
      }

      // Get sessions
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, name')
        .order('start_date', { ascending: false });

      setSessions(sessionData || []);
      
      if (sessionData && sessionData.length > 0) {
        setSelectedSession(sessionData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!student || !selectedSession) return;
    
    setLoadingResults(true);
    try {
      const { data: resultData } = await supabase
        .from('academic_marks')
        .select(`
          id,
          marks_obtained,
          grade,
          remarks,
          is_absent,
          exam:exam_id (
            id,
            name,
            subject,
            total_marks,
            passing_marks,
            exam_date
          )
        `)
        .eq('student_id', student.id);

      // Filter by session (exams in this session)
      const filteredResults = resultData?.filter((r) => {
        // You might want to join with academic_exams to check session_id
        return r.exam !== null;
      }) || [];

      setResults(filteredResults);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoadingResults(false);
    }
  };

  const handlePrint = () => {
    const sessionName = sessions.find(s => s.id === selectedSession)?.name || 'Unknown Session';
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const totalMarks = results.reduce((sum, r) => sum + (r.exam?.total_marks || 0), 0);
    const obtainedMarks = results.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
    const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>Result Slip - ${student?.student_no}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { font-size: 16px; color: #666; margin-top: 10px; }
            .student-info { margin: 20px 0; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f4f4f4; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .summary { margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .pass { color: #16a34a; }
            .fail { color: #dc2626; }
            .absent { color: #9ca3af; }
            @media print { body { print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ACADEMIC RESULT SLIP</div>
            <div class="subtitle">${sessionName}</div>
          </div>
          
          <div class="student-info">
            <div>
              <strong>Student Name:</strong> ${student?.other_name} ${student?.surname}<br/>
              <strong>Student No:</strong> ${student?.student_no}
            </div>
            <div>
              <strong>Date:</strong> ${format(new Date(), 'dd MMMM yyyy')}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Exam</th>
                <th class="text-center">Total Marks</th>
                <th class="text-center">Obtained</th>
                <th class="text-center">Grade</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${results.map((r) => `
                <tr>
                  <td>${r.exam?.subject || '-'}</td>
                  <td>${r.exam?.name || '-'}</td>
                  <td class="text-center">${r.exam?.total_marks || '-'}</td>
                  <td class="text-center ${r.is_absent ? 'absent' : (r.marks_obtained || 0) >= (r.exam?.passing_marks || 0) ? 'pass' : 'fail'}">
                    ${r.is_absent ? 'Absent' : r.marks_obtained || '-'}
                  </td>
                  <td class="text-center">${r.grade || '-'}</td>
                  <td>${r.remarks || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <div class="summary-row">
              <span>Total Marks:</span>
              <strong>${obtainedMarks} / ${totalMarks}</strong>
            </div>
            <div class="summary-row">
              <span>Percentage:</span>
              <strong>${percentage}%</strong>
            </div>
          </div>
          
          <p style="text-align: center; margin-top: 40px; color: #666; font-size: 12px;">
            This is a computer-generated result slip.
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getGradeBadge = (result: ExamResult) => {
    if (result.is_absent) {
      return <Badge variant="secondary">Absent</Badge>;
    }
    
    const passed = (result.marks_obtained || 0) >= (result.exam?.passing_marks || 0);
    return (
      <Badge className={passed ? 'bg-green-500' : 'bg-red-500'}>
        {result.grade || (passed ? 'Pass' : 'Fail')}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalMarks = results.reduce((sum, r) => sum + (r.exam?.total_marks || 0), 0);
  const obtainedMarks = results.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Result Slip</h1>
          <p className="text-muted-foreground">View and print your academic results</p>
        </div>
        <Button onClick={handlePrint} disabled={results.length === 0}>
          <Printer className="mr-2 h-4 w-4" />
          Print Result Slip
        </Button>
      </div>

      {/* Session Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Session/Series</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Examination Results</CardTitle>
              <CardDescription>
                {student ? `${student.other_name} ${student.surname} - ${student.student_no}` : ''}
              </CardDescription>
            </div>
            {results.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className="text-xl font-bold">
                  {obtainedMarks} / {totalMarks}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(1) : 0}%)
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingResults ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No results found for the selected session
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead className="text-center">Total Marks</TableHead>
                  <TableHead className="text-center">Obtained</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.exam?.subject || '-'}</TableCell>
                    <TableCell>{result.exam?.name || '-'}</TableCell>
                    <TableCell className="text-center">{result.exam?.total_marks || '-'}</TableCell>
                    <TableCell className="text-center">
                      {result.is_absent ? (
                        <span className="text-muted-foreground">Absent</span>
                      ) : (
                        result.marks_obtained || '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">{getGradeBadge(result)}</TableCell>
                    <TableCell className="text-muted-foreground">{result.remarks || '-'}</TableCell>
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
