<?php
// Test script to check forum data structure
require_once 'php/functions.php';

echo "Testing Forum Data Structure\n";
echo "==============================\n\n";

// Test get_teacher_classes_for_forum
echo "Testing get_teacher_classes_for_forum(1):\n";
ob_start();
get_teacher_classes_for_forum('1');
$output = ob_get_clean();
echo $output . "\n\n";

// Test get_student_classes_for_forum
echo "Testing get_student_classes_for_forum(1):\n";
ob_start();
get_student_classes_for_forum('1');
$output = ob_get_clean();
echo $output . "\n\n";

// Test get_course_forum_threads
echo "Testing get_course_forum_threads(1):\n";
ob_start();
get_course_forum_threads('1');
$output = ob_get_clean();
echo $output . "\n\n";

echo "Test completed.\n";
?>
