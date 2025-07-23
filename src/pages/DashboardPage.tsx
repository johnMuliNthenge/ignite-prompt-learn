import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Calendar, Clock, LogOut, User, CheckCircle, Lock } from "lucide-react";

interface Enrollment {
  id: string;
  payment_status: string;
  payment_method: string;
  amount_paid: number;
  access_link_active: boolean;
  access_link_expires_at: string;
  enrolled_at: string;
  course_packages: {
    name: string;
    description: string;
    practicals_schedule: string;
  };
}

interface CourseContent {
  id: string;
  day_number: number;
  title: string;
  description: string;
  content_type: string;
  is_premium_only: boolean;
}

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseContent, setCourseContent] = useState<CourseContent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);

      // Fetch enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .select(`
          *,
          course_packages (
            name,
            description,
            practicals_schedule
          )
        `)
        .eq("user_id", user.id)
        .eq("payment_status", "paid");

      if (enrollmentError) {
        toast({
          title: "Error loading enrollments",
          description: enrollmentError.message,
          variant: "destructive",
        });
      } else {
        setEnrollments(enrollmentData || []);

        // If user has active enrollment, fetch course content
        if (enrollmentData && enrollmentData.length > 0) {
          const activeEnrollment = enrollmentData.find(e => e.access_link_active);
          if (activeEnrollment) {
            const { data: contentData } = await supabase
              .from("course_content")
              .select("*")
              .order("day_number", { ascending: true });

            setCourseContent(contentData || []);
          }
        }
      }

      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getProgressPercentage = () => {
    // Calculate progress based on available content
    const totalDays = 5;
    const currentDay = Math.min(Math.floor((Date.now() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + 1, totalDays);
    return (currentDay / totalDays) * 100;
  };

  const canAccessContent = (content: CourseContent, enrollment: Enrollment) => {
    if (!enrollment.access_link_active) return false;
    
    // For premium-only content, check if user has premium package
    if (content.is_premium_only) {
      return enrollment.course_packages.practicals_schedule === "every_day";
    }
    
    // For standard content
    if (content.content_type === "practical" && enrollment.course_packages.practicals_schedule === "last_2_days") {
      return content.day_number >= 4; // Only days 4 and 5 for standard
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeEnrollment = enrollments.find(e => e.access_link_active);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gradient">PromptMaster</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Learning Dashboard</h1>
              <p className="text-muted-foreground">Track your progress and access course materials</p>
            </div>

            {/* Enrollment Status */}
            {enrollments.length === 0 ? (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    No Active Enrollment
                  </CardTitle>
                  <CardDescription>
                    You haven't enrolled in any courses yet. Start your learning journey today!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate("/")} className="course-gradient">
                    Browse Courses
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Course Progress */}
                {activeEnrollment && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5" />
                        Course Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Overall Progress</span>
                            <span>{Math.round(getProgressPercentage())}%</span>
                          </div>
                          <Progress value={getProgressPercentage()} className="h-2" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Keep going! You're making great progress in your prompt engineering journey.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Course Content */}
                {activeEnrollment && courseContent.length > 0 && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle>Course Content</CardTitle>
                      <CardDescription>
                        Access your daily lessons and practical exercises
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(day => {
                          const dayContent = courseContent.filter(c => c.day_number === day);
                          return (
                            <div key={day} className="border rounded-lg p-4">
                              <h3 className="font-semibold mb-3">Day {day}</h3>
                              <div className="space-y-2">
                                {dayContent.map(content => {
                                  const hasAccess = canAccessContent(content, activeEnrollment);
                                  return (
                                    <div 
                                      key={content.id}
                                      className={`flex items-center justify-between p-3 rounded border ${
                                        hasAccess ? "bg-background" : "bg-muted/50"
                                      }`}
                                    >
                                      <div className="flex items-center space-x-3">
                                        {hasAccess ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Lock className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <div>
                                          <p className={`font-medium ${!hasAccess ? "text-muted-foreground" : ""}`}>
                                            {content.title}
                                          </p>
                                          <p className="text-sm text-muted-foreground">
                                            {content.description}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={content.content_type === "practical" ? "default" : "secondary"}>
                                          {content.content_type}
                                        </Badge>
                                        {content.is_premium_only && (
                                          <Badge variant="outline" className="text-primary border-primary">
                                            Premium
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Name:</strong> {profile?.full_name || "Not set"}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Phone:</strong> {profile?.phone || "Not set"}</p>
              </CardContent>
            </Card>

            {/* Enrollment Info */}
            {enrollments.map(enrollment => (
              <Card key={enrollment.id} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Enrollment</span>
                    <Badge variant={enrollment.access_link_active ? "default" : "secondary"}>
                      {enrollment.access_link_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Package:</strong> {enrollment.course_packages.name}</p>
                  <p><strong>Amount Paid:</strong> ${enrollment.amount_paid}</p>
                  <p><strong>Payment Method:</strong> {enrollment.payment_method}</p>
                  {enrollment.access_link_expires_at && (
                    <p><strong>Expires:</strong> {new Date(enrollment.access_link_expires_at).toLocaleDateString()}</p>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Quick Actions */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse More Courses
                </Button>
                <Button variant="outline" className="w-full">
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Study Time
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;