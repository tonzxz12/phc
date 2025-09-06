<?php
    include getcwd().'/source/config.php';

    //$API_KEY = '$2y$10$jDyFxPlQt0iz/JmEwFZGSOrCEwlu.GQRdTXT0gIbRlJHD6w2etZbi';
    $API_KEY = '$2a$12$T3HuBFQs7UwsNdNnEH4.v.LWADk3/4MLWhL2EuBQ/aueWjl/407vW';
    
    function exit_with_failure($output){
        die(json_encode(array("success"=>false, "output"=>$output)));
    }
    
    function exit_with_success($output){
        echo json_encode(array("success"=>true,"output"=> $output));
        die();
    }
    function quick_insert($table , $data){
        $keys = array_keys((array) $data);
        $sql = "INSERT INTO $table ( ";
        $i = 0;
        $fields = '';
        foreach($keys as $key){
            if($i != 0){
                $fields .= ', ';
            }
            $fields .= $key;
            $i++;
        }
        $sql .= $fields." ) VALUES (";
        $i = 0;
        $fields = '';
        foreach($keys as $key){
            if($i != 0){
                $fields .= ', ';
            }
            if(is_numeric($data->$key)){
              $fields .= $data->$key;
            }else if(is_bool($data->$key)){
              $fields .= ($data->$key ? 'true' : 'false');
            }else{
               $fields .= "'".$data->$key."'";
            }
            $i++;
        }
        $sql .= $fields." )";
        query($sql);
    }
    
    function quick_insert_with($conditions,$table , $data){
        $keys = array_keys((array) $data);
        $sql = "INSERT INTO $table ( ";
        $i = 0;
        $fields = '';
        foreach($keys as $key){
            if($i != 0){
                $fields .= ', ';
            }
            $fields .= $key;
            $i++;
        }
        $sql .= $fields." ) VALUES (";
        $i = 0;
        $fields = '';
        foreach($keys as $key){
            if($i != 0){
                $fields .= ', ';
            }
            if(is_numeric($data->$key)){
              $fields .= $data->$key;
            }else{
               $fields .= "'".$data->$key."'";
            }
            $i++;
        }
        $sql .= $fields." ) WHERE $conditions";
        query($sql);
    }
    
    function quick_update($conditions,$table, $data){
        $keys = array_keys((array) $data);
        $sql = "UPDATE $table SET ";
        $i = 0;
        $fields = '';
        foreach($keys as $key){
            if($i != 0){
                $fields .= ', ';
            }
            if(is_numeric($data->$key)){
                $fields .= $key." = ".$data->$key;
            }else if(is_bool($data->$key)){
                $fields .= $key." = ".($data->$key ? 'true' : 'false');
            }else{
                $fields .= $key." = "."'".$data->$key."'";
            }
            $i++;
        }
        $sql .= $fields." WHERE $conditions";
        query($sql);
    }
    
    function query($sql){
        global $conn;
        try{
            pg_query($conn, $sql);
        }catch(Exception $e){
            die(array("success"=>false, "output"=>"Unable to fetch data."));
        }
    }
    
    function fetch_multiple($sql){
        global $conn;
        try{
            $result = pg_query($conn , $sql);
            $rows = pg_fetch_all($result);
        }catch(Exception $e){
            die(array("success"=>false, "output"=>"Unable to fetch data."));
        }
        return $rows;
    }
    
    function fetch_one($sql){
        global $conn;
        try{
            $result = pg_query($conn , $sql);
            $row = pg_fetch_object($result);
        }catch (Exception $e){
            die(array("success"=>false, "output"=>"Unable to fetch data."));
        }
        return $row;
    }    
    
    function get_entries($data){
        $postObject = json_decode($data->data);
        
        // Build SELECT clause
        $selectors = isset($postObject->selectors) ? implode(', ', $postObject->selectors) : '*';
        
        // Build FROM clause
        $tables = $postObject->tables;
        
        // Build conditions (JOINs, WHERE, GROUP BY, ORDER BY, etc.)
        $sql = "SELECT $selectors FROM $tables";
        
        if(isset($postObject->conditions)){
            $conditions = $postObject->conditions;
            
            // Handle JOINs
            foreach($conditions as $key => $value){
                if(strpos($key, 'JOIN') !== false){
                    $sql .= " $key $value";
                }
            }
            
            // Handle WHERE clause
            if(isset($conditions->WHERE)){
                $whereConditions = [];
                foreach($conditions->WHERE as $field => $val){
                    if(strpos($field, '[dot]') === 0){
                        $field = str_replace('[dot]', '', $field);
                    }
                    if(is_numeric($val)){
                        $whereConditions[] = "$field = $val";
                    } else {
                        $whereConditions[] = "$field = '$val'";
                    }
                }
                if(!empty($whereConditions)){
                    $sql .= " WHERE " . implode(' AND ', $whereConditions);
                }
            }
            
            // Handle GROUP BY
            if(isset($conditions->{'GROUP BY'})){
                $sql .= " GROUP BY " . $conditions->{'GROUP BY'};
            }
            
            // Handle ORDER BY
            if(isset($conditions->{'ORDER BY'})){
                $sql .= " ORDER BY " . $conditions->{'ORDER BY'};
            }
            
            // Handle LIMIT
            if(isset($conditions->LIMIT)){
                $sql .= " LIMIT " . $conditions->LIMIT;
            }
        }
        
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }
    
    function create_entry($data){
        $postObject = json_decode($data->data);
        $table = $postObject->tables;
        $values = $postObject->values;
        
        quick_insert($table, $values);
        exit_with_success('Entry created successfully');
    }
    
    function update_entry($data){
        $postObject = json_decode($data->data);
        $table = $postObject->tables;
        $values = $postObject->values;
        $conditions = $postObject->conditions;
        
        quick_update($conditions, $table, $values);
        exit_with_success('Entry updated successfully');
    }
    
    
    function login($credential){
        global $conn;
        $accountTypes = ['students', 'teachers','administrators'];
        $i = 0;
        foreach($accountTypes as $account){
            $sql = "SELECT * FROM $account WHERE Email = '$credential->username'";
            $result = pg_query($conn , $sql);
            if(pg_num_rows($result) > 0){
               break;
            }
            $i++;
        }
        if($i >= count($accountTypes)){
            die(json_encode(array("success"=>false, "output"=>"User not found")));
        }
        $row =  pg_fetch_object($result);
        
        if(!password_verify($credential->password, $row->password)){
            die(json_encode(array("success"=>false, "output"=>"Invalid Password")));
        }
        unset($row->password);
        $row->accountType = $i;
        echo json_encode(array("success"=>true,"output"=>$row));
        die();
    }

    function register($userdata){
        global $conn;
        if($userdata->accountType == "Teacher"){
            $account = "teachers";
        }else{
            $account = "students";
        }
        $id = bin2hex(random_bytes(16));
        $sql = "SELECT * FROM $account WHERE ID = '$id'";
        $result = pg_query($conn , $sql);
        while(pg_num_rows($result) > 0){
            $id = bin2hex(random_bytes(16));
            $sql = "SELECT * FROM $account WHERE ID = '$id'";
            $result = pg_query($conn , $sql);
        }
        $sql = "INSERT INTO $account VALUES ('$id',  '$userdata->firstname', 
            '$userdata->lastname', '$userdata->username', '".password_hash($userdata->password, PASSWORD_DEFAULT)."')";
        pg_query($conn , $sql);
        echo json_encode(array("success"=>true,"output"=>"Registration Successful!"));
        die();
    }

    function enroll($form){
        $sql = "INSERT INTO student_languages VALUES ('$form->studentID', '$form->languageID')";
        pg_query($conn , $sql);
        echo json_encode(array("success"=>true,"output"=>"Enrollment Successful!"));
        die();
    }

    function apply($form){
        $sql = "INSERT INTO teacher_languages VALUES ('$form->teacherID', '$form->languageID')";
        pg_query($conn , $sql);
        echo json_encode(array("success"=>true,"output"=>"Enrollment Successful!"));
        die();
    }


    // NEW METHODS

    function add_assessment_item($data){
        $form = $data;
        $id = $form->AssessmentID;
        unset($form->AssessmentID);
        quick_insert_with( "ID = '$id'" ,'quiz_items', $form);
        exit_with_success('Added New Assessment Item');
    }
    function update_assessment_item($data){
        $form = $data;
        $id = $form->AssessmentID;
        unset($form->AssessmentID);
        quick_update_with( "ID = '$id'" ,'quiz_items', $form);
        exit_with_success("Updated an Assessment Item");
    }

    function remove_assessment_item($id){
        quick_remove_with( "ID = '$id'" ,'quiz_items');
        exit_with_success("Removed an Assessment Item");
    }

    function get_assessment_items($id){
        $rows = fetch_multiple_with("ID ='$id'", "quiz_items");
        exit_with_success($rows);
    }

    function count_assessment_items($id){
        $count = count_rows_with("ID = '$id'", "quiz_items");
        exit_with_success($count);
    }


    function get_student_proficiency_chart($data){
        $studentID = $data->StudentID;
        $languageID = $data->LanguageID;
        $rows = fetch_multiple_with(
            "StudentID ='$studentID' AND LanguageID = '$languageID'
            ORDER BY Stamp DESC
            ",
        "proficiency_stamp");
        exit_with_success($rows);
    }

    function get_student_proficiency($data){
        $studentID = $data->StudentID;
        $languageID = $data->LanguageID;
        $row = fetch_one(
            "StudentID ='$studentID' AND LanguageID = '$languageID'
            ORDER BY Stamp DESC
            ",
        "student_course_activity_stamp");
        
        exit_with_success($row);
    }

    function create_proficiency_stamp($data){
        $form = $data;
        $studentID = $data->StudentID;
        $languageID = $data->LanguageID;
        unset($form->StudentID);
        unset($form->LanguageID);
        quick_insert_with( "StudentID = '$studentID' AND LanguageID = '$languageID'",'proficiency_stamp', $form);
        exit_with_success("Successfully created activity stamp.");
    }

    function get_student_courses($id){
        $sql = "SELECT * FROM student_courses WHERE StudentID = '$id'";
        $rows = fetch_multiple($sql);
        echo json_encode(array("success"=>true,"output"=>$rows));
        die();
    }

    function get_teacher_courses($id){
        $sql = "SELECT * FROM courses WHERE TeacherID = '$id'";
        $rows = fetch_multiple($sql);
        echo json_encode(array("success"=>true,"output"=>$rows));
        die();
    }

    function get_lessons($id){
        $sql = "SELECT * FROM lessons WHERE CourseID = '$id'";
        $rows = fetch_multiple($sql);
        echo json_encode(array("success"=>true,"output"=>$rows));
        die();
    }

    function take_lesson($data){
        $studentID = $data->studentID;
        $lessonID = $data->lessonID;
        $sql = "INSERT INTO lessons_taken VALUES ('$studentID','$lessonID')";
        echo json_encode(array("success"=>true,"output"=>"Started taking a lesson"));
        die();
    }

    function get_lesson_progress($data){
        $studentID = $data->studentID;
        $lessonID = $data->lessonID;
        $progress = $data->progress;
        $sql = "SELECT progress FROM lessons_taken WHERE StudentID = '$studentID', LessonID = '$lessonID'";
        $row = fetch_one($sql);
        $progress = $row['progress'];
        echo json_encode(array("success"=>true,"output"=>$progress));
        die();
    }

    function update_lesson_progress($data){
        $studentID = $data->studentID;
        $lessonID = $data->lessonID;
        $progress = $data->progress;
        $mark_as_done = '';
        if($progress >= 100){
            $mark_as_done = ', EndTime = CURRENT_TIMESTAMP()';
        }
        $sql = "UPDATE lessons_taken SET progress = $progress $mark_as_done WHERE StudentID = '$studentID', LessonID = '$lessonID'";
        query($sql);
        echo json_encode(array("success"=>true,"output"=>"Updated progress of Lesson"));
        die();
    }

    function create_lesson($data){
        quick_insert('lessons', $data);
        exit_with_success("Created a lesson");
    }

    function get_assessments($id){
        $sql = "SELECT * FROM assessments WHERE CourseID = '$id'";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function create_assessment($data){
        quick_insert('assessments', $data);
        exit_with_success("Created a assessment");
    }

    function take_assessment($data){
        quick_insert('assessment_tasks_taken', $data);
        exit_with_success("Taken assessment");
    }

    function create_course($data){
        $data->ID = generateID('courses');
        quick_insert('courses', $data);
        exit_with_success('Created a course');
    }

    function edit_course($data){
        $form = $data;
        $id = $form->ID;
        unset($form->ID);
        quick_update("ID = '$id'",'courses', $form);
        exit_with_success('Updated a course');
    }

    function get_courses($conditions){
        if($conditions->Limit != null){
            $stop = "LIMIT ".$conditions->Limit;
        }else{
            $stop = "";
        }
        if($conditions->Filter){
            $filter = "WHERE Filter=".$conditions->Filter;
        }else{
            $filter = "";
        }
        $sql = "SELECT teachers.FirstName,teachers.LastName,teachers.Profile, COUNT(lessons.CourseID) as lessoncount , languages.*, courses.* 
        FROM courses 
        LEFT JOIN teachers 
        ON teachers.ID = courses.TeacherID
        LEFT JOIN lessons
        ON lessons.CourseID = courses.ID  
        LEFT JOIN languages
        ON languages.ID = courses.LanguageID
        $filter 
        GROUP BY courses.ID, teachers.ID, languages.ID
         ORDER BY Difficulty DESC
         $stop
         ";
        $rows = fetch_multiple($sql);
        echo json_encode(array("success"=>true,"output"=>$rows));
        die();
    }

    function start_meeting($data){
        quick_insert('meetings', $data);
        $teacherID = $data->TeacherID;
        $classID = $data->ClassID;
        $sql = "SELECT * FROM courses,classes,meetings 
        WHERE courses.ID = classes.CourseID AND classes.ID = meetings.ClassID
        AND meetings.TeacherID = '$teacherID' AND meetings.ClassID = '$classID' ";
        $row = fetch_one($sql);
        exit_with_success($row);
    }

    function get_meeting($id){
        $sql = "SELECT meetings.*, courses.* FROM meetings, student_classes, classes, courses WHERE 
        courses.ID = classes.CourseID AND classes.ID = meetings.ClassID
        AND meetings.EndTime IS NULL AND meetings.ClassID = student_classes.ClassID AND student_classes.StudentID = '$id'";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    } 

    function end_meeting($id){
        $sql = "UPDATE meetings SET EndTime=now() WHERE TeacherID = '$id' AND EndTime IS NULL";
        query($sql);
        exit_with_success('Meeting Ended');
    }

    // Other Functions 
    function clean($input){
        return trim(htmlspecialchars($input));
    }

    function server_api_error(){
        echo json_encode(array("success"=>false, "output"=>"Server API error"));
        die();
    }

    function check_inputs($inputs){
        $complete = true;
        foreach($inputs as $input){
            if(!isset($_POST[$input])){
                $complete = false;
                break;
            }
        }
        return $complete;
    }

    function append_inputs_if_exists(&$postObject ,$inputs){
        foreach($inputs as $input){
            if(isset($_POST[$input])){
                $postObject->$input = $_POST[$input];
            }
        }
    }

    
    function check_if_enrolled($data){
        $studentID = $data->StudentID;
        $courseID = $data->CourseID;
        $sql = "SELECT courses.ID FROM courses,classes, student_classes,students
        WHERE courses.ID = classes.CourseID AND student_classes.ClassID = classes.ID
        AND students.ID = student_classes.StudentID 
        AND courses.ID = '$courseID' AND students.ID = '$studentID'
        ";
        $rows = fetch_multiple($sql);
        $enrolled = false;
        if(count($rows) > 0){
            $enrolled = true;
        }
        exit_with_success(['enrolled'=> $enrolled]);
    }

    function create_class($data){
        quick_insert('classes', $data);
        exit_with_success('Created a class.');
    }

    function edit_class($data){
        $form = $data;
        $classID = $data->ClassID;
        unset($form->ClassID);
        quick_update("ID = '$classID'", 'classes', $form);
        exit_with_success('Edited a class.');
    }
    function delete_class($id){
        $sql = "DELETE FROM classes WHERE ID = '$id'";
        query($sql);
        exit_with_success('Deleted a class.');
    }

    function get_classes($data){
        $teacherID = $data->TeacherID;
        $courseID = $data->CourseID;
        $sql = "SELECT * FROM classes, courses WHERE courses.TeacherID = '$teacherID'
            AND courses.ID = '$courseID' AND courses.ID = classes.CourseID
        ";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }
    function save_dictionary($search_key , $dictionary_json){
        $file = $_SERVER['DOCUMENT_ROOT'].'\\data\\dictionary\\'.$search_key.".json";
        try{
            file_put_contents($file,$dictionary_json);
        }catch(Exception $e){
            exit_with_failure('Failed saving dictionary');
        }
        exit_with_success("Saved dictionary");
    }

    function save_pronunciation($search_key , $soundURL){
        $file = $_SERVER['DOCUMENT_ROOT'].'\\data\\audio\\'.$search_key.".json";
        try{
            file_put_contents($file,json_encode([ 'soundurl'=> $soundURL]));
        }catch(Exception $e){
            exit_with_failure('Failed saving dictionary');
        }
        exit_with_success("Saved dictionary");
    }

    function create_url($fileContent , $extension){
        $filename = bin2hex(random_bytes(32)).".".$extension;
        $file =  $_SERVER['DOCUMENT_ROOT'].'\\data\\temp\\'.$filename;
        try{
            file_put_contents($file, base64_decode($fileContent));
        }catch(Exception $e){
            exit_with_failure('Failed creating url');
        }
        exit_with_success($filename);
    }

    function remove_url($file){
        $file = $_SERVER['DOCUMENT_ROOT'].'\\data\\temp\\'.$file;
        try{
            unlink($file);
        }catch(Exception $e){
            exit_with_failure('Url does no exist');
        }
        exit_with_success('Deleted url');
    }

    // ===========================
    // FORUM SYSTEM FUNCTIONS
    // ===========================

    // Topic Threads Functions
    function create_topic_thread($data){
        $form = $data;
        $threadId = bin2hex(random_bytes(16));
        $form->threadid = $threadId;
        quick_insert('topic_threads', $form);
        exit_with_success(['threadid' => $threadId, 'message' => 'Topic thread created successfully']);
    }

    function get_topic_threads($topicId){
        $sql = "SELECT tt.*, t.title as topic_title, COUNT(tp.id) as post_count 
                FROM topic_threads tt
                LEFT JOIN topics t ON tt.topic_id = t.topicid
                LEFT JOIN topic_posts tp ON tt.id = tp.threadId AND tp.isDeleted = false
                WHERE tt.topic_id = '$topicId'
                GROUP BY tt.id, t.title
                ORDER BY tt.isPinned DESC, tt.createdAt DESC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function get_topic_thread_by_id($threadId){
        $sql = "SELECT tt.*, t.title as topic_title 
                FROM topic_threads tt
                LEFT JOIN topics t ON tt.topic_id = t.topicid
                WHERE tt.threadid = '$threadId'";
        $row = fetch_one($sql);
        exit_with_success($row);
    }

    function update_topic_thread($threadId, $data){
        $form = $data;
        quick_update("threadid = '$threadId'", 'topic_threads', $form);
        exit_with_success('Topic thread updated successfully');
    }

    function delete_topic_thread($threadId){
        $sql = "DELETE FROM topic_threads WHERE threadid = '$threadId'";
        query($sql);
        exit_with_success('Topic thread deleted successfully');
    }

    // Topic Posts Functions
    function create_topic_post($data){
        $form = $data;
        $postId = bin2hex(random_bytes(16));
        $form->postid = $postId;
        quick_insert('topic_posts', $form);
        exit_with_success(['postid' => $postId, 'message' => 'Topic post created successfully']);
    }

    function get_topic_posts($threadId){
        $sql = "SELECT tp.*, 
                s.firstname as author_student_firstname, s.lastname as author_student_lastname, s.profile as author_student_profile,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname, t.profile as author_teacher_profile,
                COUNT(replies.id) as reply_count
                FROM topic_posts tp
                LEFT JOIN students s ON tp.author_studentid = s.id
                LEFT JOIN teachers t ON tp.author_teacherid = t.id
                LEFT JOIN topic_posts replies ON tp.id = replies.parentPostId AND replies.isDeleted = false
                WHERE tp.threadId = $threadId AND tp.isDeleted = false
                GROUP BY tp.id, s.firstname, s.lastname, s.profile, t.firstname, t.lastname, t.profile
                ORDER BY tp.parentPostId ASC NULLS FIRST, tp.createdAt ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function get_topic_post_by_id($postId){
        $sql = "SELECT tp.*,
                s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname
                FROM topic_posts tp
                LEFT JOIN students s ON tp.author_studentid = s.id
                LEFT JOIN teachers t ON tp.author_teacherid = t.id
                WHERE tp.postid = '$postId'";
        $row = fetch_one($sql);
        exit_with_success($row);
    }

    function update_topic_post($postId, $data){
        $form = $data;
        $form->isEdited = true;
        quick_update("postid = '$postId'", 'topic_posts', $form);
        exit_with_success('Topic post updated successfully');
    }

    function delete_topic_post($postId){
        $updateData = (object) [
            'isDeleted' => true,
            'body' => '[This post has been deleted]'
        ];
        quick_update("postid = '$postId'", 'topic_posts', $updateData);
        exit_with_success('Topic post deleted successfully');
    }

    function get_topic_post_replies($parentPostId){
        $sql = "SELECT tp.*,
                s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname
                FROM topic_posts tp
                LEFT JOIN students s ON tp.author_studentid = s.id
                LEFT JOIN teachers t ON tp.author_teacherid = t.id
                WHERE tp.parentPostId = $parentPostId AND tp.isDeleted = false
                ORDER BY tp.createdAt ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    // Course Forum Threads Functions
    function create_course_forum_thread($data){
        $form = $data;
        $threadId = bin2hex(random_bytes(16));
        $form->threadid = $threadId;
        quick_insert('course_forum_threads', $form);
        exit_with_success(['threadid' => $threadId, 'message' => 'Course forum thread created successfully']);
    }

    function get_course_forum_threads($data){
        $courseId = $data->courseId;
        if (!$courseId) {
            exit_with_failure('Course ID is required');
        }
        
        $sql = "SELECT id, threadid, courseid, title, body, islocked, createdat, updatedat
                FROM course_forum_threads
                WHERE courseid = '$courseId'
                ORDER BY createdat DESC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    // Test function to check table structure
    function test_forum_tables(){
        // First, check if table exists and get its structure
        try {
            $sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'course_forum_threads' ORDER BY ordinal_position";
            $columns = fetch_multiple($sql);
            exit_with_success(['table_structure' => $columns, 'message' => 'Table structure retrieved']);
        } catch (Exception $e) {
            exit_with_failure('Error checking table structure: ' . $e->getMessage());
        }
    }

    function get_course_forum_thread_by_id($threadId){
        $sql = "SELECT cft.*, c.course as course_title, c.id as course_id
                FROM course_forum_threads cft
                LEFT JOIN courses c ON cft.courseid = c.id
                WHERE cft.threadid = '$threadId'";
        $row = fetch_one($sql);
        exit_with_success($row);
    }

    function update_course_forum_thread($threadId, $data){
        $form = $data;
        quick_update("threadid = '$threadId'", 'course_forum_threads', $form);
        exit_with_success('Course forum thread updated successfully');
    }

    function delete_course_forum_thread($threadId){
        $sql = "DELETE FROM course_forum_threads WHERE threadid = '$threadId'";
        query($sql);
        exit_with_success('Course forum thread deleted successfully');
    }

    // Course Forum Posts Functions
    function create_course_forum_post($data){
        $form = $data;
        $postId = bin2hex(random_bytes(16));
        $form->postid = $postId;
        quick_insert('course_forum_posts', $form);
        exit_with_success(['postid' => $postId, 'message' => 'Course forum post created successfully']);
    }

    function get_course_forum_posts($threadId){
        $sql = "SELECT cfp.*,
                s.firstname as author_student_firstname, s.lastname as author_student_lastname, s.profile as author_student_profile,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname, t.profile as author_teacher_profile,
                COUNT(replies.id) as reply_count
                FROM course_forum_posts cfp
                LEFT JOIN students s ON cfp.author_studentid = s.id
                LEFT JOIN teachers t ON cfp.author_teacherid = t.id
                LEFT JOIN course_forum_posts replies ON cfp.id = replies.parentPostId AND replies.isDeleted = false
                WHERE cfp.threadId = $threadId AND cfp.isDeleted = false
                GROUP BY cfp.id, s.firstname, s.lastname, s.profile, t.firstname, t.lastname, t.profile
                ORDER BY cfp.parentPostId ASC NULLS FIRST, cfp.createdAt ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function get_course_forum_post_by_id($postId){
        $sql = "SELECT cfp.*,
                s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname
                FROM course_forum_posts cfp
                LEFT JOIN students s ON cfp.author_studentid = s.id
                LEFT JOIN teachers t ON cfp.author_teacherid = t.id
                WHERE cfp.postid = '$postId'";
        $row = fetch_one($sql);
        exit_with_success($row);
    }

    function update_course_forum_post($postId, $data){
        $form = $data;
        $form->isEdited = true;
        quick_update("postid = '$postId'", 'course_forum_posts', $form);
        exit_with_success('Course forum post updated successfully');
    }

    function delete_course_forum_post($postId){
        $updateData = (object) [
            'isDeleted' => true,
            'body' => '[This post has been deleted]'
        ];
        quick_update("postid = '$postId'", 'course_forum_posts', $updateData);
        exit_with_success('Course forum post deleted successfully');
    }

    function get_course_forum_post_replies($parentPostId){
        $sql = "SELECT cfp.*,
                s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                t.firstname as author_teacher_firstname, t.lastname as author_teacher_lastname
                FROM course_forum_posts cfp
                LEFT JOIN students s ON cfp.author_studentid = s.id
                LEFT JOIN teachers t ON cfp.author_teacherid = t.id
                WHERE cfp.parentPostId = $parentPostId AND cfp.isDeleted = false
                ORDER BY cfp.createdAt ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    // Forum Utility Functions
    function get_teacher_classes_for_forum($data){
        $teacherId = $data->teacherId;
        $sql = "SELECT cl.*, c.course as course_title, c.details as course_description, c.id as course_id,
                COUNT(sc.studentid) as enrolled_count, COUNT(cft.id) as thread_count
                FROM classes cl
                LEFT JOIN courses c ON cl.courseid = c.id
                LEFT JOIN student_classes sc ON sc.classid = cl.id
                LEFT JOIN course_forum_threads cft ON cft.courseid = c.id
                WHERE c.teacherid = '$teacherId'
                GROUP BY cl.id, c.course, c.details, c.id
                ORDER BY c.course ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function get_student_classes_for_forum($data){
        $studentId = $data->studentId;
        $sql = "SELECT cl.*, c.course as course_title, c.details as course_description, c.id as course_id,
                COUNT(sc2.studentid) as enrolled_count, COUNT(cft.id) as thread_count
                FROM student_classes sc
                LEFT JOIN classes cl ON sc.classid = cl.id
                LEFT JOIN courses c ON cl.courseid = c.id
                LEFT JOIN student_classes sc2 ON sc2.classid = cl.id
                LEFT JOIN course_forum_threads cft ON cft.courseid = c.id
                WHERE sc.studentid = '$studentId'
                GROUP BY cl.id, c.course, c.details, c.id
                ORDER BY c.course ASC";
        $rows = fetch_multiple($sql);
        exit_with_success($rows);
    }

    function search_forum_posts($searchTerm, $forumType = null){
        $results = [];

        if (!$forumType || $forumType === 'topic') {
            $sql = "SELECT tp.*, tt.title as thread_title, t.title as topic_title,
                    s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                    te.firstname as author_teacher_firstname, te.lastname as author_teacher_lastname,
                    'topic' as forum_type
                    FROM topic_posts tp
                    LEFT JOIN topic_threads tt ON tp.threadId = tt.id
                    LEFT JOIN topics t ON tt.topic_id = t.topicid
                    LEFT JOIN students s ON tp.author_studentid = s.id
                    LEFT JOIN teachers te ON tp.author_teacherid = te.id
                    WHERE tp.body ILIKE '%$searchTerm%' AND tp.isDeleted = false
                    ORDER BY tp.createdAt DESC";
            $results['topicPosts'] = fetch_multiple($sql);
        }

        if (!$forumType || $forumType === 'course') {
            $sql = "SELECT cfp.*, cft.title as thread_title, c.course as course_title,
                    s.firstname as author_student_firstname, s.lastname as author_student_lastname,
                    te.firstname as author_teacher_firstname, te.lastname as author_teacher_lastname,
                    'course' as forum_type
                    FROM course_forum_posts cfp
                    LEFT JOIN course_forum_threads cft ON cfp.threadId = cft.id
                    LEFT JOIN courses c ON cft.courseid = c.id
                    LEFT JOIN students s ON cfp.author_studentid = s.id
                    LEFT JOIN teachers te ON cfp.author_teacherid = te.id
                    WHERE cfp.body ILIKE '%$searchTerm%' AND cfp.isDeleted = false
                    ORDER BY cfp.createdAt DESC";
            $results['courseForumPosts'] = fetch_multiple($sql);
        }

        exit_with_success($results);
    }

    function get_user_forum_activity($userId, $accountType){
        $userIdField = $accountType == 0 ? 'author_studentid' : 'author_teacherid';
        $results = [];

        // Topic posts
        $sql = "SELECT tp.*, tt.title as thread_title, t.title as topic_title, 'topic' as forum_type
                FROM topic_posts tp
                LEFT JOIN topic_threads tt ON tp.threadId = tt.id
                LEFT JOIN topics t ON tt.topic_id = t.topicid
                WHERE tp.$userIdField = '$userId' AND tp.isDeleted = false
                ORDER BY tp.createdAt DESC";
        $results['topicPosts'] = fetch_multiple($sql);

        // Course forum posts
        $sql = "SELECT cfp.*, cft.title as thread_title, c.course as course_title, 'course' as forum_type
                FROM course_forum_posts cfp
                LEFT JOIN course_forum_threads cft ON cfp.threadId = cft.id
                LEFT JOIN courses c ON cft.courseid = c.id
                WHERE cfp.$userIdField = '$userId' AND cfp.isDeleted = false
                ORDER BY cfp.createdAt DESC";
        $results['courseForumPosts'] = fetch_multiple($sql);

        exit_with_success($results);
    }
?>
