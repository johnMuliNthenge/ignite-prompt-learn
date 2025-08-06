import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

const CheckoutPage = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<CoursePackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchPackageAndUser = async () => {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);

      // Fetch package details
      const { data, error } = await supabase
        .from("course_packages")
        .select("*")
        .eq("id", packageId)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({
          title: "Package not found",
          description: "The selected course package is not available.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setPackageData(data);
      setLoading(false);
    };

    fetchPackageAndUser();
  }, [packageId, navigate, toast]);

  const handlePayment = async () => {
    if (!packageData || !user) return;

    setProcessing(true);
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { packageId: packageData.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment",
          description: "Complete your payment in the new tab that opened.",
        });
      } else {
        throw new Error("No checkout URL received");
      }

    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment failed",
        description: "There was an error creating the payment session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Package Not Found</h1>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gradient">PromptMaster</div>
          <Button onClick={() => navigate("/")} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      {/* Checkout Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Complete Your Purchase</h1>
          
          <Card className={`shadow-card ${packageData.name === "Premium" ? "border-primary bg-primary/5" : ""}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{packageData.name}</CardTitle>
                  <CardDescription className="mt-2">{packageData.description}</CardDescription>
                </div>
                {packageData.name === "Premium" && (
                  <Badge className="course-gradient text-primary-foreground">Most Popular</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">${packageData.price}</span>
                <span className="text-muted-foreground">/course</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">What's included:</h3>
                  <ul className="space-y-2">
                    {packageData.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold">${packageData.price}</span>
                  </div>
                  
                  <Button 
                    onClick={handlePayment}
                    disabled={processing}
                    className={`w-full ${packageData.name === "Premium" ? "course-gradient" : ""}`}
                    size="lg"
                  >
                    <CreditCard className="mr-2 h-5 w-5" />
                    {processing ? "Processing..." : "Complete Payment"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Secure payment processing powered by Stripe. Supports VISA, Mastercard, PayPal and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;