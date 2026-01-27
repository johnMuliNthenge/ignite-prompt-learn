-- Add missing modules for navigation
INSERT INTO app_modules (code, name, description, parent_code, sort_order, is_active) VALUES
('catalog', 'Course Catalog', 'Browse available courses', NULL, 3, true),
('instructor', 'Instructor', 'Instructor module for course management', NULL, 10, true),
('instructor.create_course', 'Create Course', 'Create new courses', 'instructor', 1, true),
('instructor.my_courses', 'My Created Courses', 'View instructor courses', 'instructor', 2, true),
('instructor.students', 'Student Management', 'Manage students', 'instructor', 3, true),
('instructor.classes', 'Classes', 'Manage classes', 'instructor', 4, true),
('admin.users', 'User Management', 'Manage users', 'admin', 1, true),
('admin.roles', 'Roles Management', 'Manage roles', 'admin', 2, true),
('admin.user_roles', 'User Role Assignment', 'Assign roles to users', 'admin', 3, true),
('admin.analytics', 'Analytics', 'View analytics', 'admin', 4, true),
('admin.administration', 'Administration Settings', 'Admin settings', 'admin', 5, true)
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;