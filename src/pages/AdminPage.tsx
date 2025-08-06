import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, LogOut, Users, BookOpen, Settings } from "lucide-react";

interface CoursePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  features: string[];
  practicals_schedule: string;
  is_active: boolean;
  student_count?: number;
}

interface CourseContent {
  id: string;
  day_number: number;
  title: string;
  description: string;
  content_type: string;
  content_url: string;
  is_premium_only: boolean;
}

const AdminPage = () => {
  const [user, setUser] = useState(null);
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [courseContent, setCourseContent] = useState<CourseContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPackage, setEditingPackage] = useState<CoursePackage | null>(null);
  const [editingContent, setEditingContent] = useState<CourseContent | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "5",
    features: "",
    practicals_schedule: "last_2_days"
  });
  const [contentForm, setContentForm] = useState({
    day_number: "1",
    title: "",
    description: "",
    content_type: "theory",
    content_url: "",
    is_premium_only: false
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      
      // For demo purposes, allow any authenticated user to access admin
      // In production, you would check for admin role
      setUser(user);
      await fetchData();
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  const fetchData = async () => {
    // Fetch course packages with student counts
    const { data: packagesData } = await supabase
      .from("course_packages")
      .select("*")
      .order("created_at", { ascending: false });

    if (packagesData) {
      // Get student counts for each package
      const packagesWithCounts = await Promise.all(
        packagesData.map(async (pkg) => {
          const { count } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("package_id", pkg.id)
            .eq("payment_status", "paid")
            .eq("access_link_active", true);
          
          return { ...pkg, student_count: count || 0 };
        })
      );
      setPackages(packagesWithCounts);
    }

    // Fetch course content
    const { data: contentData } = await supabase
      .from("course_content")
      .select("*")
      .order("day_number", { ascending: true });

    setCourseContent(contentData || []);
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const packageData = {
      name: packageForm.name,
      description: packageForm.description,
      price: parseFloat(packageForm.price),
      duration_days: parseInt(packageForm.duration_days),
      features: packageForm.features.split(",").map(f => f.trim()),
      practicals_schedule: packageForm.practicals_schedule,
      is_active: true
    };

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from("course_packages")
          .update(packageData)
          .eq("id", editingPackage.id);
        
        if (error) throw error;
        toast({ title: "Package updated successfully!" });
      } else {
        const { error } = await supabase
          .from("course_packages")
          .insert([packageData]);
        
        if (error) throw error;
        toast({ title: "Package created successfully!" });
      }
      
      setPackageForm({
        name: "",
        description: "",
        price: "",
        duration_days: "5",
        features: "",
        practicals_schedule: "last_2_days"
      });
      setEditingPackage(null);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleContentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const contentData = {
      day_number: parseInt(contentForm.day_number),
      title: contentForm.title,
      description: contentForm.description,
      content_type: contentForm.content_type,
      content_url: contentForm.content_url,
      is_premium_only: contentForm.is_premium_only
    };

    try {
      if (editingContent) {
        const { error } = await supabase
          .from("course_content")
          .update(contentData)
          .eq("id", editingContent.id);
        
        if (error) throw error;
        toast({ title: "Content updated successfully!" });
      } else {
        const { error } = await supabase
          .from("course_content")
          .insert([contentData]);
        
        if (error) throw error;
        toast({ title: "Content created successfully!" });
      }
      
      setContentForm({
        day_number: "1",
        title: "",
        description: "",
        content_type: "theory",
        content_url: "",
        is_premium_only: false
      });
      setEditingContent(null);
      await fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    
    const { error } = await supabase
      .from("course_packages")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Package deleted successfully!" });
      await fetchData();
    }
  };

  const deleteContent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) return;
    
    const { error } = await supabase
      .from("course_content")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Content deleted successfully!" });
      await fetchData();
    }
  };

  const editPackage = (pkg: CoursePackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      name: pkg.name,
      description: pkg.description,
      price: pkg.price.toString(),
      duration_days: pkg.duration_days.toString(),
      features: pkg.features.join(", "),
      practicals_schedule: pkg.practicals_schedule
    });
  };

  const editContent = (content: CourseContent) => {
    setEditingContent(content);
    setContentForm({
      day_number: content.day_number.toString(),
      title: content.title,
      description: content.description,
      content_type: content.content_type,
      content_url: content.content_url || "",
      is_premium_only: content.is_premium_only
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gradient">Admin Dashboard</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, Admin
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{packages.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {packages.reduce((sum, pkg) => sum + (pkg.student_count || 0), 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Course Content</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseContent.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Course Packages Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Course Packages</CardTitle>
                  <CardDescription>Manage your course packages and pricing</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Package
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingPackage ? "Edit Package" : "Create New Package"}</DialogTitle>
                      <DialogDescription>
                        {editingPackage ? "Update the package details" : "Add a new course package"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePackageSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Package Name</Label>
                        <Input
                          id="name"
                          value={packageForm.name}
                          onChange={(e) => setPackageForm({...packageForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={packageForm.description}
                          onChange={(e) => setPackageForm({...packageForm, description: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={packageForm.price}
                          onChange={(e) => setPackageForm({...packageForm, price: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (days)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={packageForm.duration_days}
                          onChange={(e) => setPackageForm({...packageForm, duration_days: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="features">Features (comma separated)</Label>
                        <Textarea
                          id="features"
                          value={packageForm.features}
                          onChange={(e) => setPackageForm({...packageForm, features: e.target.value})}
                          placeholder="Feature 1, Feature 2, Feature 3"
                        />
                      </div>
                      <div>
                        <Label htmlFor="schedule">Practicals Schedule</Label>
                        <Select 
                          value={packageForm.practicals_schedule} 
                          onValueChange={(value) => setPackageForm({...packageForm, practicals_schedule: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="last_2_days">Last 2 Days</SelectItem>
                            <SelectItem value="every_day">Every Day (Premium)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingPackage ? "Update Package" : "Create Package"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>${pkg.price}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pkg.student_count} students
                        </Badge>
                      </TableCell>
                      <TableCell>{pkg.duration_days} days</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editPackage(pkg)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePackage(pkg.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Course Content Section */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Course Content</CardTitle>
                  <CardDescription>Manage daily course materials and lessons</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingContent ? "Edit Content" : "Create New Content"}</DialogTitle>
                      <DialogDescription>
                        {editingContent ? "Update the content details" : "Add new course content"}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleContentSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="day">Day Number</Label>
                        <Select 
                          value={contentForm.day_number} 
                          onValueChange={(value) => setContentForm({...contentForm, day_number: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5].map(day => (
                              <SelectItem key={day} value={day.toString()}>Day {day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={contentForm.title}
                          onChange={(e) => setContentForm({...contentForm, title: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-description">Description</Label>
                        <Textarea
                          id="content-description"
                          value={contentForm.description}
                          onChange={(e) => setContentForm({...contentForm, description: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="content-type">Content Type</Label>
                        <Select 
                          value={contentForm.content_type} 
                          onValueChange={(value) => setContentForm({...contentForm, content_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="theory">Theory</SelectItem>
                            <SelectItem value="practical">Practical</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="document">Document</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="content-url">Content URL</Label>
                        <Input
                          id="content-url"
                          value={contentForm.content_url}
                          onChange={(e) => setContentForm({...contentForm, content_url: e.target.value})}
                          placeholder="https://example.com/content"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="premium"
                          checked={contentForm.is_premium_only}
                          onChange={(e) => setContentForm({...contentForm, is_premium_only: e.target.checked})}
                        />
                        <Label htmlFor="premium">Premium Only Content</Label>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingContent ? "Update Content" : "Create Content"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseContent.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>Day {content.day_number}</TableCell>
                      <TableCell className="font-medium">{content.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{content.content_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {content.is_premium_only ? (
                          <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editContent(content)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteContent(content.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;