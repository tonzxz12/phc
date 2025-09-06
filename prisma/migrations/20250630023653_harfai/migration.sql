-- CreateTable
CREATE TABLE "admin_options" (
    "type" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "admin_options_pkey" PRIMARY KEY ("type")
);

-- CreateTable
CREATE TABLE "administrators" (
    "id" VARCHAR(32) NOT NULL,
    "firstname" VARCHAR(50) NOT NULL,
    "lastname" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "role" VARCHAR(255) DEFAULT 'Admin',
    "password" VARCHAR(255) NOT NULL,
    "profile" VARCHAR(255),
    "esign" VARCHAR(255),
    "lastseen" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "departmentid" VARCHAR(50),
    "studentid" VARCHAR(32),

    CONSTRAINT "administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_items" (
    "assessmentid" VARCHAR(32) NOT NULL,
    "question" VARCHAR(255) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "answer" TEXT NOT NULL,
    "options" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_tasks_taken" (
    "studentid" VARCHAR(32) NOT NULL,
    "assessmentid" VARCHAR(32) NOT NULL,
    "takenpoints" REAL NOT NULL,
    "datetaken" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "assessment_tasks_taken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "courseid" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "timelimit" REAL NOT NULL DEFAULT 60,
    "deadline" VARCHAR(255) NOT NULL,
    "attachments" TEXT,
    "settings" VARCHAR(255),
    "id" VARCHAR(32) NOT NULL,
    "time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lessonid" INTEGER,
    "topicid" INTEGER,
    "classid" INTEGER,
    "pretest" BOOLEAN,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "courseid" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "deadline" VARCHAR(255) NOT NULL,
    "attachments" TEXT,
    "time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "classid" INTEGER,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "topicid" VARCHAR(32) NOT NULL,
    "attachment" TEXT NOT NULL,
    "type" VARCHAR(15),
    "timestamp" INTEGER DEFAULT 0,
    "quiz_id" VARCHAR(32),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" INTEGER NOT NULL,
    "audio_file" VARCHAR(255) NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "courseid" VARCHAR(32) NOT NULL,
    "class" VARCHAR(255) NOT NULL,
    "classcode" VARCHAR(30) NOT NULL,
    "schedule" VARCHAR(255) NOT NULL,
    "autoaccepts" BOOLEAN NOT NULL DEFAULT true,
    "id" SERIAL NOT NULL,
    "duration" INTEGER,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "teacherid" VARCHAR(32) NOT NULL,
    "languageid" INTEGER NOT NULL,
    "course" VARCHAR(255) NOT NULL,
    "difficulty" REAL NOT NULL,
    "id" VARCHAR(32) NOT NULL,
    "details" TEXT,
    "filter" VARCHAR(255),
    "image" VARCHAR(255),
    "objectives" TEXT,
    "target_audience" TEXT[],
    "technical_requirements" TEXT[],
    "pretest" BOOLEAN DEFAULT false,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "senderid" VARCHAR(32) NOT NULL,
    "interest" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_meetings" (
    "labid" INTEGER NOT NULL,
    "teacherid" VARCHAR(32) NOT NULL,
    "meetingcode" VARCHAR(100) NOT NULL,
    "participants" REAL NOT NULL DEFAULT 1,
    "starttime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endtime" TIMESTAMP(6),
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "lab_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "language" VARCHAR(50) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "courseid" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "attachments" TEXT,
    "difficulty" REAL NOT NULL DEFAULT 3,
    "background" VARCHAR(255),
    "time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons_taken" (
    "studentid" VARCHAR(32) NOT NULL,
    "lessonid" INTEGER NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0.0,
    "starttime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endtime" TIMESTAMP(6),
    "id" SERIAL NOT NULL,

    CONSTRAINT "lessons_taken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "classid" INTEGER NOT NULL,
    "teacherid" VARCHAR(32) NOT NULL,
    "meetingcode" VARCHAR(100) NOT NULL,
    "participants" REAL NOT NULL DEFAULT 1,
    "starttime" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endtime" TIMESTAMP(6),
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "senderid" VARCHAR(32) NOT NULL,
    "recipientid" VARCHAR(32) NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(30) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "senderid" VARCHAR(32) NOT NULL,
    "recipientid" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR(255) NOT NULL DEFAULT 'notif',
    "status" VARCHAR(30) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_tasks" (
    "practiceid" INTEGER NOT NULL,
    "task" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "totalpoints" REAL NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "practice_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_tasks_taken" (
    "studentid" VARCHAR(32) NOT NULL,
    "taskid" INTEGER NOT NULL,
    "takenpoints" REAL NOT NULL,
    "datetaken" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "practice_tasks_taken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practices" (
    "languageid" INTEGER NOT NULL,
    "practice" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proficiency_stamp" (
    "studentid" VARCHAR(32) NOT NULL,
    "languageid" INTEGER NOT NULL,
    "spoints" REAL NOT NULL DEFAULT 0.0,
    "lpoints" REAL NOT NULL DEFAULT 0.0,
    "rpoints" REAL NOT NULL DEFAULT 0.0,
    "speaks" REAL NOT NULL DEFAULT 0.0,
    "listens" REAL NOT NULL DEFAULT 0.0,
    "reads" REAL NOT NULL DEFAULT 0.0,
    "id" SERIAL NOT NULL,
    "stamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proficiency_stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_attachments" (
    "student_id" VARCHAR(32) NOT NULL,
    "attachment_id" INTEGER NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "id" SERIAL NOT NULL,

    CONSTRAINT "read_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "read_topics" (
    "id" SERIAL NOT NULL,
    "student_id" VARCHAR(32) NOT NULL,
    "topic_id" VARCHAR(32) NOT NULL,
    "is_finished" BOOLEAN DEFAULT false,
    "finished_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "read_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_speech_analyzer" (
    "id" SERIAL NOT NULL,
    "audio_id" INTEGER NOT NULL,
    "fluency" INTEGER,
    "pronunciation" INTEGER,
    "intonation" INTEGER,
    "grammar" INTEGER,
    "vocabulary" INTEGER,
    "areas_for_improvement" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "speech_analyer_items_id" INTEGER,

    CONSTRAINT "result_speech_analyzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_analyzer_items" (
    "id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "sentence" TEXT,

    CONSTRAINT "speech_analyzer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_attendance" (
    "studentid" VARCHAR(32) NOT NULL,
    "meetingid" VARCHAR(32) NOT NULL,
    "timein" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "speech_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_drills" (
    "practiceid" VARCHAR(32) NOT NULL,
    "drillfile" TEXT NOT NULL,
    "description" TEXT DEFAULT 'Default Description',
    "audiofile" TEXT NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "speech_drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_lab_computers" (
    "labid" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "speech_lab_computers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_labs" (
    "name" VARCHAR(255) NOT NULL,
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "class_id" INTEGER NOT NULL DEFAULT 12,

    CONSTRAINT "speech_labs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_lessons" (
    "moduleid" VARCHAR(32) NOT NULL,
    "description" TEXT DEFAULT 'Default Description',
    "lessonfile" TEXT NOT NULL,
    "quizfile" TEXT NOT NULL,
    "lessontype" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "speech_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_modules" (
    "name" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "speech_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_practices" (
    "name" VARCHAR(255) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" VARCHAR(32) NOT NULL,

    CONSTRAINT "speech_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speech_quizzes" (
    "lessonid" VARCHAR(32) NOT NULL,
    "studentid" VARCHAR(32) NOT NULL,
    "takenpoints" REAL NOT NULL,
    "totalpoints" REAL NOT NULL DEFAULT 10,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "speech_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assessments" (
    "assessmentid" VARCHAR(32) NOT NULL,
    "studentid" VARCHAR(32) NOT NULL,
    "takenpoints" REAL NOT NULL,
    "totalpoints" REAL NOT NULL DEFAULT 10,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "student_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assignments" (
    "assignmentid" INTEGER NOT NULL,
    "studentid" VARCHAR(32) NOT NULL,
    "attachments" VARCHAR(255) NOT NULL,
    "comments" TEXT,
    "grade" VARCHAR(255),
    "time" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "student_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "studentid" VARCHAR(32) NOT NULL,
    "classid" INTEGER NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "id" SERIAL NOT NULL,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_practice_attempts" (
    "studentpracticeid" INTEGER NOT NULL,
    "currentlevel" REAL NOT NULL,
    "takenpoints" REAL NOT NULL,
    "totalpoints" REAL NOT NULL DEFAULT 10,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "student_practice_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_practices" (
    "studentid" VARCHAR(32) NOT NULL,
    "languageid" INTEGER NOT NULL,
    "write" REAL NOT NULL DEFAULT 1,
    "read" REAL NOT NULL DEFAULT 1,
    "listen" REAL NOT NULL DEFAULT 1,
    "speak" REAL NOT NULL DEFAULT 1,
    "id" SERIAL NOT NULL,

    CONSTRAINT "student_practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" VARCHAR(32) NOT NULL,
    "firstname" VARCHAR(50) NOT NULL,
    "lastname" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "profile" VARCHAR(255),
    "address" VARCHAR(255) NOT NULL,
    "nationality" VARCHAR(100) NOT NULL,
    "birthdate" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "visibleid" VARCHAR(24) DEFAULT 'Q-6431-304442',
    "timeenrolled" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "lastseen" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "departmentid" VARCHAR(50),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_items" (
    "surveyid" INTEGER NOT NULL,
    "itemno" INTEGER NOT NULL,
    "question" VARCHAR(255) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "answer" TEXT NOT NULL,
    "options" TEXT,
    "id" SERIAL NOT NULL,

    CONSTRAINT "survey_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "studentid" VARCHAR(32) NOT NULL,
    "courseid" VARCHAR(32) NOT NULL,
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" VARCHAR(32) NOT NULL,
    "firstname" VARCHAR(50) NOT NULL,
    "lastname" VARCHAR(50) NOT NULL,
    "email" VARCHAR(100),
    "password" VARCHAR(255) NOT NULL,
    "job" VARCHAR(255) NOT NULL,
    "profile" VARCHAR(255),
    "esign" VARCHAR(255),
    "visibleid" VARCHAR(24) DEFAULT 'Q-6431-304442',
    "lastseen" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "departmentid" VARCHAR(50),

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "lessonid" INTEGER,
    "topicid" VARCHAR(32) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "details" TEXT,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "email" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "firstname" VARCHAR(255),
    "lastname" VARCHAR(255),
    "departmentid" VARCHAR(50),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "word_searches" (
    "id" SERIAL NOT NULL,
    "search" VARCHAR(255) NOT NULL,
    "file" TEXT,

    CONSTRAINT "word_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "campus" VARCHAR(50),
    "createdat" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "code" VARCHAR(50) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_topicid_key" ON "topics"("topicid");

-- CreateIndex
CREATE UNIQUE INDEX "uk_departments_code" ON "departments"("code");

-- AddForeignKey
ALTER TABLE "administrators" ADD CONSTRAINT "fk_administrators_department" FOREIGN KEY ("departmentid") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "administrators" ADD CONSTRAINT "fk_administrators_student" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_assessmentid_fkey" FOREIGN KEY ("assessmentid") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_tasks_taken" ADD CONSTRAINT "assessment_tasks_taken_assessmentid_fkey" FOREIGN KEY ("assessmentid") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessment_tasks_taken" ADD CONSTRAINT "assessment_tasks_taken_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_classid_fkey" FOREIGN KEY ("classid") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lessonid_fkey" FOREIGN KEY ("lessonid") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_topicid_fkey" FOREIGN KEY ("topicid") REFERENCES "topics"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_classid_fkey" FOREIGN KEY ("classid") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_topicid_fkey" FOREIGN KEY ("topicid") REFERENCES "topics"("topicid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_languageid_fkey" FOREIGN KEY ("languageid") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacherid_fkey" FOREIGN KEY ("teacherid") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lab_meetings" ADD CONSTRAINT "lab_meetings_labid_fkey" FOREIGN KEY ("labid") REFERENCES "speech_labs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lab_meetings" ADD CONSTRAINT "lab_meetings_teacherid_fkey" FOREIGN KEY ("teacherid") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons_taken" ADD CONSTRAINT "lessons_taken_lessonid_fkey" FOREIGN KEY ("lessonid") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons_taken" ADD CONSTRAINT "lessons_taken_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_classid_fkey" FOREIGN KEY ("classid") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_teacherid_fkey" FOREIGN KEY ("teacherid") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_tasks" ADD CONSTRAINT "practice_tasks_practiceid_fkey" FOREIGN KEY ("practiceid") REFERENCES "practices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_tasks_taken" ADD CONSTRAINT "practice_tasks_taken_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practice_tasks_taken" ADD CONSTRAINT "practice_tasks_taken_taskid_fkey" FOREIGN KEY ("taskid") REFERENCES "practice_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "practices" ADD CONSTRAINT "practices_languageid_fkey" FOREIGN KEY ("languageid") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proficiency_stamp" ADD CONSTRAINT "proficiency_stamp_languageid_fkey" FOREIGN KEY ("languageid") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "proficiency_stamp" ADD CONSTRAINT "proficiency_stamp_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_attachments" ADD CONSTRAINT "read_attachments_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_attachments" ADD CONSTRAINT "read_attachments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_topics" ADD CONSTRAINT "read_topics_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "read_topics" ADD CONSTRAINT "read_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("topicid") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "result_speech_analyzer" ADD CONSTRAINT "result_speech_analyzer_audio_id_fkey" FOREIGN KEY ("audio_id") REFERENCES "audio_files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "result_speech_analyzer" ADD CONSTRAINT "result_speech_analyzer_speech_analyer_items_id_fkey" FOREIGN KEY ("speech_analyer_items_id") REFERENCES "speech_analyzer_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_analyzer_items" ADD CONSTRAINT "speech_analyzer_items_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_attendance" ADD CONSTRAINT "speech_attendance_meetingid_fkey" FOREIGN KEY ("meetingid") REFERENCES "lab_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_attendance" ADD CONSTRAINT "speech_attendance_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_drills" ADD CONSTRAINT "speech_drills_practiceid_fkey" FOREIGN KEY ("practiceid") REFERENCES "speech_practices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_lab_computers" ADD CONSTRAINT "speech_lab_computers_labid_fkey" FOREIGN KEY ("labid") REFERENCES "speech_labs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_labs" ADD CONSTRAINT "fk_speech_labs_class_id" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_lessons" ADD CONSTRAINT "speech_lessons_moduleid_fkey" FOREIGN KEY ("moduleid") REFERENCES "speech_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_quizzes" ADD CONSTRAINT "speech_quizzes_lessonid_fkey" FOREIGN KEY ("lessonid") REFERENCES "speech_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "speech_quizzes" ADD CONSTRAINT "speech_quizzes_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_assessmentid_fkey" FOREIGN KEY ("assessmentid") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_assignmentid_fkey" FOREIGN KEY ("assignmentid") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_classid_fkey" FOREIGN KEY ("classid") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_practice_attempts" ADD CONSTRAINT "student_practice_attempts_studentpracticeid_fkey" FOREIGN KEY ("studentpracticeid") REFERENCES "student_practices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_practices" ADD CONSTRAINT "student_practices_languageid_fkey" FOREIGN KEY ("languageid") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_practices" ADD CONSTRAINT "student_practices_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "fk_students_department" FOREIGN KEY ("departmentid") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "survey_items" ADD CONSTRAINT "survey_items_surveyid_fkey" FOREIGN KEY ("surveyid") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_courseid_fkey" FOREIGN KEY ("courseid") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_studentid_fkey" FOREIGN KEY ("studentid") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "fk_teachers_department" FOREIGN KEY ("departmentid") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_lessonid_fkey" FOREIGN KEY ("lessonid") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "verification" ADD CONSTRAINT "fk_administrators_department" FOREIGN KEY ("departmentid") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
