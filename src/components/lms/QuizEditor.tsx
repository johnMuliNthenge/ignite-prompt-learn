import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GripVertical, HelpCircle } from 'lucide-react';

interface Quiz {
  id: string;
  resource_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_required: boolean;
}

interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
  sort_order: number;
}

interface QuizEditorProps {
  resourceId: string;
  onClose: () => void;
}

export default function QuizEditor({ resourceId, onClose }: QuizEditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const [quizForm, setQuizForm] = useState({
    title: 'Lesson Quiz',
    description: '',
    passing_score: 70,
    time_limit_minutes: '',
    max_attempts: '',
    is_required: true,
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
    fetchQuiz();
  }, [resourceId]);

  const fetchQuiz = async () => {
    try {
      const { data: quizData } = await supabase
        .from('lesson_quizzes')
        .select('*')
        .eq('resource_id', resourceId)
        .single();

      if (quizData) {
        setQuiz(quizData);
        setQuizForm({
          title: quizData.title,
          description: quizData.description || '',
          passing_score: quizData.passing_score,
          time_limit_minutes: quizData.time_limit_minutes?.toString() || '',
          max_attempts: quizData.max_attempts?.toString() || '',
          is_required: quizData.is_required,
        });

        const { data: questionsData } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizData.id)
          .order('sort_order');

        setQuestions((questionsData || []).map(q => ({
          ...q,
          options: q.options as string[] | null,
          question_type: q.question_type as 'multiple_choice' | 'true_false' | 'short_answer'
        })));
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveQuiz = async () => {
    setSaving(true);
    try {
      if (quiz) {
        const { error } = await supabase
          .from('lesson_quizzes')
          .update({
            title: quizForm.title,
            description: quizForm.description || null,
            passing_score: quizForm.passing_score,
            time_limit_minutes: quizForm.time_limit_minutes ? parseInt(quizForm.time_limit_minutes) : null,
            max_attempts: quizForm.max_attempts ? parseInt(quizForm.max_attempts) : null,
            is_required: quizForm.is_required,
          })
          .eq('id', quiz.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('lesson_quizzes')
          .insert({
            resource_id: resourceId,
            title: quizForm.title,
            description: quizForm.description || null,
            passing_score: quizForm.passing_score,
            time_limit_minutes: quizForm.time_limit_minutes ? parseInt(quizForm.time_limit_minutes) : null,
            max_attempts: quizForm.max_attempts ? parseInt(quizForm.max_attempts) : null,
            is_required: quizForm.is_required,
          })
          .select()
          .single();

        if (error) throw error;
        setQuiz(data);
      }

      toast({ title: 'Quiz saved!' });
    } catch (error) {
      console.error('Error saving quiz:', error);
      toast({ title: 'Error saving quiz', variant: 'destructive' });
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
    if (!quiz) return;
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
          .from('quiz_questions')
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
        const { error } = await supabase.from('quiz_questions').insert({
          quiz_id: quiz.id,
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
      fetchQuiz();
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
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast({ title: 'Question deleted' });
      fetchQuiz();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const deleteQuiz = async () => {
    if (!quiz) return;
    if (!confirm('Delete this quiz and all its questions?')) return;

    try {
      const { error } = await supabase
        .from('lesson_quizzes')
        .delete()
        .eq('id', quiz.id);

      if (error) throw error;
      toast({ title: 'Quiz deleted' });
      onClose();
    } catch (error) {
      console.error('Error deleting quiz:', error);
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
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quiz Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quiz Title</Label>
              <Input
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                placeholder="Lesson Quiz"
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={quizForm.passing_score}
                onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={quizForm.description}
              onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
              placeholder="Instructions for students..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Time Limit (minutes, optional)</Label>
              <Input
                type="number"
                min="1"
                value={quizForm.time_limit_minutes}
                onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: e.target.value })}
                placeholder="No limit"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Attempts (optional)</Label>
              <Input
                type="number"
                min="1"
                value={quizForm.max_attempts}
                onChange={(e) => setQuizForm({ ...quizForm, max_attempts: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={quizForm.is_required}
              onCheckedChange={(checked) => setQuizForm({ ...quizForm, is_required: checked })}
            />
            <Label>Required for lesson completion</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveQuiz} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {quiz ? 'Update Quiz' : 'Create Quiz'}
            </Button>
            {quiz && (
              <Button variant="destructive" onClick={deleteQuiz}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Quiz
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      {quiz && (
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
              Create a question for this quiz
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
              <Label>Question Text</Label>
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
              <Label>Correct Answer</Label>
              {questionForm.question_type === 'true_false' ? (
                <Select
                  value={questionForm.correct_answer}
                  onValueChange={(value) => setQuestionForm({ ...questionForm, correct_answer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
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
                    <SelectValue placeholder="Select correct answer" />
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
                  placeholder="Enter the correct answer"
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
