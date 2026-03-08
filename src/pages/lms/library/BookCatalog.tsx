import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage, ActionButton } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function BookCatalog() {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', author: '', isbn: '', category_id: '', publisher: '',
    edition: '', publication_year: '', shelf_location: '', total_copies: 1, description: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [bookRes, catRes] = await Promise.all([
      supabase.from('library_books').select('*, library_categories(name)').order('title'),
      supabase.from('library_categories').select('id, name').eq('is_active', true),
    ]);
    setBooks((bookRes.data as any[]) || []);
    setCategories((catRes.data as any[]) || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    try {
      if (editing) {
        const { error } = await supabase.from('library_books').update({
          title: form.title, author: form.author || null, isbn: form.isbn || null,
          category_id: form.category_id || null, publisher: form.publisher || null,
          edition: form.edition || null, publication_year: form.publication_year ? +form.publication_year : null,
          shelf_location: form.shelf_location || null, total_copies: form.total_copies,
          description: form.description || null,
        }).eq('id', editing.id);
        if (error) throw error;
        toast.success('Book updated');
      } else {
        const { data: code } = await supabase.rpc('generate_book_code');
        const { error } = await supabase.from('library_books').insert({
          book_code: code as string, title: form.title, author: form.author || null,
          isbn: form.isbn || null, category_id: form.category_id || null,
          publisher: form.publisher || null, edition: form.edition || null,
          publication_year: form.publication_year ? +form.publication_year : null,
          shelf_location: form.shelf_location || null, total_copies: form.total_copies,
          available_copies: form.total_copies, description: form.description || null,
        });
        if (error) throw error;
        toast.success('Book added to catalog');
      }
      setDialogOpen(false); resetForm(); fetchAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ title: '', author: '', isbn: '', category_id: '', publisher: '', edition: '', publication_year: '', shelf_location: '', total_copies: 1, description: '' });
  };

  const editBook = (b: any) => {
    setEditing(b);
    setForm({
      title: b.title, author: b.author || '', isbn: b.isbn || '', category_id: b.category_id || '',
      publisher: b.publisher || '', edition: b.edition || '', publication_year: b.publication_year?.toString() || '',
      shelf_location: b.shelf_location || '', total_copies: b.total_copies, description: b.description || '',
    });
    setDialogOpen(true);
  };

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
    b.book_code.toLowerCase().includes(search.toLowerCase()) ||
    (b.isbn || '').includes(search)
  );

  return (
    <ProtectedPage moduleCode="library.catalog" title="Book Catalog">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold">Book Catalog</h1><p className="text-muted-foreground">Manage library book collection</p></div>
          <ActionButton moduleCode="library.catalog" action="add">
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Book</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? 'Edit Book' : 'Add New Book'}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Author</Label><Input value={form.author} onChange={e => setForm({...form, author: e.target.value})} /></div>
                  <div className="space-y-2"><Label>ISBN</Label><Input value={form.isbn} onChange={e => setForm({...form, isbn: e.target.value})} /></div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Publisher</Label><Input value={form.publisher} onChange={e => setForm({...form, publisher: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Edition</Label><Input value={form.edition} onChange={e => setForm({...form, edition: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Publication Year</Label><Input type="number" value={form.publication_year} onChange={e => setForm({...form, publication_year: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Shelf Location</Label><Input value={form.shelf_location} onChange={e => setForm({...form, shelf_location: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Total Copies</Label><Input type="number" min={1} value={form.total_copies} onChange={e => setForm({...form, total_copies: +e.target.value})} /></div>
                  <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={!form.title}>{editing ? 'Update' : 'Add Book'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </ActionButton>
        </div>

        <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input placeholder="Search by title, author, ISBN..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" /></div>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Code</TableHead><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Category</TableHead><TableHead>Shelf</TableHead><TableHead>Available</TableHead><TableHead>Total</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow> :
              filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8">No books found</TableCell></TableRow> :
              filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono">{b.book_code}</TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.author || '-'}</TableCell>
                  <TableCell>{b.library_categories?.name || '-'}</TableCell>
                  <TableCell>{b.shelf_location || '-'}</TableCell>
                  <TableCell><Badge variant={b.available_copies > 0 ? 'default' : 'destructive'}>{b.available_copies}</Badge></TableCell>
                  <TableCell>{b.total_copies}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => editBook(b)}><Edit className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
