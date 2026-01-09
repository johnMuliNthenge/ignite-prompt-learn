import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, Clock, Trophy, ArrowRight, RotateCcw } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_required: boolean;
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
  score: number;
  passed: boolean;
  completed_at: string;
}

interface QuizTakerProps {
  resourceId: string;
  onComplete: (passed: boolean) => void;
  onClose: () => void;
}

export default function QuizTaker({ resourceId, onComplete, onClose }: QuizTakerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; total: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [resourceId]);

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

  const fetchQuiz = async () => {
    try {
      const { data: quizData } = await supabase
        .from('lesson_quizzes')
        .select('*')
        .eq('resource_id', resourceId)
        .single();

      if (quizData) {
        setQuiz(quizData);

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

        if (user) {
          const { data: attemptsData } = await supabase
            .from('quiz_attempts')
            .select('id, score, passed, completed_at')
            .eq('quiz_id', quizData.id)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          setAttempts(attemptsData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setStarted(true);
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    if (quiz?.time_limit_minutes) {
      setTimeLeft(quiz.time_limit_minutes * 60);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (!quiz || !user) return;

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
      const passed = scorePercent >= quiz.passing_score;

      // Save attempt
      const { error } = await supabase.from('quiz_attempts').insert({
        quiz_id: quiz.id,
        user_id: user.id,
        answers: answers,
        score: scorePercent,
        passed,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setResult({ score: scorePercent, passed, total: totalPoints });
      setStarted(false);
      
      if (passed) {
        onComplete(true);
      }

      toast({
        title: passed ? 'Quiz Passed! 🎉' : 'Quiz Not Passed',
        description: `You scored ${scorePercent}%`,
        variant: passed ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({ title: 'Error submitting quiz', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canRetake = !quiz?.max_attempts || attempts.length < quiz.max_attempts;
  const hasPassed = attempts.some(a => a.passed);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No quiz available for this lesson.</p>
          <Button variant="outline" className="mt-4" onClick={onClose}>
            Back to Lesson
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
              <p className="mt-2 text-muted-foreground">You passed the quiz!</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <h2 className="mt-4 text-2xl font-bold text-destructive">Not Passed</h2>
              <p className="mt-2 text-muted-foreground">
                You need {quiz.passing_score}% to pass
              </p>
            </>
          )}
          <div className="mt-6">
            <p className="text-4xl font-bold">{result.score}%</p>
            <p className="text-sm text-muted-foreground">Your Score</p>
          </div>
          <div className="mt-8 flex justify-center gap-4">
            {!result.passed && canRetake && (
              <Button onClick={startQuiz}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Back to Lesson
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quiz in progress
  if (started) {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Question {currentQuestion + 1} of {questions.length}
            </CardTitle>
            {timeLeft !== null && (
              <Badge variant={timeLeft < 60 ? 'destructive' : 'secondary'}>
                <Clock className="mr-1 h-3 w-3" />
                {formatTime(timeLeft)}
              </Badge>
            )}
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
                Submit Quiz
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quiz start screen
  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        {quiz.description && <CardDescription>{quiz.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Questions:</span>
            <span className="font-medium">{questions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Passing Score:</span>
            <span className="font-medium">{quiz.passing_score}%</span>
          </div>
          {quiz.time_limit_minutes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Limit:</span>
              <span className="font-medium">{quiz.time_limit_minutes} minutes</span>
            </div>
          )}
          {quiz.max_attempts && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attempts:</span>
              <span className="font-medium">
                {attempts.length} / {quiz.max_attempts}
              </span>
            </div>
          )}
        </div>

        {hasPassed && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span>You have already passed this quiz!</span>
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
                <span>{new Date(attempt.completed_at).toLocaleDateString()}</span>
                <Badge variant={attempt.passed ? 'default' : 'secondary'}>
                  {attempt.score}%
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {canRetake && (
            <Button onClick={startQuiz} className="flex-1">
              {attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
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
