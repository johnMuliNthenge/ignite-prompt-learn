import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, BookOpen, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function LibrarySearch() {
  const { user } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchBooks();
    fetchMemberId();
  }, []);

  const fetchMemberId = async () => {
    if (!user?.id) return;
    const { data: student } = await supabase.from('students').select('id').eq('user_id', user.id).single();
    if (student) {
      const { data: member } = await supabase.from('library_members').select('id').eq('student_id', student.id).single();
      if (member) setMemberId(member.id);
    }
  };

  const fetchBooks = async () => {
    const { data } = await supabase.from('library_books')
      .select('id, book_code, title, author, isbn, category, publisher, edition, year_published, shelf_location, available_copies, total_copies')
      .eq('is_active', true)
      .order('title');
    setBooks((data as any[]) || []);
    setLoading(false);
  };

  const filtered = books.filter(b =>
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleReserve = async (bookId: string) => {
    if (!memberId) {
      toast.error('You are not registered as a library member. Please contact the librarian.');
      return;
    }
    try {
      const { error } = await supabase.from('library_reservations').insert({
        book_id: bookId,
        member_id: memberId,
        reserved_by: user?.id,
      });
      if (error) throw error;
      toast.success('Book reserved successfully! You will be notified when available.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Library Catalog
        </h1>
        <p className="text-muted-foreground">Search and browse available books</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, author, ISBN, or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Shelf</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">No books found</TableCell></TableRow>
              ) : filtered.map(book => (
                <TableRow key={book.id}>
                  <TableCell className="font-mono text-sm">{book.book_code}</TableCell>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author || '-'}</TableCell>
                  <TableCell>{book.category || '-'}</TableCell>
                  <TableCell>{book.shelf_location || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={book.available_copies > 0 ? 'default' : 'destructive'}>
                      {book.available_copies}/{book.total_copies}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {book.available_copies === 0 && (
                      <Button size="sm" variant="outline" onClick={() => handleReserve(book.id)}>
                        <BookmarkPlus className="h-3 w-3 mr-1" />Reserve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
