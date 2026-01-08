import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

export default function CreateCourse() {
  const { user, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    description: '',
    category_id: '',
    is_public: true,
    enrollment_type: 'open',
    enrollment_key: '',
    max_students: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (!isAdmin && !isTeacher) {
      navigate('/lms/dashboard');
      return;
    }
    fetchCategories();
  }, [isAdmin, isTeacher, navigate]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('course_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Course title is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('lms_courses')
        .insert({
          title: formData.title,
          short_description: formData.short_description || null,
          description: formData.description || null,
          category_id: formData.category_id || null,
          created_by: user?.id,
          is_public: formData.is_public,
          enrollment_type: formData.enrollment_type,
          enrollment_key: formData.enrollment_type === 'key' ? formData.enrollment_key : null,
          max_students: formData.max_students ? parseInt(formData.max_students) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Course created successfully' });
      navigate(`/lms/courses/${data.id}/edit`);
    } catch (error) {
      console.error('Error creating course:', error);
      toast({
        title: 'Error',
        description: 'Failed to create course',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="mt-1 text-muted-foreground">
          Set up the basic details for your course
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
                <CardDescription>
                  Basic information about your course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Course Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Introduction to Web Development"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) =>
                      setFormData({ ...formData, short_description: e.target.value })
                    }
                    placeholder="Brief tagline for your course"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detailed course description, learning objectives, prerequisites..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule</CardTitle>
                <CardDescription>
                  Set course start and end dates (optional)
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_public">Public Course</Label>
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_public: checked })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Public courses appear in the catalog
                </p>

                <div className="space-y-2">
                  <Label>Enrollment Type</Label>
                  <Select
                    value={formData.enrollment_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, enrollment_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open (Anyone can enroll)</SelectItem>
                      <SelectItem value="approval">Approval Required</SelectItem>
                      <SelectItem value="key">Enrollment Key</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.enrollment_type === 'key' && (
                  <div className="space-y-2">
                    <Label htmlFor="enrollment_key">Enrollment Key</Label>
                    <Input
                      id="enrollment_key"
                      value={formData.enrollment_key}
                      onChange={(e) =>
                        setFormData({ ...formData, enrollment_key: e.target.value })
                      }
                      placeholder="Secret key for enrollment"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="max_students">Max Students</Label>
                  <Input
                    id="max_students"
                    type="number"
                    value={formData.max_students}
                    onChange={(e) =>
                      setFormData({ ...formData, max_students: e.target.value })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Create Course
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
