import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, BookOpen, Users, Clock, Loader2, GraduationCap } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  short_description: string | null;
  thumbnail_url: string | null;
  enrollment_type: string;
  category: { id: string; name: string } | null;
  enrollments_count: number;
}

interface Category {
  id: string;
  name: string;
}

export default function CourseCatalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: catData } = await supabase
        .from('course_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      setCategories(catData || []);

      // Fetch published public courses
      const { data: courseData } = await supabase
        .from('lms_courses')
        .select(`
          id,
          title,
          short_description,
          thumbnail_url,
          enrollment_type,
          category:course_categories (id, name)
        `)
        .eq('status', 'published')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Get enrollment counts
      const coursesWithCounts: Course[] = await Promise.all(
        (courseData || []).map(async (course: any) => {
          const { count } = await supabase
            .from('lms_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            enrollments_count: count || 0,
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.short_description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory =
      selectedCategory === 'all' || course.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Course Catalog</h1>
        <p className="mt-1 text-muted-foreground">
          Explore our available courses and start learning
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="flex gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No courses found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for new courses'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="overflow-hidden transition-shadow hover:shadow-lg">
              <div className="aspect-video bg-muted">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    {course.category && (
                      <Badge variant="secondary" className="mb-2">
                        {course.category.name}
                      </Badge>
                    )}
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  </div>
                </div>
                {course.short_description && (
                  <CardDescription className="line-clamp-2">
                    {course.short_description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.enrollments_count} enrolled
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {course.enrollment_type === 'open' ? 'Open' : 'Restricted'}
                  </Badge>
                </div>
                <Button asChild className="w-full">
                  <Link to={`/lms/courses/${course.id}`}>View Course</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
