import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';

const SalaryStructures = () => {
  const [structures, setStructures] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [showComponentDialog, setShowComponentDialog] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<any>(null);
  const [structureForm, setStructureForm] = useState({ name: '', description: '', is_active: true });
  const [componentForm, setComponentForm] = useState({
    name: '', component_type: 'earning', category: 'allowance',
    calculation_type: 'fixed', default_amount: 0, percentage_of: '',
    formula: '', is_taxable: true, is_statutory: false, sort_order: 0,
  });
  const [editingComponent, setEditingComponent] = useState<any>(null);

  useEffect(() => { fetchStructures(); }, []);

  useEffect(() => {
    if (selectedStructure) fetchComponents(selectedStructure.id);
  }, [selectedStructure]);

  const fetchStructures = async () => {
    setLoading(true);
    const { data } = await supabase.from('salary_structures').select('*').order('name');
    setStructures(data || []);
    setLoading(false);
  };

  const fetchComponents = async (structureId: string) => {
    const { data } = await supabase.from('salary_components').select('*').eq('structure_id', structureId).order('sort_order');
    setComponents(data || []);
  };

  const handleSaveStructure = async () => {
    try {
      if (selectedStructure?.id && showStructureDialog) {
        const { error } = await supabase.from('salary_structures').update(structureForm).eq('id', selectedStructure.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('salary_structures').insert(structureForm);
        if (error) throw error;
      }
      toast.success('Salary structure saved');
      setShowStructureDialog(false);
      fetchStructures();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleSaveComponent = async () => {
    try {
      const payload = { ...componentForm, structure_id: selectedStructure.id, default_amount: Number(componentForm.default_amount), sort_order: Number(componentForm.sort_order) };
      if (editingComponent) {
        const { error } = await supabase.from('salary_components').update(payload).eq('id', editingComponent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('salary_components').insert(payload);
        if (error) throw error;
      }
      toast.success('Component saved');
      setShowComponentDialog(false);
      setEditingComponent(null);
      fetchComponents(selectedStructure.id);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteComponent = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    await supabase.from('salary_components').delete().eq('id', id);
    toast.success('Component deleted');
    fetchComponents(selectedStructure.id);
  };

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Delete this structure and all its components?')) return;
    await supabase.from('salary_structures').delete().eq('id', id);
    toast.success('Structure deleted');
    if (selectedStructure?.id === id) { setSelectedStructure(null); setComponents([]); }
    fetchStructures();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Salary Structures</h1>
        </div>
        <Button onClick={() => { setStructureForm({ name: '', description: '', is_active: true }); setShowStructureDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Structure
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Structures</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {loading ? <p>Loading...</p> : structures.length === 0 ? <p className="text-muted-foreground">No structures yet</p> :
              structures.map(s => (
                <div key={s.id} className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${selectedStructure?.id === s.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                  onClick={() => setSelectedStructure(s)}>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setStructureForm({ name: s.name, description: s.description || '', is_active: s.is_active }); setSelectedStructure(s); setShowStructureDialog(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleDeleteStructure(s.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))
            }
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{selectedStructure ? `Components: ${selectedStructure.name}` : 'Select a Structure'}</CardTitle>
            {selectedStructure && (
              <Button size="sm" onClick={() => { setEditingComponent(null); setComponentForm({ name: '', component_type: 'earning', category: 'allowance', calculation_type: 'fixed', default_amount: 0, percentage_of: '', formula: '', is_taxable: true, is_statutory: false, sort_order: components.length }); setShowComponentDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Component
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selectedStructure ? <p className="text-muted-foreground">Select a structure to view components</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Calc</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No components</TableCell></TableRow> :
                    components.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant={c.component_type === 'earning' ? 'default' : 'destructive'}>{c.component_type}</Badge></TableCell>
                        <TableCell>{c.category}</TableCell>
                        <TableCell>{c.calculation_type}</TableCell>
                        <TableCell>{c.calculation_type === 'fixed' ? c.default_amount?.toLocaleString() : c.calculation_type === 'percentage' ? `${c.default_amount}% of ${c.percentage_of}` : 'Formula'}</TableCell>
                        <TableCell>{c.is_taxable ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditingComponent(c); setComponentForm({ name: c.name, component_type: c.component_type, category: c.category, calculation_type: c.calculation_type, default_amount: c.default_amount || 0, percentage_of: c.percentage_of || '', formula: c.formula || '', is_taxable: c.is_taxable, is_statutory: c.is_statutory, sort_order: c.sort_order || 0 }); setShowComponentDialog(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteComponent(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Structure Dialog */}
      <Dialog open={showStructureDialog} onOpenChange={setShowStructureDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selectedStructure?.id && showStructureDialog ? 'Edit' : 'Add'} Salary Structure</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={structureForm.name} onChange={e => setStructureForm({...structureForm, name: e.target.value})} /></div>
            <div><Label>Description</Label><Input value={structureForm.description} onChange={e => setStructureForm({...structureForm, description: e.target.value})} /></div>
            <div className="flex items-center gap-2"><Label>Active</Label><Switch checked={structureForm.is_active} onCheckedChange={v => setStructureForm({...structureForm, is_active: v})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveStructure}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Component Dialog */}
      <Dialog open={showComponentDialog} onOpenChange={v => { setShowComponentDialog(v); if (!v) setEditingComponent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingComponent ? 'Edit' : 'Add'} Component</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div><Label>Name</Label><Input value={componentForm.name} onChange={e => setComponentForm({...componentForm, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={componentForm.component_type} onValueChange={v => setComponentForm({...componentForm, component_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earning</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={componentForm.category} onValueChange={v => setComponentForm({...componentForm, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic_pay">Basic Pay</SelectItem>
                    <SelectItem value="allowance">Allowance</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="benefit">Benefit</SelectItem>
                    <SelectItem value="statutory">Statutory</SelectItem>
                    <SelectItem value="custom_deduction">Custom Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Calculation Type</Label>
              <Select value={componentForm.calculation_type} onValueChange={v => setComponentForm({...componentForm, calculation_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {componentForm.calculation_type === 'fixed' && (
              <div><Label>Default Amount</Label><Input type="number" value={componentForm.default_amount} onChange={e => setComponentForm({...componentForm, default_amount: Number(e.target.value)})} /></div>
            )}
            {componentForm.calculation_type === 'percentage' && (
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Percentage (%)</Label><Input type="number" value={componentForm.default_amount} onChange={e => setComponentForm({...componentForm, default_amount: Number(e.target.value)})} /></div>
                <div><Label>Percentage Of</Label><Input value={componentForm.percentage_of} onChange={e => setComponentForm({...componentForm, percentage_of: e.target.value})} placeholder="e.g. Basic Pay" /></div>
              </div>
            )}
            {componentForm.calculation_type === 'formula' && (
              <div><Label>Formula</Label><Input value={componentForm.formula} onChange={e => setComponentForm({...componentForm, formula: e.target.value})} placeholder="e.g. basic_pay * 0.1 + 500" /></div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Label>Taxable</Label><Switch checked={componentForm.is_taxable} onCheckedChange={v => setComponentForm({...componentForm, is_taxable: v})} /></div>
              <div className="flex items-center gap-2"><Label>Statutory</Label><Switch checked={componentForm.is_statutory} onCheckedChange={v => setComponentForm({...componentForm, is_statutory: v})} /></div>
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={componentForm.sort_order} onChange={e => setComponentForm({...componentForm, sort_order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter><Button onClick={handleSaveComponent}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryStructures;
