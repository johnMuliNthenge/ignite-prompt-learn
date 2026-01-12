import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GripVertical, ClipboardList, Save } from 'lucide-react';

interface Exam {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  is_published: boolean;
  shuffle_questions: boolean;
  show_results: boolean;
  prevent_tab_switch: boolean;
}

interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
  sort_order: number;
}

interface ExamEditorProps {
  courseId: string;
  examId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ExamEditor({ courseId, examId, onClose, onSaved }: ExamEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(!!examId);
  const [saving, setSaving] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [examForm, setExamForm] = useState({
    title: 'Course Exam',
    description: '',
    instructions: '',
    passing_score: 70,
    time_limit_minutes: '',
    max_attempts: '1',
    shuffle_questions: false,
    show_results: true,
    prevent_tab_switch: true,
    is_published: false,
  });

  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice' as 'multiple_choice' | 'true_false' | 'short_answer',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
  });

  useEffect(() => {
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const fetchExam = async () => {
    try {
      const { data: examData } = await supabase
        .from('course_exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examData) {
        setExam(examData);
        setExamForm({
          title: examData.title,
          description: examData.description || '',
          instructions: examData.instructions || '',
          passing_score: examData.passing_score,
          time_limit_minutes: examData.time_limit_minutes?.toString() || '',
          max_attempts: examData.max_attempts?.toString() || '1',
          shuffle_questions: examData.shuffle_questions,
          show_results: examData.show_results,
          prevent_tab_switch: examData.prevent_tab_switch,
          is_published: examData.is_published,
        });

        const { data: questionsData } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', examData.id)
          .order('sort_order');

        setQuestions((questionsData || []).map(q => ({
          ...q,
          options: q.options as string[] | null,
          question_type: q.question_type as 'multiple_choice' | 'true_false' | 'short_answer'
        })));
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveExam = async () => {
    if (!examForm.title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      const examData = {
        title: examForm.title,
        description: examForm.description || null,
        instructions: examForm.instructions || null,
        passing_score: examForm.passing_score,
        time_limit_minutes: examForm.time_limit_minutes ? parseInt(examForm.time_limit_minutes) : null,
        max_attempts: parseInt(examForm.max_attempts) || 1,
        shuffle_questions: examForm.shuffle_questions,
        show_results: examForm.show_results,
        prevent_tab_switch: examForm.prevent_tab_switch,
        is_published: examForm.is_published,
      };

      if (exam) {
        const { error } = await supabase
          .from('course_exams')
          .update(examData)
          .eq('id', exam.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('course_exams')
          .insert({ ...examData, course_id: courseId })
          .select()
          .single();

        if (error) throw error;
        setExam(data);
      }

      toast({ title: 'Exam saved!' });
      onSaved();
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({ title: 'Error saving exam', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer,
        points: question.points,
      });
    } else {
      setEditingQuestion(null);
      setQuestionForm({
        question_text: '',
        question_type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 1,
      });
    }
    setShowQuestionDialog(true);
  };

  const saveQuestion = async () => {
    if (!exam) {
      toast({ title: 'Save the exam first', variant: 'destructive' });
      return;
    }
    if (!questionForm.question_text.trim()) {
      toast({ title: 'Question text is required', variant: 'destructive' });
      return;
    }
    if (!questionForm.correct_answer.trim()) {
      toast({ title: 'Correct answer is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const filteredOptions = questionForm.question_type === 'multiple_choice'
        ? questionForm.options.filter(o => o.trim())
        : questionForm.question_type === 'true_false'
        ? ['True', 'False']
        : null;

      if (editingQuestion) {
        const { error } = await supabase
          .from('exam_questions')
          .update({
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            options: filteredOptions,
            correct_answer: questionForm.correct_answer,
            points: questionForm.points,
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('exam_questions').insert({
          exam_id: exam.id,
          question_text: questionForm.question_text,
          question_type: questionForm.question_type,
          options: filteredOptions,
          correct_answer: questionForm.correct_answer,
          points: questionForm.points,
          sort_order: questions.length,
        });

        if (error) throw error;
      }

      toast({ title: editingQuestion ? 'Question updated' : 'Question added' });
      setShowQuestionDialog(false);
      fetchExam();
    } catch (error) {
      console.error('Error saving question:', error);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question?')) return;

    try {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast({ title: 'Question deleted' });
      fetchExam();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const deleteExam = async () => {
    if (!exam) return;
    if (!confirm('Delete this exam and all its questions?')) return;

    try {
      const { error } = await supabase
        .from('course_exams')
        .delete()
        .eq('id', exam.id);

      if (error) throw error;
      toast({ title: 'Exam deleted' });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Exam Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Exam Title *</Label>
              <Input
                value={examForm.title}
                onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                placeholder="Final Exam"
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={examForm.passing_score}
                onChange={(e) => setExamForm({ ...examForm, passing_score: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={examForm.description}
              onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
              placeholder="Brief description of this exam..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Instructions for Students</Label>
            <Textarea
              value={examForm.instructions}
              onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
              placeholder="Read each question carefully. You cannot switch tabs during the exam..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Time Limit (minutes)</Label>
              <Input
                type="number"
                min="1"
                value={examForm.time_limit_minutes}
                onChange={(e) => setExamForm({ ...examForm, time_limit_minutes: e.target.value })}
                placeholder="No limit"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Attempts</Label>
              <Input
                type="number"
                min="1"
                value={examForm.max_attempts}
                onChange={(e) => setExamForm({ ...examForm, max_attempts: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Prevent Tab Switching</Label>
                <p className="text-xs text-muted-foreground">Lock student to exam tab during attempt</p>
              </div>
              <Switch
                checked={examForm.prevent_tab_switch}
                onCheckedChange={(checked) => setExamForm({ ...examForm, prevent_tab_switch: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Shuffle Questions</Label>
                <p className="text-xs text-muted-foreground">Randomize question order for each student</p>
              </div>
              <Switch
                checked={examForm.shuffle_questions}
                onCheckedChange={(checked) => setExamForm({ ...examForm, shuffle_questions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Results</Label>
                <p className="text-xs text-muted-foreground">Show score after submission</p>
              </div>
              <Switch
                checked={examForm.show_results}
                onCheckedChange={(checked) => setExamForm({ ...examForm, show_results: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Published</Label>
                <p className="text-xs text-muted-foreground">Make visible to enrolled students</p>
              </div>
              <Switch
                checked={examForm.is_published}
                onCheckedChange={(checked) => setExamForm({ ...examForm, is_published: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={saveExam} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {exam ? 'Update Exam' : 'Create Exam'}
            </Button>
            {exam && (
              <Button variant="destructive" onClick={deleteExam}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Exam
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {exam && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Questions ({questions.length})</CardTitle>
            <Button onClick={() => openQuestionDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No questions yet. Add your first question.
              </p>
            ) : (
              <div className="space-y-2">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="flex items-start gap-3 rounded-lg border p-4"
                  >
                    <GripVertical className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {index + 1}. {question.question_text}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {question.question_type.replace('_', ' ')} • {question.points} point(s)
                      </p>
                      {question.options && (
                        <div className="mt-2 space-y-1">
                          {question.options.map((opt, i) => (
                            <p
                              key={i}
                              className={`text-sm ${opt === question.correct_answer ? 'font-medium text-green-600' : 'text-muted-foreground'}`}
                            >
                              {String.fromCharCode(65 + i)}. {opt} {opt === question.correct_answer && '✓'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openQuestionDialog(question)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuestion(question.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
            <DialogDescription>
              Create a question for this exam
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value: 'multiple_choice' | 'true_false' | 'short_answer') =>
                  setQuestionForm({ ...questionForm, question_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="short_answer">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>

            {questionForm.question_type === 'multiple_choice' && (
              <div className="space-y-2">
                <Label>Options</Label>
                {questionForm.options.map((opt, i) => (
                  <Input
                    key={i}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[i] = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Correct Answer *
                {questionForm.question_type === 'true_false' && ' (True or False)'}
              </Label>
              {questionForm.question_type === 'true_false' ? (
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="True">True</SelectItem>
                    <SelectItem value="False">False</SelectItem>
                  </SelectContent>
                </Select>
              ) : questionForm.question_type === 'multiple_choice' ? (
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct option" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionForm.options.filter(o => o.trim()).map((opt, i) => (
                      <SelectItem key={i} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={questionForm.correct_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                  placeholder="Expected answer"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Points</Label>
              <Input
                type="number"
                min="1"
                value={questionForm.points}
                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveQuestion} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingQuestion ? 'Save Changes' : 'Add Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
