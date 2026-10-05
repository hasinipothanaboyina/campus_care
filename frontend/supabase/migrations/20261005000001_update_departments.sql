-- Update existing department names to standard acronyms
UPDATE public.profiles
SET department = CASE 
    WHEN department = 'Computer Science & Engineering' THEN 'CSE'
    WHEN department = 'Electronics & Communication' THEN 'ECE'
    WHEN department = 'Mechanical Engineering' THEN 'MECHANICAL'
    WHEN department = 'Civil Engineering' THEN 'CIVIL'
    WHEN department = 'Electrical Engineering' THEN 'EEE'
    WHEN department = 'Information Technology' THEN 'IT'
    WHEN department = 'Business & Management' THEN 'MBA'
    WHEN department = 'Sciences & Humanities' THEN 'PHARMACY'
    ELSE department
END;
