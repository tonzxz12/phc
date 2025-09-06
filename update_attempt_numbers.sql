-- Update existing student_assessments records to have proper attempt_number values
-- This script assigns attempt numbers based on the timestamp order for each student-assessment combination

WITH numbered_attempts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY studentid, assessmentid 
      ORDER BY timestamp ASC
    ) as calculated_attempt_number
  FROM student_assessments
  WHERE attempt_number IS NULL OR attempt_number = 0 OR attempt_number = 1
)
UPDATE student_assessments 
SET attempt_number = numbered_attempts.calculated_attempt_number
FROM numbered_attempts
WHERE student_assessments.id = numbered_attempts.id;

-- Verify the update
SELECT 
  assessmentid,
  studentid,
  attempt_number,
  timestamp,
  takenpoints
FROM student_assessments
ORDER BY assessmentid, studentid, attempt_number;
