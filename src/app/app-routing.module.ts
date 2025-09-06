import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { DashboardComponent } from './shared/components/dashboard-layout/dashboard.component';
import { CoursesComponent } from './components/student/courses/courses.component';
import { PracticeComponent } from './components/student/practice/practice.component';
import { LessonsComponent } from './components/student/lessons/lessons.component';
import { AssessmentComponent } from './unused-components/assessment/assessment.component';
import { AssignmentComponent } from './components/student/assignment/assignment.component';
import { MaterialsComponent } from './components/student/materials/materials.component';
import { PerformanceComponent } from './components/student/performance/performance.component';
import { DictionaryComponent } from './components/dictionary/dictionary.component';
import { LabComponent } from './components/student/lab/lab.component';
import { SelfstudylabComponent } from './components/student/selfstudylab/selfstudylab.component';
import { LabfocusComponent } from './unused-components/labfocus/labfocus.component';
import { HomeComponent } from './components/student/student-dashboard/home.component';
import { QuizPageComponent } from './components/student/quiz-page/quiz-page.component';
import { QuizWritingComponent } from './components/student/quiz-writing/quiz-writing.component';
import { QuizSpeakingComponent } from './components/student/quiz-speaking/quiz-speaking.component';
import { QuanhubComponent } from './components/meet/quanhub.component';
import { VideoZoomComponent } from './unused-components/video-zoom/video-zoom.component';

import { TexttospeechComponent } from './components/texttospeech/texttospeech.component';
import { PortalGuard } from './services/guard/student/portal.guard';
import { LoginGuard } from './services/guard/login/login.guard';
import { LoaderGuard } from './services/guard/loader/loader.guard';
import { ThomeComponent } from './components/teacher/teacher-dashboard/thome.component';
import { TlabComponent } from './unused-components/tlab/tlab.component';
import { QuizAnalyticsComponent } from './components/teacher/quiz-analytics/quiz-analytics.component';
import { ManageclassComponent } from './components/teacher/manageclass/manageclass.component';
import { StudentAandDComponent } from './unused-components/student-aand-d/student-aand-d.component';
import { CommunicationComponent } from './components/teacher/communication/communication.component';
import { TaskManagementComponent } from './components/teacher/task-management/task-management.component';
import { QuizManagementComponent } from './components/teacher/quiz-management/quiz-management.component';
import { GradingPageComponent } from './components/student/grading-page/grading-page.component';
import { TportalGuard } from './services/guard/teacher/tportal.guard';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { UsersPageComponent } from './components/admin/users-page/users-page.component';
import { AdminCourseComponent } from './components/admin/admin-course/admin-course.component';
import { CountComponent } from './components/admin/count/count.component';
import { EditAdmincourseComponent } from './components/admin/edit-admincourse/edit-admincourse.component';
import { ManageCourseComponent } from './components/teacher/managecourse/managecourse.component';
import { QuizGuard } from './services/guard/quiz/quiz.guard';
import { PracticeGuard } from './services/guard/practice/practice.guard';
import { VerificationGuard } from './services/guard/verification/verification.guard';
import { StudentProfileComponent } from './shared/components/user-profile/student-profile.component';
import { VerificationPageComponent } from './unused-components/verification-page/verification-page.component';
import { IntroComponent } from './shared/intro/intro.component';
import { LoaderComponent } from './shared/loader/loader.component';
import { TeacherViewComponent } from './components/teacher/teacher-view/teacher-view.component';
import { TeacherViewGuardGuard } from './services/guard/teacher-view-guard/teacher-view-guard.guard';
import { GradeListComponent } from './components/teacher/grade-list/grade-list.component';
import { LessonPageComponent } from './offlineModules/lesson-page/lesson-page.component';
import { TdashboardComponent } from './speechlab/teacher/teacher-main/tdashboard.component';
import { PracticeContainerComponent } from './speechlab/student/practice/practice-container/practice-container.component';
import { LabContainerComponent } from './speechlab/student/lab/lab-container/lab-container.component';
import { ModuleContainerComponent } from './speechlab/student/module/module-container/module-container.component';
import { LearningModulesComponent } from './speechlab/student/module/learning-modules/learning-modules.component';
import { LabContainerTeacherComponent } from './speechlab/teacher/lab/lab-container-teacher/lab-container-teacher.component';
import { TsdashboardComponent } from './speechlab/student/student-main/tsdashboard.component';
import { Module1Component } from './speechlab/student/module/module1/module1.component';
import { LabVidsComponent } from './speechlab/teacher/lab/lab-vids/lab-vids.component';
import { ModuleParentComponent } from './speechlab/student/module/module-parent/module-parent.component';
import { ModulesComponent } from './components/admin/speechlab/modules/modules.component';
import { Drag1Component } from './speechlab/student/module/drag1/drag1.component';
import { AdashboardComponent } from './components/admin/speechlab/adashboard/adashboard.component';
import { AlabComponent } from './components/admin/speechlab/alab/alab.component';
import { Practice1Component } from './speechlab/student/practice/practice1/practice1.component';
import { DrillsComponent } from './components/admin/speechlab/drills/drills.component';
import {PracticeParentComponent } from './speechlab/student/practice/practice-parent/practice-parent.component'
import { QuizTemplateComponent } from './speechlab/student/module/quiz-template/quiz-template.component';
import { EssayAnalyserComponent } from './unused-components/essay-analyser/essay-analyser.component';
import { SpeechAnalyzerComponent } from './components/speech-analyzer/speech-analyzer.component';
import { RecordSpeechComponent } from './components/speech-analyzer/record-speech/record-speech.component';
import { RecordListComponent } from './components/speech-analyzer/record-list/record-list.component';
import { RecordReportComponent } from './components/speech-analyzer/record-report/record-report.component';
import { SpeechLabGuard } from './services/guard/speechlab/speechlab.guard';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { FlashcardsComponent } from './components/student/flashcards/flashcards.component';
import { adminGuard } from './services/guard/admin/admin.guard';
import { BoardComponent } from './components/teacher/board/board.component';
import { ProgressReportComponent } from './components/teacher/progress-report/progress-report.component';
import { StudentEvaluationComponent } from './components/student/student-evaluation/student-evaluation.component';

// Keep drive-related imports for future use (files remain intact)
import { LandingComponent } from './components/landing/landing.component';
import { LmsLoginComponent } from './components/auth/lms-login/lms-login.component';
import { Loginv2Component } from './components/auth/loginv2/loginv2.component';
import { DriveLoginComponent } from './components/auth/drive-login/drive-login.component';
import { ModernLoginComponent } from './components/auth/modern-login/modern-login.component';
import { DriveDashboardComponent } from './components/drive/drive-dashboard/drive-dashboard.component';
import { DriveGuard } from './services/guard/drive/drive.guard';

// QR Enrollment imports
import { QrEnrollmentComponent } from './components/student/qr-enrollment/qr-enrollment.component';
import { QrEnrollmentGuard } from './services/guard/qr-enrollment/qr-enrollment.guard';

// Communication imports
import { TopicThreadsComponent } from './components/communication/topic-threads/topic-threads.component';
import { CourseForumComponent } from './components/communication/course-forum/course-forum.component';
import { ThreadDetailComponent } from './components/communication/thread-detail/thread-detail.component';
import { DiscussionsComponent } from './components/student/discussions/discussions.component';
import { TeacherDiscussionsComponent } from './components/teacher/discussions/discussions.component';
import { StudentPerformanceComponent } from './components/teacher/student-performance/student-performance.component';
import { EvaluationReportComponent } from './components/admin/evaluation-report/evaluation-report.component';
import { UserActivityComponent } from './components/admin/user-activity/user-activity.component';
import { ModerationComponent } from './components/admin/moderation/moderation.component';

const routes: Routes = [
  // Direct to LMS Login - default route
  {
    path: '',
    redirectTo: 'lms-login',
    pathMatch: 'full'
  },
  // LMS Login
  {
    path: 'lms-login',
    component: ModernLoginComponent,
    canActivate: [LoaderGuard, LoginGuard]
  },
  // Keep drive routes for future use (commented out but files remain)
  // {
  //   path: 'drive-login', 
  //   component: DriveLoginComponent,
  //   canActivate: [LoaderGuard]
  // },
  // {
  //   path: 'drive',
  //   component: DriveDashboardComponent,
  //   canActivate: [DriveGuard]
  // },
  // Legacy login route (redirect to lms-login)
  {
    path: 'login',
    redirectTo: 'lms-login',
    pathMatch: 'full'
  },
  // Keep landing page route for future use (commented out)
  // {
  //   path: 'landing',
  //   component: LandingComponent
  // },
  {
    path: 'student/qr-enroll/:courseId',
    component: QrEnrollmentComponent,
    canActivate: [QrEnrollmentGuard]
  },
  {
    path: 'modules',
    component: LessonPageComponent,
  },
 
  {
    path: 'admin',
    component: DashboardComponent,
    canActivate: [LoaderGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'adminProfile', component: StudentProfileComponent },
      { path: 'users', component: UsersPageComponent },
      { path: 'courses', component: AdminCourseComponent },
      { path: 'count', component: CountComponent },
      { path: 'edit-admincourse', component: EditAdmincourseComponent },
      { path: 'evaluation-report', component: EvaluationReportComponent },
      { path: 'user-activity', component: UserActivityComponent },
      { path: 'moderation', component: ModerationComponent },
      { path: 'course-forum/:courseId', component: CourseForumComponent },
      { path: 'thread-detail/:type/:threadId', component: ThreadDetailComponent },
      {
        path: 'speechlab', component:AdashboardComponent,
        children: [
          {path: '', redirectTo: 'drills', pathMatch: 'full'},
          {path: 'Modules', component: ModulesComponent},
          {path: 'Lab', component: AlabComponent},
          {path: 'drills', component: DrillsComponent},
          {path: 'drag1', component: Drag1Component},
          {path: 'quiz-template', component: QuizTemplateComponent}

        ]
      },
    ],
  },
  {
    path: 'student',
    component: DashboardComponent,
    canActivate: [PortalGuard, LoaderGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: HomeComponent },
      { path: 'lab', component: LabComponent },
      { path: 'selfstudylab', component: SelfstudylabComponent },
      { path: 'quanhub', component: QuanhubComponent,
        canDeactivate: [SpeechLabGuard],

      },
      { path: 'courses', component: CoursesComponent },
      { path: 'practice', component: PracticeComponent },
      { path: 'to-do', component: AssignmentComponent },
      { path: 'flashcards', component: FlashcardsComponent },
      { path: 'materials', component: MaterialsComponent },
      { path: 'lessons', component: LessonsComponent },
      { path: 'performance', component: PerformanceComponent },
      { path: 'texttospeech', component: TexttospeechComponent },
            { path: 'chatbot', component: ChatbotComponent },

      { path: 'dictionary', component: DictionaryComponent },
       { path: 'chatbots', component: ChatbotComponent },
      { path: 'speechanalyzer', component: SpeechAnalyzerComponent },
      { path: 'discussions', component: DiscussionsComponent },
      { path: 'topic-threads/:topicId', component: TopicThreadsComponent },
      { path: 'course-forum/:courseId', component: CourseForumComponent },
      { path: 'thread-detail/:type/:threadId', component: ThreadDetailComponent },
      {
        path: 'quiz-page',
        component: QuizPageComponent,
        canActivate: [QuizGuard],
      },
      { path: 'grading-page', component: GradingPageComponent },
      { path: 'studentProfile', component: StudentProfileComponent },
      {
        path: 'quiz-page',
        component: QuizPageComponent,
        canActivate: [QuizGuard],
      },
      {
        path: 'quiz-writing',
        component: QuizWritingComponent,
        canActivate: [QuizGuard],
      },
      { path: 'grading-page', component: GradingPageComponent },
      {
        path: 'quiz-speaking',
        component: QuizSpeakingComponent,
        canActivate: [QuizGuard],
      },
      { path: 'grading-page', component: GradingPageComponent },
      { path: 'student-evaluation', component: StudentEvaluationComponent },
      {
        path: 'speechlab',
  component: TsdashboardComponent,
  canDeactivate: [SpeechLabGuard],
        children: [
          {path: '', redirectTo: 'lab', pathMatch: 'full'},
        {path: 'practice', component: PracticeContainerComponent},
        {path: 'lab', component:LabContainerComponent},
        {path: 'module' , component: ModuleContainerComponent},
        {path: 'learning_module' , component: LearningModulesComponent},
        {path: 'module1' , component: Module1Component},
        {path: 'videos' , component: LabVidsComponent},
        {path: 'modules' , component: ModuleParentComponent},
        {path: 'practice1' , component: Practice1Component},
        {path: 'quiztemplate', component: QuizTemplateComponent},
        {path: 'practice-parent', component:PracticeParentComponent},
        {path: 'drag1', component:Drag1Component},
        {path: 'quiz-template', component: QuizTemplateComponent}
        ]
      },
      {
        path: 'speech-analyzer',
        children: [
          { path: 'record-speech', component: RecordSpeechComponent },
          { path: 'record-list', component: RecordListComponent },
          { path: 'record-report', component: RecordReportComponent },
        ],
      },
      
    ],
  },


  {
    path: 'teacher',
    component: DashboardComponent,
    canActivate: [TportalGuard, LoaderGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: ThomeComponent,
      },
      { path: 'essayAnalyser', component: EssayAnalyserComponent },
      { path: 'texttospeech', component: TexttospeechComponent },
      { path: 'teacherProfile', component: StudentProfileComponent },
      { path: 'dictionary', component: DictionaryComponent },
      { path: 'chatbots', component: ChatbotComponent },
      { path: 'Whiteboard', component: BoardComponent},
      { path: 'manageclass', component: ManageclassComponent },
      {path: 'quiz-analytics', component: QuizAnalyticsComponent},
      { path: 'task-management', component: TaskManagementComponent },
      { path: 'quanhub', component: QuanhubComponent,
        canDeactivate: [SpeechLabGuard],
       },
      { path: 'communication', component: CommunicationComponent },
      { path: 'discussions', component: TeacherDiscussionsComponent },
      { path: 'managecourse', component: ManageCourseComponent },
      { path: 'quiz-management', component: QuizManagementComponent },
      { path: 'lessons', component: LessonsComponent },
      { path: 'speechanalyzer', component: SpeechAnalyzerComponent },
      { path: 'topic-threads/:topicId', component: TopicThreadsComponent },
      { path: 'course-forum/:courseId', component: CourseForumComponent },
      { path: 'thread-detail/:type/:threadId', component: ThreadDetailComponent },
      { path: 'student-performance', component: StudentPerformanceComponent },
      {
        path: 'teacher-view',
        canActivate: [TeacherViewGuardGuard],
        component: TeacherViewComponent,
      },
      { path: 'grade-list', component: GradeListComponent },
      { path: 'progress-report', component: ProgressReportComponent },
      {
        path: 'speechlab',
        component: TdashboardComponent,
        canDeactivate: [SpeechLabGuard],
        children: [
          {path: '',redirectTo:'lab',pathMatch:'full'},
          {path: 'lab', component: LabContainerTeacherComponent},
          {path: 'module' , component: ModuleContainerComponent},
          {path: 'modules' , component: ModuleParentComponent},
          {path: 'learning_module' , component: LearningModulesComponent},
          {path: 'modules' , component: ModuleParentComponent},
          {path: 'practice1' , component: Practice1Component},
          {path: 'practice-parent', component:PracticeParentComponent},
          {path: 'practice', component: PracticeContainerComponent},
          {path: 'quiztemplate', component: QuizTemplateComponent},
        ]
      },
      {
        path: 'speech-analyzer',
        children: [
          { path: 'record-speech', component: RecordSpeechComponent },
          { path: 'record-list', component: RecordListComponent },
          { path: 'record-report', component: RecordReportComponent },
        ],
      },
    ],
  },

  { path: '**', redirectTo: 'lms-login', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
