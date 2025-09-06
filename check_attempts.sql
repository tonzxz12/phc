-- Check the updated attempt numbers for a specific assessment
SELECT 
  assessmentid,
  studentid,
  attempt_number,
  timestamp,
  takenpoints,
  totalpoints
FROM student_assessments
WHERE assessmentid = '51f3b7a4953e442888708ec29a0e7538'
ORDER BY studentid, attempt_number;
