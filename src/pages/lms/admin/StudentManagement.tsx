import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, UserPlus, Users, GraduationCap, Key, BookOpen } from 'lucide-react';

interface Student {
  id: string;
  student_no: string | null;
  other_name: string;
  surname: string;
  gender: string;
  upi_number: string | null;
  birth_cert_no: string | null;
  birth_date: string;
  nationality: string;
  phone: string;
  religion: string | null;
  county: string;
  sub_county: string | null;
  postal_address: string | null;
  physical_address: string | null;
  student_type_id: string | null;
  student_source: string | null;
  financial_aid: string | null;
  email: string | null;
  kcpe_index: string | null;
  kcpe_year: number | null;
  kcpe_grade: string | null;
  kcse_index: string | null;
  kcse_year: number | null;
  kcse_grade: string | null;
  class_id: string | null;
  stay_status: string | null;
  status: string | null;
  stream: string | null;
  sports_house: string | null;
  user_id: string | null;
  created_at: string;
  classes?: { name: string } | null;
}

interface StudentType {
  id: string;
  name: string;
}

interface ClassData {
  id: string;
  name: string;
  is_active: boolean;
}

interface Course {
  id: string;
  title: string;
  status: string;
}

const initialFormState = {
  other_name: '',
  surname: '',
  gender: 'Male',
  upi_number: '',
  birth_cert_no: '',
  birth_date: '',
  nationality: '',
  phone: '',
  religion: '',
  county: '',
  sub_county: '',
  postal_address: '',
  physical_address: '',
  student_type_id: '',
  student_source: '',
  financial_aid: '',
  email: '',
  kcpe_index: '',
  kcpe_year: '',
  kcpe_grade: '',
  kcse_index: '',
  kcse_year: '',
  kcse_grade: '',
  class_id: '',
  stay_status: 'Non-Resident',
  stream: '',
  sports_house: '',
};

export default function StudentManagement() {
  const { isAdmin, isTeacher, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentTypes, setStudentTypes] = useState<StudentType[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  
  // Enrollment dialog state
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin && !isTeacher) {
      navigate('/lms/dashboard');
    }
  }, [authLoading, isAdmin, isTeacher, navigate]);

  useEffect(() => {
    fetchStudents();
    fetchStudentTypes();
    fetchClasses();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        classes(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch students');
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const fetchStudentTypes = async () => {
    const { data } = await supabase
      .from('student_types')
      .select('id, name')
      .eq('is_active', true);
    setStudentTypes(data || []);
  };

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, is_active')
      .eq('is_active', true)
      .order('name');
    setClasses(data || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('lms_courses')
      .select('id, title, status')
      .eq('status', 'published')
      .order('title');
    setCourses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const studentData = {
      other_name: formData.other_name,
      surname: formData.surname,
      gender: formData.gender,
      upi_number: formData.upi_number || null,
      birth_cert_no: formData.birth_cert_no || null,
      birth_date: formData.birth_date,
      nationality: formData.nationality,
      phone: formData.phone,
      religion: formData.religion || null,
      county: formData.county,
      sub_county: formData.sub_county || null,
      postal_address: formData.postal_address || null,
      physical_address: formData.physical_address || null,
      student_type_id: formData.student_type_id || null,
      student_source: formData.student_source || null,
      financial_aid: formData.financial_aid || null,
      email: formData.email || null,
      kcpe_index: formData.kcpe_index || null,
      kcpe_year: formData.kcpe_year ? parseInt(formData.kcpe_year) : null,
      kcpe_grade: formData.kcpe_grade || null,
      kcse_index: formData.kcse_index || null,
      kcse_year: formData.kcse_year ? parseInt(formData.kcse_year) : null,
      kcse_grade: formData.kcse_grade || null,
      class_id: formData.class_id || null,
      stay_status: formData.stay_status || null,
      stream: formData.stream || null,
      sports_house: formData.sports_house || null,
    };

    if (editingStudent) {
      const { error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', editingStudent.id);

      if (error) {
        toast.error('Failed to update student');
      } else {
        toast.success('Student updated successfully');
        setIsDialogOpen(false);
        setEditingStudent(null);
        setFormData(initialFormState);
        fetchStudents();
      }
    } else {
      const { error } = await supabase.from('students').insert(studentData);

      if (error) {
        toast.error('Failed to add student');
      } else {
        toast.success('Student added successfully');
        setIsDialogOpen(false);
        setFormData(initialFormState);
        fetchStudents();
      }
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      other_name: student.other_name,
      surname: student.surname,
      gender: student.gender,
      upi_number: student.upi_number || '',
      birth_cert_no: student.birth_cert_no || '',
      birth_date: student.birth_date,
      nationality: student.nationality,
      phone: student.phone,
      religion: student.religion || '',
      county: student.county,
      sub_county: student.sub_county || '',
      postal_address: student.postal_address || '',
      physical_address: student.physical_address || '',
      student_type_id: student.student_type_id || '',
      student_source: student.student_source || '',
      financial_aid: student.financial_aid || '',
      email: student.email || '',
      kcpe_index: student.kcpe_index || '',
      kcpe_year: student.kcpe_year?.toString() || '',
      kcpe_grade: student.kcpe_grade || '',
      kcse_index: student.kcse_index || '',
      kcse_year: student.kcse_year?.toString() || '',
      kcse_grade: student.kcse_grade || '',
      class_id: student.class_id || '',
      stay_status: student.stay_status || 'Non-Resident',
      stream: student.stream || '',
      sports_house: student.sports_house || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can delete students');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this student?')) return;

    const { error } = await supabase.from('students').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete student');
    } else {
      toast.success('Student deleted successfully');
      fetchStudents();
    }
  };

  const handleCreateLogin = async (student: Student) => {
    if (!student.email) {
      toast.error('Student must have an email to create login credentials');
      return;
    }

    if (student.user_id) {
      toast.error('Student already has login credentials');
      return;
    }

    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    
    try {
      // Note: In production, you'd use an edge function to create users
      // For now, we'll show a message about the expected flow
      toast.info(
        `To create login for ${student.email}, use the admin user management or have them sign up directly. Temp password would be: ${tempPassword}`,
        { duration: 10000 }
      );
    } catch (error) {
      toast.error('Failed to create login credentials');
    }
  };

  const openEnrollDialog = async (student: Student) => {
    if (!student.user_id) {
      toast.error('Student must have login credentials before enrolling in courses');
      return;
    }
    
    setEnrollingStudent(student);
    setSelectedCourses([]);
    
    // Fetch student's current enrollments
    const { data: enrollments } = await supabase
      .from('lms_enrollments')
      .select('course_id')
      .eq('user_id', student.user_id);
    
    if (enrollments) {
      setSelectedCourses(enrollments.map(e => e.course_id));
    }
    
    setEnrollDialogOpen(true);
  };

  const handleEnrollStudent = async () => {
    if (!enrollingStudent?.user_id) return;
    
    setEnrollLoading(true);
    
    try {
      // Get current enrollments
      const { data: currentEnrollments } = await supabase
        .from('lms_enrollments')
        .select('course_id')
        .eq('user_id', enrollingStudent.user_id);
      
      const currentCourseIds = currentEnrollments?.map(e => e.course_id) || [];
      
      // Courses to add
      const toAdd = selectedCourses.filter(id => !currentCourseIds.includes(id));
      
      // Courses to remove
      const toRemove = currentCourseIds.filter(id => !selectedCourses.includes(id));
      
      // Add new enrollments
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('lms_enrollments')
          .insert(toAdd.map(courseId => ({
            course_id: courseId,
            user_id: enrollingStudent.user_id,
            role: 'student',
            status: 'active',
          })));
        
        if (addError) throw addError;
      }
      
      // Remove enrollments
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('lms_enrollments')
          .delete()
          .eq('user_id', enrollingStudent.user_id)
          .in('course_id', toRemove);
        
        if (removeError) throw removeError;
      }
      
      toast.success('Student enrollments updated successfully');
      setEnrollDialogOpen(false);
      setEnrollingStudent(null);
    } catch (error) {
      console.error('Error updating enrollments:', error);
      toast.error('Failed to update enrollments');
    } finally {
      setEnrollLoading(false);
    }
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.other_name.toLowerCase().includes(search.toLowerCase()) ||
      student.surname.toLowerCase().includes(search.toLowerCase()) ||
      student.student_no?.toLowerCase().includes(search.toLowerCase()) ||
      student.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-primary">Active</Badge>;
      case 'Inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'Suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'Graduated':
        return <Badge className="bg-secondary">Graduated</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Student Management</h1>
            <p className="text-muted-foreground">
              Manage student records and course enrollments
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingStudent(null);
              setFormData(initialFormState);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Personal Information */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2">Personal Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="other_name">Other Name *</Label>
                    <Input
                      id="other_name"
                      value={formData.other_name}
                      onChange={(e) => setFormData({ ...formData, other_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="surname">Surname *</Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="birth_date">Birth Date *</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nationality">Nationality *</Label>
                    <Input
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="religion">Religion</Label>
                    <Input
                      id="religion"
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                    />
                  </div>

                  {/* Identification */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2 mt-4">Identification</h3>
                  </div>
                  <div>
                    <Label htmlFor="upi_number">UPI Number</Label>
                    <Input
                      id="upi_number"
                      value={formData.upi_number}
                      onChange={(e) => setFormData({ ...formData, upi_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth_cert_no">Birth Cert No.</Label>
                    <Input
                      id="birth_cert_no"
                      value={formData.birth_cert_no}
                      onChange={(e) => setFormData({ ...formData, birth_cert_no: e.target.value })}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2 mt-4">Contact Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="county">County *</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub_county">Sub County</Label>
                    <Input
                      id="sub_county"
                      value={formData.sub_county}
                      onChange={(e) => setFormData({ ...formData, sub_county: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postal_address">Postal Address</Label>
                    <Input
                      id="postal_address"
                      value={formData.postal_address}
                      onChange={(e) => setFormData({ ...formData, postal_address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="physical_address">Physical Address</Label>
                    <Input
                      id="physical_address"
                      value={formData.physical_address}
                      onChange={(e) => setFormData({ ...formData, physical_address: e.target.value })}
                    />
                  </div>

                  {/* Academic Information */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2 mt-4">Academic Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="student_type_id">Student Type</Label>
                    <Select
                      value={formData.student_type_id}
                      onValueChange={(value) => setFormData({ ...formData, student_type_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="student_source">Student Source</Label>
                    <Input
                      id="student_source"
                      value={formData.student_source}
                      onChange={(e) => setFormData({ ...formData, student_source: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="financial_aid">Financial Aid</Label>
                    <Input
                      id="financial_aid"
                      value={formData.financial_aid}
                      onChange={(e) => setFormData({ ...formData, financial_aid: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="class_id">Class</Label>
                    <Select
                      value={formData.class_id}
                      onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stream">Stream</Label>
                    <Input
                      id="stream"
                      value={formData.stream}
                      onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stay_status">Stay Status</Label>
                    <Select
                      value={formData.stay_status}
                      onValueChange={(value) => setFormData({ ...formData, stay_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Resident">Resident</SelectItem>
                        <SelectItem value="Non-Resident">Non-Resident</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="sports_house">Sports House</Label>
                    <Input
                      id="sports_house"
                      value={formData.sports_house}
                      onChange={(e) => setFormData({ ...formData, sports_house: e.target.value })}
                    />
                  </div>

                  {/* KCPE Information */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2 mt-4">KCPE Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="kcpe_index">KCPE Index</Label>
                    <Input
                      id="kcpe_index"
                      value={formData.kcpe_index}
                      onChange={(e) => setFormData({ ...formData, kcpe_index: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kcpe_year">KCPE Year</Label>
                    <Input
                      id="kcpe_year"
                      type="number"
                      value={formData.kcpe_year}
                      onChange={(e) => setFormData({ ...formData, kcpe_year: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kcpe_grade">KCPE Grade</Label>
                    <Input
                      id="kcpe_grade"
                      value={formData.kcpe_grade}
                      onChange={(e) => setFormData({ ...formData, kcpe_grade: e.target.value })}
                    />
                  </div>

                  {/* KCSE Information */}
                  <div className="md:col-span-3">
                    <h3 className="font-semibold text-lg mb-2 mt-4">KCSE Information</h3>
                  </div>
                  <div>
                    <Label htmlFor="kcse_index">KCSE Index</Label>
                    <Input
                      id="kcse_index"
                      value={formData.kcse_index}
                      onChange={(e) => setFormData({ ...formData, kcse_index: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kcse_year">KCSE Year</Label>
                    <Input
                      id="kcse_year"
                      type="number"
                      value={formData.kcse_year}
                      onChange={(e) => setFormData({ ...formData, kcse_year: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kcse_grade">KCSE Grade</Label>
                    <Input
                      id="kcse_grade"
                      value={formData.kcse_grade}
                      onChange={(e) => setFormData({ ...formData, kcse_grade: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStudent ? 'Update Student' : 'Add Student'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Enrollment Dialog */}
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Enroll Student in Courses
              </DialogTitle>
            </DialogHeader>
            {enrollingStudent && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enrolling: <span className="font-medium text-foreground">{enrollingStudent.other_name} {enrollingStudent.surname}</span>
                </p>
                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {courses.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground">No published courses available</p>
                  ) : (
                    courses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleCourseSelection(course.id)}
                      >
                        <Checkbox
                          checked={selectedCourses.includes(course.id)}
                          onCheckedChange={() => toggleCourseSelection(course.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{course.title}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEnrollStudent} disabled={enrollLoading}>
                    {enrollLoading ? 'Saving...' : 'Save Enrollments'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{students.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-primary">
                {students.filter((s) => s.status === 'Active').length}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With Login
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {students.filter((s) => s.user_id).length}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Non-Resident
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {students.filter((s) => s.stay_status === 'Non-Resident').length}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, student no, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No students found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-mono text-sm">
                          {student.student_no}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {student.other_name} {student.surname}
                            </p>
                            {student.email && (
                              <p className="text-xs text-muted-foreground">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>{student.classes?.name || '-'}</TableCell>
                        <TableCell>
                          {student.user_id ? (
                            <Badge variant="outline" className="text-primary border-primary">
                              <Key className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Login</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(student)}
                              title="Edit student"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {student.user_id ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEnrollDialog(student)}
                                title="Manage enrollments"
                              >
                                <GraduationCap className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCreateLogin(student)}
                                title="Create login"
                                disabled={!student.email}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(student.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
