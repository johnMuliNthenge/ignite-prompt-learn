import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  GripVertical,
  FileText,
  Video,
  Link as LinkIcon,
  File,
  Eye,
  EyeOff,
  Pencil,
  Music,
  FileType,
  HelpCircle,
  ClipboardList,
  Upload,
} from 'lucide-react';
import QuizEditor from '@/components/lms/QuizEditor';
import ExamEditor from '@/components/lms/ExamEditor';
import OnlineClassManager from '@/components/lms/OnlineClassManager';
import FileUploadInput from '@/components/lms/FileUploadInput';
import { POEAssignmentManager } from '@/components/lms/poe/POEAssignmentManager';
import { POETeacherReview } from '@/components/lms/poe/POETeacherReview';

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  resources: Resource[];
}

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  content_url: string | null;
  content_text: string | null;
  sort_order: number;
  is_visible: boolean;
  has_quiz?: boolean;
}

interface Exam {
  id: string;
  title: string;
  is_published: boolean;
  questions_count?: number;
}

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  status: string;
  created_by: string;
}

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Section dialog
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: '', description: '' });

  // Resource dialog
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'text',
    content_url: '',
    content_text: '',
  });

  // Quiz editor dialog
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizResourceId, setQuizResourceId] = useState<string | null>(null);

  // Exam management
  const [exams, setExams] = useState<Exam[]>([]);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;

      // Check permissions
      if (!isAdmin && courseData.created_by !== user?.id) {
        navigate('/lms/dashboard');
        return;
      }

      setCourse(courseData);

      // Fetch sections with resources
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('course_sections')
        .select('*')
        .eq('course_id', id)
        .order('sort_order');

      if (sectionsError) throw sectionsError;

      // Fetch resources for each section
      const sectionsWithResources: Section[] = await Promise.all(
        (sectionsData || []).map(async (section) => {
          const { data: resources } = await supabase
            .from('course_resources')
            .select('*')
            .eq('section_id', section.id)
            .order('sort_order');

          // Check which resources have quizzes
          const resourcesWithQuiz = await Promise.all(
            (resources || []).map(async (resource) => {
              const { data: quiz } = await supabase
                .from('lesson_quizzes')
                .select('id')
                .eq('resource_id', resource.id)
                .single();

              return { ...resource, has_quiz: !!quiz };
            })
          );

          return { ...section, resources: resourcesWithQuiz };
        })
      );

      setSections(sectionsWithResources);

      // Fetch exams
      const { data: examsData } = await supabase
        .from('course_exams')
        .select('id, title, is_published')
        .eq('course_id', id);
      setExams(examsData || []);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (status: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('lms_courses')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      setCourse((prev) => prev ? { ...prev, status } : null);
      toast({ title: status === 'published' ? 'Course published!' : 'Course unpublished' });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Section handlers
  const openSectionDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({ title: section.title, description: section.description || '' });
    } else {
      setEditingSection(null);
      setSectionForm({ title: '', description: '' });
    }
    setShowSectionDialog(true);
  };

  const saveSection = async () => {
    if (!sectionForm.title.trim()) return;
    setSaving(true);

    try {
      if (editingSection) {
        const { error } = await supabase
          .from('course_sections')
          .update({
            title: sectionForm.title,
            description: sectionForm.description || null,
          })
          .eq('id', editingSection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('course_sections').insert({
          course_id: id,
          title: sectionForm.title,
          description: sectionForm.description || null,
          sort_order: sections.length,
        });

        if (error) throw error;
      }

      toast({ title: editingSection ? 'Section updated' : 'Section added' });
      setShowSectionDialog(false);
      fetchCourse();
    } catch (error) {
      console.error('Error saving section:', error);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its content?')) return;

    try {
      const { error } = await supabase
        .from('course_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;
      toast({ title: 'Section deleted' });
      fetchCourse();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleSectionVisibility = async (section: Section) => {
    try {
      const { error } = await supabase
        .from('course_sections')
        .update({ is_visible: !section.is_visible })
        .eq('id', section.id);

      if (error) throw error;
      fetchCourse();
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  // Resource handlers
  const openResourceDialog = (sectionId: string, resource?: Resource) => {
    setCurrentSectionId(sectionId);
    if (resource) {
      setEditingResource(resource);
      setResourceForm({
        title: resource.title,
        description: resource.description || '',
        resource_type: resource.resource_type,
        content_url: resource.content_url || '',
        content_text: resource.content_text || '',
      });
    } else {
      setEditingResource(null);
      setResourceForm({
        title: '',
        description: '',
        resource_type: 'text',
        content_url: '',
        content_text: '',
      });
    }
    setShowResourceDialog(true);
  };

  const saveResource = async () => {
    if (!resourceForm.title.trim() || !currentSectionId) return;
    setSaving(true);

    try {
      const section = sections.find((s) => s.id === currentSectionId);
      
      if (editingResource) {
        const { error } = await supabase
          .from('course_resources')
          .update({
            title: resourceForm.title,
            description: resourceForm.description || null,
            resource_type: resourceForm.resource_type,
            content_url: resourceForm.content_url || null,
            content_text: resourceForm.content_text || null,
          })
          .eq('id', editingResource.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('course_resources').insert({
          section_id: currentSectionId,
          title: resourceForm.title,
          description: resourceForm.description || null,
          resource_type: resourceForm.resource_type,
          content_url: resourceForm.content_url || null,
          content_text: resourceForm.content_text || null,
          sort_order: section?.resources.length || 0,
        });

        if (error) throw error;
      }

      toast({ title: editingResource ? 'Lesson updated' : 'Lesson added' });
      setShowResourceDialog(false);
      fetchCourse();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resourceId: string) => {
    if (!confirm('Delete this lesson?')) return;

    try {
      const { error } = await supabase
        .from('course_resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      toast({ title: 'Lesson deleted' });
      fetchCourse();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const openQuizEditor = (resourceId: string) => {
    setQuizResourceId(resourceId);
    setShowQuizDialog(true);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'document':
      case 'file':
        return <FileType className="h-4 w-4" />;
      case 'link':
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTotalLessons = () => {
    return sections.reduce((acc, s) => acc + s.resources.length, 0);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Course not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <Badge
              variant={course.status === 'published' ? 'default' : 'secondary'}
            >
              {course.status}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {course.short_description || 'No description'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sections.length} sections • {getTotalLessons()} lessons
          </p>
        </div>
        <div className="flex gap-2">
          {course.status === 'draft' ? (
            <Button onClick={() => handlePublish('published')} disabled={saving}>
              <Eye className="mr-2 h-4 w-4" />
              Publish
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handlePublish('draft')}
              disabled={saving}
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Content, Exams, and Online Classes */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Lessons & Content</TabsTrigger>
          <TabsTrigger value="exams">Exams & Assignments</TabsTrigger>
          <TabsTrigger value="poe">POE</TabsTrigger>
          <TabsTrigger value="online-classes">
            <Video className="mr-2 h-4 w-4" />
            Online Classes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          {/* Sections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  Organize your course into sections and add lessons
                </CardDescription>
              </div>
              <Button onClick={() => openSectionDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No sections yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add sections to organize your course content
                  </p>
                  <Button onClick={() => openSectionDialog()} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Section
                  </Button>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-4">
                  {sections.map((section, index) => (
                    <AccordionItem
                      key={section.id}
                      value={section.id}
                      className="rounded-lg border px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex flex-1 items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            Section {index + 1}: {section.title}
                          </span>
                          {!section.is_visible && (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                          <span className="ml-auto mr-4 text-sm text-muted-foreground">
                            {section.resources.length} lessons
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="mb-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openSectionDialog(section)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSectionVisibility(section)}
                          >
                            {section.is_visible ? (
                              <>
                                <EyeOff className="mr-1 h-3 w-3" />
                                Hide
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-3 w-3" />
                                Show
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                            Delete
                          </Button>
                          <div className="flex-1" />
                          <Button size="sm" onClick={() => openResourceDialog(section.id)}>
                            <Plus className="mr-1 h-3 w-3" />
                            Add Lesson
                          </Button>
                        </div>

                        {section.description && (
                          <p className="mb-4 text-sm text-muted-foreground">
                            {section.description}
                          </p>
                        )}

                        <div className="space-y-2">
                          {section.resources.map((resource, rIndex) => (
                            <div
                              key={resource.id}
                              className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3"
                            >
                              <div className="rounded bg-background p-2">
                                {getResourceIcon(resource.resource_type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {rIndex + 1}. {resource.title}
                                  </p>
                                  {resource.has_quiz && (
                                    <Badge variant="outline" className="text-xs">
                                      <HelpCircle className="mr-1 h-3 w-3" />
                                      Quiz
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs capitalize text-muted-foreground">
                                  {resource.resource_type}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openQuizEditor(resource.id)}
                                title="Manage Quiz"
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openResourceDialog(section.id, resource)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteResource(resource.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}

                          {section.resources.length === 0 && (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                              No lessons in this section yet
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Exams & Assignments</CardTitle>
                <CardDescription>
                  Create and manage exams for this course
                </CardDescription>
              </div>
              <Button onClick={() => { setEditingExamId(null); setShowExamDialog(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Exam
              </Button>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No exams yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create exams to assess student learning
                  </p>
                  <Button onClick={() => { setEditingExamId(null); setShowExamDialog(true); }} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Exam
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-primary/10 p-2">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{exam.title}</p>
                          <Badge variant={exam.is_published ? 'default' : 'secondary'}>
                            {exam.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => { setEditingExamId(exam.id); setShowExamDialog(true); }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="online-classes">
          <Card>
            <CardContent className="pt-6">
              <OnlineClassManager courseId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit Section' : 'Add Section'}
            </DialogTitle>
            <DialogDescription>
              {editingSection
                ? 'Update the section details'
                : 'Create a new section for your course'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={sectionForm.title}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, title: e.target.value })
                }
                placeholder="e.g., Week 1: Introduction"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={sectionForm.description}
                onChange={(e) =>
                  setSectionForm({ ...sectionForm, description: e.target.value })
                }
                placeholder="Brief description of this section"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveSection} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSection ? 'Save Changes' : 'Add Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Edit Lesson' : 'Add Lesson'}
            </DialogTitle>
            <DialogDescription>
              Add learning content to this section (video, audio, documents, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={resourceForm.title}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, title: e.target.value })
                }
                placeholder="e.g., Introduction Video"
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={resourceForm.resource_type}
                onValueChange={(value) =>
                  setResourceForm({ ...resourceForm, resource_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Audio
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileType className="h-4 w-4" />
                      Document (PDF, etc.)
                    </div>
                  </SelectItem>
                  <SelectItem value="text">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text Content
                    </div>
                  </SelectItem>
                  <SelectItem value="embed">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Embed (YouTube, etc.)
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      External Link
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={resourceForm.description}
                onChange={(e) =>
                  setResourceForm({ ...resourceForm, description: e.target.value })
                }
                placeholder="Brief description of what students will learn"
                rows={2}
              />
            </div>

            {['video', 'audio', 'document'].includes(resourceForm.resource_type) && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <FileUploadInput
                    type={resourceForm.resource_type as 'video' | 'audio' | 'document'}
                    value={resourceForm.content_url}
                    onChange={(url) => setResourceForm({ ...resourceForm, content_url: url })}
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or use URL</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content URL</Label>
                  <Input
                    value={resourceForm.content_url}
                    onChange={(e) => setResourceForm({ ...resourceForm, content_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {['link', 'embed'].includes(resourceForm.resource_type) && (
              <div className="space-y-2">
                <Label>
                  {resourceForm.resource_type === 'embed' ? 'Embed URL (YouTube, Vimeo, etc.)' : 'URL'}
                </Label>
                <Input
                  value={resourceForm.content_url}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, content_url: e.target.value })
                  }
                  placeholder={
                    resourceForm.resource_type === 'embed' 
                      ? 'https://www.youtube.com/embed/...'
                      : 'https://...'
                  }
                />
              </div>
            )}

            {resourceForm.resource_type === 'text' && (
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea
                  value={resourceForm.content_text}
                  onChange={(e) =>
                    setResourceForm({ ...resourceForm, content_text: e.target.value })
                  }
                  placeholder="Enter text content..."
                  rows={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResourceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveResource} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingResource ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Editor Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lesson Quiz</DialogTitle>
            <DialogDescription>
              Add a quiz that students must complete for this lesson
            </DialogDescription>
          </DialogHeader>
          {quizResourceId && (
            <QuizEditor
              resourceId={quizResourceId}
              onClose={() => {
                setShowQuizDialog(false);
                fetchCourse();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Exam Editor Dialog */}
      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExamId ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
            <DialogDescription>
              Create an exam/assignment for this course
            </DialogDescription>
          </DialogHeader>
          {id && (
            <ExamEditor
              courseId={id}
              examId={editingExamId || undefined}
              onClose={() => {
                setShowExamDialog(false);
                setEditingExamId(null);
              }}
              onSaved={() => {
                fetchCourse();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
