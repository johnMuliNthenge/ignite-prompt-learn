import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, BookOpen, Users, Award, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface CoursePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  practicals_schedule: string;
  is_active: boolean;
}

const LandingPage = () => {
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPackages = async () => {
      const { data, error } = await supabase
        .from("course_packages")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        toast({
          title: "Error loading packages",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setPackages(data || []);
      }
      setLoading(false);
    };

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchPackages();
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleEnroll = (packageId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/checkout/${packageId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gradient">PromptMaster</div>
          <div className="flex gap-4">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                Dashboard
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/auth")} variant="ghost">
                  Login
                </Button>
                <Button onClick={() => navigate("/auth")} className="course-gradient">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Master <span className="text-gradient">Prompt Engineering</span>
            <br />in 5 Days
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Learn the art and science of crafting perfect AI prompts. Transform your AI interactions 
            with professional techniques used by top companies worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="course-gradient shadow-elegant"
              onClick={() => document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" })}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              Start Learning Today
            </Button>
            <Button size="lg" variant="outline">
              <Users className="mr-2 h-5 w-5" />
              View Curriculum
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Our Course?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-card transition-smooth hover:shadow-elegant">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Comprehensive Curriculum</CardTitle>
                <CardDescription>
                  5 days of intensive learning covering everything from basics to advanced techniques
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="shadow-card transition-smooth hover:shadow-elegant">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Hands-on Practice</CardTitle>
                <CardDescription>
                  Real-world projects and practical exercises to cement your learning
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="shadow-card transition-smooth hover:shadow-elegant">
              <CardHeader>
                <Award className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Industry Recognition</CardTitle>
                <CardDescription>
                  Get certified and recognized by top companies in the AI industry
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Course Packages */}
      <section id="packages" className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Choose Your Learning Path</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Select the package that best fits your learning style and goals
          </p>
          
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {packages.map((pkg) => (
                <Card 
                  key={pkg.id} 
                  className={`shadow-card transition-smooth hover:shadow-elegant ${
                    pkg.name === "Premium" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                        <CardDescription className="mt-2">{pkg.description}</CardDescription>
                      </div>
                      {pkg.name === "Premium" && (
                        <Badge className="course-gradient text-primary-foreground">Most Popular</Badge>
                      )}
                    </div>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">${pkg.price}</span>
                      <span className="text-muted-foreground">/course</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${
                        pkg.name === "Premium" ? "course-gradient" : ""
                      }`}
                      variant={pkg.name === "Premium" ? "default" : "outline"}
                      onClick={() => handleEnroll(pkg.id)}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="text-2xl font-bold text-gradient mb-4">PromptMaster</div>
          <p className="text-muted-foreground mb-6">
            Empowering the next generation of AI prompt engineers
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-smooth">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-smooth">Terms of Service</Link>
            <Link to="/contact" className="hover:text-primary transition-smooth">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;