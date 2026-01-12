import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, CheckCircle, XCircle, Clock, Trophy, ArrowRight, 
  RotateCcw, AlertTriangle, Lock, Eye, EyeOff 
} from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number;
  shuffle_questions: boolean;
  show_results: boolean;
  prevent_tab_switch: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
}

interface Attempt {
  id: string;
  score: number | null;
  passed: boolean | null;
  completed_at: string | null;
  tab_switches: number;
}

interface ExamTakerProps {
  examId: string;
  onComplete: (passed: boolean) => void;
  onClose: () => void;
}

export default function ExamTaker({ examId, onComplete, onClose }: ExamTakerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  
  const [started, setStarted] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  // Tab switch detection
  const handleVisibilityChange = useCallback(() => {
    if (started && exam?.prevent_tab_switch && document.hidden) {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        setShowWarning(true);
        
        // Update attempt with tab switch count
        if (currentAttemptId) {
          supabase
            .from('exam_attempts')
            .update({ tab_switches: newCount })
            .eq('id', currentAttemptId);
        }

        toast({
          title: '⚠️ Tab Switch Detected!',
          description: `You have switched tabs ${newCount} time(s). This is being recorded.`,
          variant: 'destructive',
        });
        
        return newCount;
      });
    }
  }, [started, exam?.prevent_tab_switch, currentAttemptId, toast]);

  // Setup visibility change listener
  useEffect(() => {
    if (started && exam?.prevent_tab_switch) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Prevent right-click
      const preventContext = (e: MouseEvent) => e.preventDefault();
      document.addEventListener('contextmenu', preventContext);
      
      // Prevent copy/paste
      const preventCopy = (e: ClipboardEvent) => e.preventDefault();
      document.addEventListener('copy', preventCopy);
      document.addEventListener('cut', preventCopy);
      document.addEventListener('paste', preventCopy);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('contextmenu', preventContext);
        document.removeEventListener('copy', preventCopy);
        document.removeEventListener('cut', preventCopy);
        document.removeEventListener('paste', preventCopy);
      };
    }
  }, [started, exam?.prevent_tab_switch, handleVisibilityChange]);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (started && timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [started, timeLeft]);

  const fetchExam = async () => {
    try {
      const { data: examData } = await supabase
        .from('course_exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examData) {
        setExam(examData);

        const { data: questionsData } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', examData.id)
          .order('sort_order');

        let processedQuestions = (questionsData || []).map(q => ({
          ...q,
          options: q.options as string[] | null,
          question_type: q.question_type as 'multiple_choice' | 'true_false' | 'short_answer'
        }));

        // Shuffle if enabled
        if (examData.shuffle_questions) {
          processedQuestions = processedQuestions.sort(() => Math.random() - 0.5);
        }

        setQuestions(processedQuestions);

        if (user) {
          const { data: attemptsData } = await supabase
            .from('exam_attempts')
            .select('id, score, passed, completed_at, tab_switches')
            .eq('exam_id', examData.id)
            .eq('user_id', user.id)
            .not('completed_at', 'is', null)
            .order('created_at', { ascending: false });

          setAttempts(attemptsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async () => {
    if (!user || !exam) return;

    try {
      // Create a new attempt
      const { data: attempt, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: exam.id,
          user_id: user.id,
          answers: {},
          tab_switches: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentAttemptId(attempt.id);
      setStarted(true);
      setCurrentQuestion(0);
      setAnswers({});
      setResult(null);
      setTabSwitchCount(0);
      
      if (exam.time_limit_minutes) {
        setTimeLeft(exam.time_limit_minutes * 60);
      }

      // Request fullscreen if tab switch prevention is enabled
      if (exam.prevent_tab_switch) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (e) {
          console.log('Fullscreen not available');
        }
      }
    } catch (error) {
      console.error('Error starting exam:', error);
      toast({ title: 'Error starting exam', variant: 'destructive' });
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    // Save progress
    if (currentAttemptId) {
      supabase
        .from('exam_attempts')
        .update({ answers: newAnswers })
        .eq('id', currentAttemptId);
    }
  };

  const handleSubmit = async () => {
    if (!exam || !user || !currentAttemptId) return;

    setSubmitting(true);
    try {
      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach((q) => {
        totalPoints += q.points;
        const userAnswer = answers[q.id]?.trim().toLowerCase();
        const correctAnswer = q.correct_answer.trim().toLowerCase();
        if (userAnswer === correctAnswer) {
          earnedPoints += q.points;
        }
      });

      const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = scorePercent >= exam.passing_score;

      // Update attempt
      const { error } = await supabase
        .from('exam_attempts')
        .update({
          answers: answers,
          score: scorePercent,
          passed,
          completed_at: new Date().toISOString(),
          tab_switches: tabSwitchCount,
        })
        .eq('id', currentAttemptId);

      if (error) throw error;

      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }

      setResult({ score: scorePercent, passed, total: totalPoints });
      setStarted(false);
      
      if (passed) {
        onComplete(true);
      }

      toast({
        title: passed ? 'Exam Passed! 🎉' : 'Exam Not Passed',
        description: `You scored ${scorePercent}%${tabSwitchCount > 0 ? ` (${tabSwitchCount} tab switches recorded)` : ''}`,
        variant: passed ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({ title: 'Error submitting exam', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canRetake = attempts.length < (exam?.max_attempts || 1);
  const hasPassed = attempts.some(a => a.passed);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No exam available.</p>
          <Button variant="outline" className="mt-4" onClick={onClose}>
            Back to Course
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show result
  if (result) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {result.passed ? (
            <>
              <Trophy className="mx-auto h-16 w-16 text-yellow-500" />
              <h2 className="mt-4 text-2xl font-bold text-green-600">Congratulations!</h2>
              <p className="mt-2 text-muted-foreground">You passed the exam!</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <h2 className="mt-4 text-2xl font-bold text-destructive">Not Passed</h2>
              <p className="mt-2 text-muted-foreground">
                You need {exam.passing_score}% to pass
              </p>
            </>
          )}
          {exam.show_results && (
            <div className="mt-6">
              <p className="text-4xl font-bold">{result.score}%</p>
              <p className="text-sm text-muted-foreground">Your Score</p>
            </div>
          )}
          {tabSwitchCount > 0 && (
            <div className="mt-4">
              <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {tabSwitchCount} Tab Switch(es) Recorded
              </Badge>
            </div>
          )}
          <div className="mt-8 flex justify-center gap-4">
            {!result.passed && canRetake && (
              <Button onClick={startExam}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Back to Course
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Exam in progress
  if (started) {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="space-y-4">
        {showWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Tab switching is not allowed during this exam. Your activity is being monitored.
              ({tabSwitchCount} switch(es) recorded)
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Question {currentQuestion + 1} of {questions.length}
              </CardTitle>
              <div className="flex items-center gap-2">
                {exam.prevent_tab_switch && (
                  <Badge variant="outline">
                    <Lock className="mr-1 h-3 w-3" />
                    Locked
                  </Badge>
                )}
                {timeLeft !== null && (
                  <Badge variant={timeLeft < 60 ? 'destructive' : 'secondary'}>
                    <Clock className="mr-1 h-3 w-3" />
                    {formatTime(timeLeft)}
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg font-medium">{question.question_text}</p>
              <p className="mt-1 text-sm text-muted-foreground">{question.points} point(s)</p>
            </div>

            {question.question_type === 'multiple_choice' && question.options && (
              <RadioGroup
                value={answers[question.id] || ''}
                onValueChange={(value) => handleAnswer(question.id, value)}
              >
                {question.options.map((option, i) => (
                  <div key={i} className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value={option} id={`option-${i}`} />
                    <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.question_type === 'true_false' && (
              <RadioGroup
                value={answers[question.id] || ''}
                onValueChange={(value) => handleAnswer(question.id, value)}
              >
                {['True', 'False'].map((option) => (
                  <div key={option} className="flex items-center space-x-2 rounded-lg border p-3">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {question.question_type === 'short_answer' && (
              <Input
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                placeholder="Type your answer..."
              />
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              {currentQuestion < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  disabled={!answers[question.id]}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || Object.keys(answers).length !== questions.length}
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Exam
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam start screen
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {exam.title}
          {exam.prevent_tab_switch && (
            <Badge variant="outline">
              <Lock className="mr-1 h-3 w-3" />
              Proctored
            </Badge>
          )}
        </CardTitle>
        {exam.description && <CardDescription>{exam.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {exam.instructions && (
          <Alert>
            <AlertTitle>Instructions</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {exam.instructions}
            </AlertDescription>
          </Alert>
        )}

        {exam.prevent_tab_switch && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              This exam is proctored. You CANNOT switch tabs or applications during the exam.
              Tab switching will be recorded and reported to your instructor.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Questions:</span>
            <span className="font-medium">{questions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Passing Score:</span>
            <span className="font-medium">{exam.passing_score}%</span>
          </div>
          {exam.time_limit_minutes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Limit:</span>
              <span className="font-medium">{exam.time_limit_minutes} minutes</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Attempts:</span>
            <span className="font-medium">
              {attempts.length} / {exam.max_attempts}
            </span>
          </div>
        </div>

        {hasPassed && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span>You have already passed this exam!</span>
          </div>
        )}

        {attempts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Previous Attempts:</p>
            {attempts.slice(0, 3).map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border p-2 text-sm"
              >
                <span>{new Date(attempt.completed_at!).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  {attempt.tab_switches > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {attempt.tab_switches} switches
                    </Badge>
                  )}
                  <Badge variant={attempt.passed ? 'default' : 'secondary'}>
                    {exam.show_results ? `${attempt.score}%` : (attempt.passed ? 'Passed' : 'Failed')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {canRetake && (
            <Button onClick={startExam} className="flex-1">
              {attempts.length > 0 ? 'Retake Exam' : 'Start Exam'}
            </Button>
          )}
          {!canRetake && (
            <p className="text-sm text-muted-foreground">
              Maximum attempts reached
            </p>
          )}
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
