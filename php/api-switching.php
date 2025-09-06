<?php

if(isset($_POST["API_KEY"])){
    if($API_KEY != $_POST["API_KEY"] ){
        server_api_error();
    }
}else{
    server_api_error();
}

if(isset($_POST["Method"])){
$method = $_POST["Method"];
}else{
    server_api_error();
}

switch($method){
    case "login":
        if(!isset($_POST['Username']) || !isset($_POST['Password'])){
            
            server_api_error();
            
        }
        $postObject = (object) [
            'username' => clean($_POST['Username']),
            'password' => clean($_POST['Password']),
        ];
        login($postObject);
        break;
    case "loginAgent":
        if(!isset($_POST['Username']) || !isset($_POST['Password'])){
            
            server_api_error();
            
        }
        $postObject = (object) [
            'username' => clean($_POST['Username']),
            'password' => clean($_POST['Password']),
        ];
        loginAgent($postObject);
        break;
    case "loginAdmin":
        if(!isset($_POST['Email']) || !isset($_POST['Password'])){
            
            server_api_error();
            
        }
        $postObject = (object) [
            'email' => clean($_POST['Email']),
            'password' => clean($_POST['Password']),
        ];
        loginAdmin($postObject);
        break;
    case "register":
        if(!isset($_POST['Username']) || !isset($_POST['Password'])
            || !isset($_POST['Firstname']) || !isset($_POST['Lastname']) 
                || !isset($_POST['AccountType'])
        ){
            server_api_error();
        }
        $postObject = (object) [
            'username' => clean($_POST['Username']),
            'password' => clean($_POST['Password']),
            'firstname' => clean($_POST['Firstname']),
            'lastname' => clean($_POST['Lastname']),
            'accountType' => clean($_POST['AccountType']),
        ];
        register($postObject);
        break;
    case "enroll":
        if(!isset($_POST['StudentID']) || !isset($_POST['LanguageID'])){
            server_api_error();
        }
        $postObject = (object) [
            'studentID' => clean($_POST['StudentID']),
            'languageID' => clean($_POST['LanguageID'])
        ];
        enroll($postObject);
        break;
    case "apply":
        if(!isset($_POST['TeacherID']) || !isset($_POST['LanguageID'])){
            server_api_error();
        }
        $postObject = (object) [
            'teacherID' => clean($_POST['TeacherID']),
            'languageID' => clean($_POST['LanguageID'])
        ];
        apply($postObject);
        break;
    case "take_lesson":
        if(!isset($_POST['StudentID']) || !isset($_POST['LessonID'])){
            server_api_error();
        }
        $postObject = (object) [
            'studentID' => $_POST['StudentID'],
            'lessonID' => $_POST['LessonID'],
        ];
        take_lesson($postObject);
        break;
    case 'create_lesson':
        if(check_inputs([
            'CourseID','Title'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            "CourseID" => $_POST['CourseID'],
            "Title" => $_POST['Title'],
        ];
        // optional
        append_inputs_if_exists($postObject, 
            ['Details', 'File', 'Video','Audio','Image']
        );
        create_lesson($postObject);
        break;
    case 'create_assessment':
        if(check_inputs([
            'CourseID','Assessment','Type', 'Description','TotalPoints'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            "CourseID" => $_POST['CourseID'],
            "Assessment" => $_POST['Assessment'],
            "Type" => $_POST['Type'],
            "Description" => $_POST['Description'],
            "TotalPoints" => $_POST['TotalPoints'],
        ];
        create_assessment($postObject);
        break;
    case "get_student_courses":
        if(!isset($_POST['StudentID'])){
            server_api_error();
        }
        $id = $_POST['StudentID'];
        get_student_courses($id);
        break;
    case "get_teacher_courses":
        if(!isset($_POST['TeacherID'])){
            server_api_error();
        }
        $id = $_POST['TeacherID'];
        get_teacher_courses($id);
        break;

    case "get_lessons":
        if(!isset($_POST['CourseID'])){
            server_api_error();
        }
        $id = $_POST['CourseID'];
        get_lessons($id);
        break;

    case 'get_lesson_progress':
        if(!isset($_POST['StudentID']) || !isset($_POST['LessonID'])){
            server_api_error();
        }
        $postObject = (object) [
            'studentID' => $_POST['StudentID'],
            'lessonID' => $_POST['LessonID'],
        ];
        get_lesson_progress($postObject);
        break;
    case 'get_assessments':
        if(check_inputs([
            'CourseID'
        ])){
            server_api_error();
        }

        $id = $_POST['CourseID'];
        get_assessments($id);
        break;
    case 'update_lesson_progress':
        if(!isset($_POST['StudentID']) || !isset($_POST['LessonID']) || 
            !isset($_POST['Progress'])
        ){
            server_api_error();
        }
        $postObject = (object) [
            'studentID' => $_POST['StudentID'],
            'lessonID' => $_POST['LessonID'],
            'progress' => $_POST['Progress'],
        ];
        update_lesson_progress($postObject);
        break;
    /* NEW METHODS */
    case "add_assessment_item":
        if(!check_inputs([
            'AssessmentID', 'Item', 'Question', 'Choices','Answer', 'ID'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'AssessmentID' =>  clean($_POST['AssessmentID']),
            'Item' =>  clean($_POST['Item']),
            'Question' =>  clean($_POST['Question']),
            'Choices' =>  clean($_POST['Choices']),
            'Answer' =>  clean($_POST['Answer']),
        ];
        add_assessment_item($postObject);
        break;
    case "update_assessment_item":
        if(!check_inputs([
            'AssessmentID', 'Item', 'Question', 'Choices','Answer', 'ID'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'AssessmentID' =>  clean($_POST['AssessmentID']),
            'Item' =>  clean($_POST['Item']),
            'Question' =>  clean($_POST['Question']),
            'Choices' =>  clean($_POST['Choices']),
            'Answer' =>  clean($_POST['Answer']),
        ];
        update_assessment_item($postObject);
        break;
    case "remove_assessment_item":
        if(!check_inputs([
            'AssessmentID'
        ])){
            server_api_error();
        }
        $id = $_POST['AssessmentID'];
        remove_assessment_item($id);
        break;
    case "count_assessment_item":
        if(!check_inputs([
            'AssessmentID'
        ])){
            server_api_error();
        }
        $id = $_POST['AssessmentID'];
        count_assessment_items($id);
        break;
    
    case "get_student_proficiency_chart":
        if(!check_inputs([
            'StudentID', 'LanguageID'
        ])){
            server_api_error();
        }
        $id = $_POST['StudentID'];
        get_student_proficiency_chart($id);
        break;
    case "get_student_proficiency":
        if(!check_inputs([
            'StudentID', 'LanguageID'
        ])){
            server_api_error();
        }
        $id = $_POST['StudentID'];
        get_student_proficiency($id);
        break;
    case 'create_profieciency_stamp':
        if(!check_inputs([
            'StudentID', 'LanguageID', 'Type',
            'LPoints', 'SPoints', 'RPoints', 
            'Listens', 'Speaks', 'Reads'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'StudentID' => $_POST['StudentID'],
            'CourseID' => $_POST['CourseID'],
            'Type' => $_POST['Type'],
            'LPoints' => $_POST['LPoints'],
            'SPoints' => $_POST['SPoints'],
            'RPoints' => $_POST['RPoints'],
            'Listens' => $_POST['Listens'],
            'Speaks' => $_POST['Speaks'],
            'Reads' => $_POST['Reads'],
        ];
        create_profieciency_stamp($postObject);
        break;
    case 'create_course':
        if(!check_inputs([
            'TeacherID', 'LanguageID', 'Course', 'Difficulty'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'TeacherID' => $_POST['TeacherID'],
            'LanguageID' => $_PfOST['LanguageID'],
            'Course' => $_POST['Course'],
            'Difficulty' => $_POST['Difficulty']
        ];

        append_inputs_if_exists($postObject, 
            ['Image']
        );
        create_course($postObject);
        break;
    case "get_courses":
        $postObject = (object)[];
        append_inputs_if_exists($postObject,[
            'Limit', 'Filter'
        ]);
        get_courses($postObject);
        break;
    case 'start_meeting':
        if(!check_inputs([
            'TeacherID', 'ClassID', 'MeetingCode'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'TeacherID' => $_POST['TeacherID'],
            'ClassID' => $_POST['ClassID'],
            'MeetingCode' => $_POST['MeetingCode'],
        ];
        start_meeting($postObject);
        break;
    case 'get_meeting':
        if(!check_inputs([
            'StudentID'
        ])){
            server_api_error();
        }
        $id =  $_POST['StudentID'];

        get_meeting($id);
        break;
    case 'end_meeting':
        if(!check_inputs([
            'TeacherID'
        ])){
            server_api_error();
        }
        $id =  $_POST['TeacherID'];
        end_meeting($id);
        break;
    case 'check_if_enrolled':
        if(!check_inputs([
            'StudentID', 'CourseID'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'StudentID' => $_POST['StudentID'],
            'CourseID' => $_POST['CourseID']
        ];
        check_if_enrolled($postObject);
        break;
    case "get_classes":
        if(!check_inputs([
            'TeacherID', 'CourseID'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'TeacherID' => $_POST['TeacherID'],
            'CourseID' => $_POST['CourseID']
        ];
        get_classes($postObject);
        break;
    case "create_class":
        if(!check_inputs([
            'CourseID', 'Class', 'ClassCode',
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'CourseID' => $_POST['CourseID'],
            'Class' => $_POST['Class'],
            'ClassCode' => $_POST['ClassCode']
        ];
        create_class($postObject);
        break;



        
    case 'create_entry':
        
        if(!check_inputs([
            'data',
        ])){
            server_api_error();
        }
        try{
            $data = json_decode($_POST['data']);
            $tables = $data->tables;
            $values = $data->values;
        }catch(Exception $e){
            server_api_error();
        }
        
        create_entry($tables,$values);
        break;
    case 'update_entry':
        if(!check_inputs([
            'data',
        ])){
            server_api_error();
        }
        try{
            $data = json_decode($_POST['data']);
            $tables = $data->tables;
            $values = $data->values;
            $conditions = "";
            if($data->conditions != null){
                if($data->conditions->WHERE != null){
                    $conditions .= "WHERE ";
                    $wheres = $data->conditions->WHERE;
                    $keys = array_keys((array) $wheres);
                    $i = 0;
                    foreach($keys as $key){
                        if($i != 0){
                            $conditions .= "AND ";
                        }
                        // if(trim($wheres->$key) == "" && is_string($wheres->$key)){
                        //     server_api_error();
                        // } 
                        if((str_contains($wheres->$key, '.')) && !str_contains($key,'[dot]')){
                            $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                        }else if(is_bool($wheres->$key)){
                            if(trim($wheres->$key) == ""){
                                $wheres->$key = 'FALSE';
                            }else{
                                $wheres->$key = 'TRUE';
                            }
                            $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                        }else{
                            $conditions .= str_replace_first('[dot]','', $key)." = '".$wheres->$key."' ";
                        }
                        $i+=1;
                    }
                }
            }
        }catch(Exception $e){
            server_api_error();
        }
        update_entry($tables,$values,$conditions);
        break;
    case 'delete_entry':
        try{
            $data = json_decode($_POST['data']);
            $tables = $data->tables;
            $conditions = "";
            if($data->conditions != null){
                if($data->conditions->WHERE != null){
                    $conditions .= "WHERE ";
                    $wheres = $data->conditions->WHERE;
                    $keys = array_keys((array) $wheres);
                    $i = 0;
                    foreach($keys as $key){
                        if($i != 0){
                            $conditions .= "AND ";
                        }
                        // if(trim($wheres->$key) == "" && is_string($wheres->$key)){
                        //     server_api_error();
                        // } 
                        
                        if((str_contains($wheres->$key, '.')) && !str_contains($key,'[dot]')){
                            $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                        }else if(is_bool($wheres->$key)){
                            if(trim($wheres->$key) == ""){
                                $wheres->$key = 'FALSE';
                            }else{
                                $wheres->$key = 'TRUE';
                            }
                            $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                        }else{
                            $conditions .= str_replace_first('[dot]','', $key)." = '".$wheres->$key."' ";
                        }
                        $i+=1;
                    }
                }
            }
        }catch(Exception $e){
            server_api_error();
        }
        delete_entry($tables, $conditions);
        break;
    case 'get_entries':
        try{
            $data = json_decode($_POST['data']);
            $selectors = '';
            if(count($data->selectors)<=0){

                server_api_error();
            }
            $i = 0;
            foreach($data->selectors as $selector){
                if($i != 0){
                    $selectors .= ", ";
                }
                $selectors .= $selector." ";
                $i+=1;
            }
            $tables = $data->tables;
            $conditions = "";
            if($data->conditions != null){
                $conditionKeys = array_keys((array) $data->conditions);
                foreach($conditionKeys as $conditionKey){
                    if($conditionKey == "WHERE"){
                        $conditions .= "WHERE ";
                        $wheres = $data->conditions->WHERE;
                        $keys = array_keys((array) $wheres);
                        $i = 0;
                        foreach($keys as $key){
                            if($i != 0){
                                $conditions .= "AND ";
                            }
//                            if(trim($wheres->$key) == "" && is_string($wheres->$key)){
 //                               server_api_error();
  //                          } 
                            if((str_contains($wheres->$key, '.')) && !str_contains($key,'[dot]')){
                                $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                                
                            }else if(is_bool($wheres->$key)){
                                if(trim($wheres->$key) == ""){
                                    $wheres->$key = 'FALSE';
                                }else{
                                    $wheres->$key = 'TRUE';
                                }
                                $conditions .= str_replace('.', '.',$key)." = ".str_replace( '.', '.',$wheres->$key)." ";
                            }else{
                                $conditions .= str_replace_first('[dot]','', $key)." = '".$wheres->$key."' ";
                    
                            }
                            $i+=1;
                        }
                    }else{
                        $conditions .= str_replace('.', '.',$conditionKey)." ".$data->conditions->$conditionKey." ";
                    }
                }   
                
            }
        }catch(Exception $e){
            server_api_error();
        }
        get_entries(str_replace('.', '.',$selectors),$tables, $conditions);
        break;
    case 'save_dictionary':
        if(!check_inputs([
            'search_key', 'dictionary_json'
        ])){
            server_api_error();
        }

        save_dictionary($_POST['search_key'],$_POST['dictionary_json']);
        break;
    case 'save_pronunciation':
        if(!check_inputs([
            'search_key', 'sound_url'
        ])){
            server_api_error();
        }
        save_pronunciation($_POST['search_key'],$_POST['sound_url']);
        break;
    case 'create_url':
        if(!check_inputs([
            'file_content', 'extension'
        ])){
            server_api_error();
        }
        create_url($_POST['file_content'], $_POST['extension']);
        break;
    case 'delete_url':
        if(!check_inputs([
            'filename'
        ])){
            server_api_error();
        }
        create_url($_POST['filename']);
        break;

    // ===========================
    // FORUM SYSTEM API ROUTES
    // ===========================

    // Topic Threads
    case 'create_topic_thread':
        if(!check_inputs([
            'topic_id', 'title'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'topic_id' => clean($_POST['topic_id']),
            'title' => clean($_POST['title'])
        ];
        append_inputs_if_exists($postObject, ['body', 'isPinned', 'isLocked']);
        create_topic_thread($postObject);
        break;

    case 'get_topic_threads':
        if(!check_inputs(['topic_id'])){
            server_api_error();
        }
        $topicId = clean($_POST['topic_id']);
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : null;
        get_topic_threads($topicId, $limit);
        break;

    case 'get_topic_thread_by_id':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        get_topic_thread_by_id($threadId);
        break;

    case 'update_topic_thread':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        $postObject = (object) [];
        append_inputs_if_exists($postObject, ['title', 'body', 'isPinned', 'isLocked']);
        update_topic_thread($threadId, $postObject);
        break;

    case 'delete_topic_thread':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        delete_topic_thread($threadId);
        break;

    // Topic Posts
    case 'create_topic_post':
        if(!check_inputs([
            'threadId', 'body'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'threadId' => intval($_POST['threadId']),
            'body' => clean($_POST['body'])
        ];
        append_inputs_if_exists($postObject, ['parentPostId', 'author_studentid', 'author_teacherid']);
        create_topic_post($postObject);
        break;

    case 'get_topic_posts':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = intval($_POST['thread_id']);
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : null;
        get_topic_posts($threadId, $limit);
        break;

    case 'get_topic_post_by_id':
        if(!check_inputs(['post_id'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        get_topic_post_by_id($postId);
        break;

    case 'update_topic_post':
        if(!check_inputs(['post_id', 'body'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        $postObject = (object) ['body' => clean($_POST['body'])];
        update_topic_post($postId, $postObject);
        break;

    case 'delete_topic_post':
        if(!check_inputs(['post_id'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        delete_topic_post($postId);
        break;

    case 'get_topic_post_replies':
        if(!check_inputs(['parent_post_id'])){
            server_api_error();
        }
        $parentPostId = intval($_POST['parent_post_id']);
        get_topic_post_replies($parentPostId);
        break;

    // Course Forum Threads
    case 'create_course_forum_thread':
        if(!check_inputs([
            'courseid', 'title'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'courseid' => clean($_POST['courseid']),
            'title' => clean($_POST['title'])
        ];
        append_inputs_if_exists($postObject, ['body', 'isLocked']);
        create_course_forum_thread($postObject);
        break;

    case 'get_course_forum_threads':
        if(!check_inputs(['courseId'])){
            server_api_error();
        }
        $courseId = clean($_POST['courseId']);
        get_course_forum_threads($courseId);
        break;

    case 'get_course_forum_thread_by_id':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        get_course_forum_thread_by_id($threadId);
        break;

    case 'update_course_forum_thread':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        $postObject = (object) [];
        append_inputs_if_exists($postObject, ['title', 'body', 'isLocked']);
        update_course_forum_thread($threadId, $postObject);
        break;

    case 'delete_course_forum_thread':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        delete_course_forum_thread($threadId);
        break;

    // Course Forum Posts
    case 'create_course_forum_post':
        if(!check_inputs([
            'threadId', 'body'
        ])){
            server_api_error();
        }
        $postObject = (object) [
            'threadId' => intval($_POST['threadId']),
            'body' => clean($_POST['body'])
        ];
        append_inputs_if_exists($postObject, ['parentPostId', 'author_studentid', 'author_teacherid']);
        create_course_forum_post($postObject);
        break;

    case 'get_course_forum_posts':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = intval($_POST['thread_id']);
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : null;
        get_course_forum_posts($threadId, $limit);
        break;

    case 'get_course_forum_post_by_id':
        if(!check_inputs(['post_id'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        get_course_forum_post_by_id($postId);
        break;

    case 'update_course_forum_post':
        if(!check_inputs(['post_id', 'body'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        $postObject = (object) ['body' => clean($_POST['body'])];
        update_course_forum_post($postId, $postObject);
        break;

    case 'delete_course_forum_post':
        if(!check_inputs(['post_id'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        delete_course_forum_post($postId);
        break;

    case 'get_course_forum_post_replies':
        if(!check_inputs(['parent_post_id'])){
            server_api_error();
        }
        $parentPostId = intval($_POST['parent_post_id']);
        get_course_forum_post_replies($parentPostId);
        break;

    // Forum Utility Functions
    case 'get_teacher_classes_for_forum':
        if(!check_inputs(['teacher_id'])){
            server_api_error();
        }
        $teacherId = clean($_POST['teacher_id']);
        get_teacher_classes_for_forum($teacherId);
        break;

    case 'get_student_classes_for_forum':
        if(!check_inputs(['student_id'])){
            server_api_error();
        }
        $studentId = clean($_POST['student_id']);
        get_student_classes_for_forum($studentId);
        break;

    case 'search_forum_posts':
        if(!check_inputs(['search_term'])){
            server_api_error();
        }
        $searchTerm = clean($_POST['search_term']);
        $forumType = isset($_POST['forum_type']) ? clean($_POST['forum_type']) : null;
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : null;
        search_forum_posts($searchTerm, $forumType, $limit);
        break;

    case 'get_user_forum_activity':
        if(!check_inputs(['user_id', 'account_type'])){
            server_api_error();
        }
        $userId = clean($_POST['user_id']);
        $accountType = intval($_POST['account_type']);
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : null;
        get_user_forum_activity($userId, $accountType, $limit);
        break;

    // Get classes for forum with thread counts
    case 'get_teacher_classes_for_forum':
        if(!check_inputs(['teacher_id'])){
            server_api_error();
        }
        $teacherId = clean($_POST['teacher_id']);
        get_teacher_classes_for_forum($teacherId);
        break;

    case 'get_student_classes_for_forum':
        if(!check_inputs(['student_id'])){
            server_api_error();
        }
        $studentId = clean($_POST['student_id']);
        get_student_classes_for_forum($studentId);
        break;

    // Thread and post deletion
    case 'delete_forum_thread':
        if(!check_inputs(['thread_id'])){
            server_api_error();
        }
        $threadId = clean($_POST['thread_id']);
        delete_forum_thread($threadId);
        break;

    case 'delete_forum_post':
        if(!check_inputs(['post_id'])){
            server_api_error();
        }
        $postId = clean($_POST['post_id']);
        delete_forum_post($postId);
        break;

    // Test function for debugging forum tables
    case 'test_forum_tables':
        test_forum_tables();
        break;

    default:
        server_api_error();
}

die();
