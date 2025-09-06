import { NgModule, importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

// import { provideFirebaseApp, getApp, initializeApp } from '@angular/fire/app';
// import { getFirestore, provideFirestore } from '@angular/fire/firestore';
// import { SharedService } from 'src/app/services/API/services-includes/shared.service';
// import {provideStorage, getStorage } from '@angular/fire/storage';
import player from 'lottie-web';

const firebaseConfig = {
  apiKey: "AIzaSyDAd8uGtbwzUvEqiOeC2TW_kRHFEGtw38Q",
  authDomain: "quanbylms-b4b15.firebaseapp.com",
  projectId: "quanbylms-b4b15",
  storageBucket: "quanbylms-b4b15.appspot.com",
  messagingSenderId: "542875331963",
  appId: "1:542875331963:web:4955ee9d892325421361de"
  // measurementId: "G-9C89V814XJ"
};

import { MatPaginatorModule } from '@angular/material/paginator';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/auth/login.component';
import { ModalComponent } from './components/general-modals/request-form/modal.component';
import { CardComponent } from './shared/components/card/card.component';
import { HeaderzComponent } from './shared/components/headerz/headerz.component';
import { DashboardComponent } from './shared/components/dashboard-layout/dashboard.component';
import { CoursesComponent } from './components/student/courses/courses.component';
import { PracticeComponent } from './components/student/practice/practice.component';
import { AssessmentComponent } from './unused-components/assessment/assessment.component';
import { PerformanceComponent } from './components/student/performance/performance.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { LabComponent } from './components/student/lab/lab.component';
import { SelfstudylabComponent } from './components/student/selfstudylab/selfstudylab.component';
import { LabfocusComponent } from './unused-components/labfocus/labfocus.component';
import { HomeComponent } from './components/student/student-dashboard/home.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { TexttospeechComponent } from './components/texttospeech/texttospeech.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { LoadingSnackbarComponent } from './components/general-modals/loadingsnackbar/loadingsnackbar.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DictionaryComponent } from './components/dictionary/dictionary.component';
import { ThomeComponent } from './components/teacher/teacher-dashboard/thome.component';
import { TlabComponent } from './unused-components/tlab/tlab.component';
import { QuanhubComponent } from './components/meet/quanhub.component';
import { NgbModule,NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ManageclassComponent } from './components/teacher/manageclass/manageclass.component';
import { NewclassComponent } from './components/teacher/teacher-modals/newclass/newclass.component';
import { AssignmentComponent } from './components/student/assignment/assignment.component';
import { MaterialsComponent } from './components/student/materials/materials.component';
import { CommunicationComponent } from './components/teacher/communication/communication.component';
import { StudentAandDComponent } from './unused-components/student-aand-d/student-aand-d.component';
import { ProblemreportComponent } from './components/general-modals/problemreport/problemreport.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CoursecontentComponent } from './components/student/student-modals/coursecontent/coursecontent.component';
import { TaskManagementComponent } from './components/teacher/task-management/task-management.component';
import { CreatemeetComponent } from './components/teacher/teacher-modals/createmeet/createmeet.component';
import { TaskcreationComponent } from './components/teacher/teacher-modals/taskcreation/taskcreation.component';
import { QuizPageComponent } from './components/student/quiz-page/quiz-page.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CreateFeedbackComponent } from './components/teacher/teacher-modals/create-feedback/create-feedback.component';
import { MeetpopComponent } from './components/student/student-modals/meetpop/meetpop.component';
import { ChatsComponent } from './components/general-modals/chats/chats.component';
import { GradingPageComponent } from './components/student/grading-page/grading-page.component';
import { QuizManagementComponent } from './components/teacher/quiz-management/quiz-management.component';
import { QuizCreationComponent } from './components/teacher/teacher-modals/quiz-creation/quiz-creation.component';
import { CreateCourseComponent } from './components/teacher/teacher-modals/create-course/create-course.component';
import { MatIconModule } from '@angular/material/icon';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { UsersPageComponent } from './components/admin/users-page/users-page.component';
import { ManageCourseComponent } from './components/teacher/managecourse/managecourse.component';
import { VideoZoomComponent } from './unused-components/video-zoom/video-zoom.component';

import { AddTeachersComponent } from './components/admin/admin-modals/add-teachers/add-teachers.component';
import { AddStudentsComponent } from './components/admin/admin-modals/add-students/add-students.component';
import { LessonsComponent } from './components/student/lessons/lessons.component';
import { NotificationboxComponent } from './shared/components/notificationbox/notificationbox.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { StudentProfileComponent } from './shared/components/user-profile/student-profile.component';
import { TlessonsComponent } from './unused-components/tlessons/tlessons.component';
import { ViewerComponent } from './unused-components/viewer/viewer.component';
import { SafePipe } from './pipes/safe/safe.pipe';
import { VerificationPageComponent } from './unused-components/verification-page/verification-page.component';
import { EditCourseComponent } from './components/teacher/teacher-modals/edit-course/edit-course.component';
import { VideoTableContentsModalComponent } from './components/teacher/teacher-modals/video-table-contents-modal/video-table-contents-modal.component';
import { CountComponent } from './components/admin/count/count.component';
import { EditDetailsComponent } from './components/admin/admin-modals/edit-details/edit-details.component';
import { QuizWritingComponent } from './components/student/quiz-writing/quiz-writing.component';
import { IntroComponent } from './shared/intro/intro.component';
import { LoaderComponent } from './shared/loader/loader.component';
import { LoaderGuard } from './services/guard/loader/loader.guard';
import { TeacherViewComponent } from './components/teacher/teacher-view/teacher-view.component';
import { QuizSpeakingComponent } from './components/student/quiz-speaking/quiz-speaking.component';
import { GradeListComponent } from './components/teacher/grade-list/grade-list.component';
import { LessonPageComponent } from './offlineModules/lesson-page/lesson-page.component';

import { TdashboardComponent } from './speechlab/teacher/teacher-main/tdashboard.component';
import { LabContainerTeacherComponent } from './speechlab/teacher/lab/lab-container-teacher/lab-container-teacher.component';
import { LabLaptopTeacherComponent } from './speechlab/teacher/lab/lab-laptop-teacher/lab-laptop-teacher.component';
import { ActiveBarComponent } from './speechlab/student/lab/active-bar/active-bar.component';
import { LabButtonsComponent } from './speechlab/student/lab/lab-buttons/lab-buttons.component';
import { LabContainerComponent } from './speechlab/student/lab/lab-container/lab-container.component';
import { LabLaptopComponent } from './speechlab/student/lab/lab-laptop/lab-laptop.component';
import { LearningModulesComponent } from './speechlab/student/module/learning-modules/learning-modules.component';
import { ModuleContainerComponent } from './speechlab/student/module/module-container/module-container.component';
import { PracticeContainerComponent } from './speechlab/student/practice/practice-container/practice-container.component';
import { TsdashboardComponent } from './speechlab/student/student-main/tsdashboard.component';
import { ModalsComponent } from './speechlab/components/modals/modals.component';
import { ModulePlaceholderComponent } from './speechlab/components/module-placeholder/module-placeholder.component';
import { Module1Component } from './speechlab/student/module/module1/module1.component';
import { LabVidsComponent } from './speechlab/teacher/lab/lab-vids/lab-vids.component';
import { Drag1Component } from './speechlab/student/module/drag1/drag1.component';
import { Drag2Component } from './speechlab/student/module/drag2/drag2.component';
import { ModuleParentComponent } from './speechlab/student/module/module-parent/module-parent.component';

import { QuizTemplateComponent } from './speechlab/student/module/quiz-template/quiz-template.component';
import { AdashboardComponent } from './components/admin/speechlab/adashboard/adashboard.component';
import { ModulesComponent } from './components/admin/speechlab/modules/modules.component';
import { UploadlessonquizComponent } from './components/admin/speechlab/uploadlessonquiz/uploadlessonquiz.component';
import { UploadLessonComponent } from './components/admin/speechlab/modal/upload-lesson/upload-lesson.component';
import { AlabComponent } from './components/admin/speechlab/alab/alab.component';
import { Practice1Component } from './speechlab/student/practice/practice1/practice1.component';
import { DrillsComponent } from './components/admin/speechlab/drills/drills.component';
import { UploadDrillComponent } from './components/admin/speechlab/modal/upload-drill/upload-drill.component';
import { PracticeParentComponent } from './speechlab/student/practice/practice-parent/practice-parent.component';
import { MeetViewComponent } from './speechlab/components/meet-view/meet-view.component';
import { GroupComponent } from './speechlab/components/group/group.component';
import { QuizAnalyticsComponent } from './components/teacher/quiz-analytics/quiz-analytics.component';
import { AddPrincipalComponent } from './components/admin/admin-modals/add-principal/add-principal.component';
import { SurveyCertComponent } from './components/student/student-modals/survey-cert/survey-cert.component';
import { EssayAnalyserComponent } from './unused-components/essay-analyser/essay-analyser.component';
import { PopupQuizPageComponent } from './components/student/popup-quiz-page/popup-quiz-page.component';
import { SpeechAnalyzerComponent } from './components/speech-analyzer/speech-analyzer.component';
import { RecordListComponent } from './components/speech-analyzer/record-list/record-list.component';
import { RecordReportComponent } from './components/speech-analyzer/record-report/record-report.component';
import { RecordSpeechComponent } from './components/speech-analyzer/record-speech/record-speech.component';
import { ClickOutsideDirective } from './services/hook/click-outside.directive';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { StyleClassModule } from 'primeng/styleclass';


//PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TabPanel } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { PaginatorModule } from 'primeng/paginator';
import { TimelineModule } from 'primeng/timeline';
import { ScrollerModule } from 'primeng/scroller';
import { AccordionModule } from 'primeng/accordion';
import { DividerModule } from 'primeng/divider';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { FileUploadModule } from 'primeng/fileupload';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CarouselModule } from 'primeng/carousel';
import { MatToolbarModule } from '@angular/material/toolbar';
import {MatCardModule} from '@angular/material/card';
import { MultiSelectModule } from 'primeng/multiselect';
import { definePreset } from '@primeng/themes';
import { TabViewModule } from 'primeng/tabview';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CommonModule } from '@angular/common';

import Aura from '@primeng/themes/aura';
import { DropdownModule } from 'primeng/dropdown';
import { environment } from 'src/environments/environment';
import { CustomTabsComponent } from './components/shared/custom-tabs/custom-tabs.component';
import { CustomTabPanelComponent } from './components/shared/custom-tabs/custom-tab-panel.component';
import { CustomTableComponent } from './components/shared/custom-table/custom-table.component';

const MyPreset = definePreset(Aura, {
  semantic: {
      colorScheme: {
          light: {
              primary: environment.light,
              surface: {
                  0: '#ffffff',
                  50: '{zinc.50}',
                  100: '{zinc.100}',
                  200: '{zinc.200}',
                  300: '{zinc.300}',
                  400: '{zinc.400}',
                  500: '{zinc.500}',
                  600: '{zinc.600}',
                  700: '{zinc.700}',
                  800: '{zinc.800}',
                  900: '{zinc.900}',
                  950: '{zinc.950}'
              },
          },
          dark: {
              primary: environment.dark,            
              surface: {
                  0: '#ffffff',
                  50: '{slate.50}',
                  100: '{slate.100}',
                  200: '{slate.200}',
                  300: '{slate.300}',
                  400: '{slate.400}',
                  500: '{slate.500}',
                  600: '{slate.600}',
                  700: '{slate.700}',
                  800: '{slate.800}',
                  900: '{slate.900}',
                  950: '{slate.950}'
              },
             
          }
      },
  }
});
import { MenuItem } from 'primeng/api';
import { FlashcardsComponent } from './components/student/flashcards/flashcards.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { MenuModule } from 'primeng/menu';
import { LandingComponent } from './components/landing/landing.component';
import { LmsLoginComponent } from './components/auth/lms-login/lms-login.component';
import { Loginv2Component } from './components/auth/loginv2/loginv2.component';
import { DriveLoginComponent } from './components/auth/drive-login/drive-login.component';
import { DriveDashboardComponent } from './components/drive/drive-dashboard/drive-dashboard.component';
import { DriveLayoutComponent } from './components/drive/drive-layout/drive-layout.component';
import { DriveSidebarComponent } from './components/drive/drive-sidebar/drive-sidebar.component';
import { DriveHeaderComponent } from './components/drive/drive-header/drive-header.component';
import { DriveBodyComponent } from './components/drive/drive-body/drive-body.component';
import { QrEnrollmentComponent } from './components/student/qr-enrollment/qr-enrollment.component';
import { TopicThreadsComponent } from './components/communication/topic-threads/topic-threads.component';
import { CourseForumComponent } from './components/communication/course-forum/course-forum.component';
import { ThreadDetailComponent } from './components/communication/thread-detail/thread-detail.component';
import { DiscussionsComponent } from './components/student/discussions/discussions.component';
import { TeacherDiscussionsComponent } from './components/teacher/discussions/discussions.component';
import { ModernLoginComponent } from './components/auth/modern-login/modern-login.component';

export function playerFactory() {
  return player;
}


@NgModule({ declarations: [ 
      AppComponent,
      FlashcardsComponent,
    LoginComponent,
    Loginv2Component,
    ModalComponent,
    CardComponent,
    LessonsComponent,
    HeaderzComponent,
    DashboardComponent,
    CoursesComponent,
    PracticeComponent,
    AssessmentComponent,
    PerformanceComponent,
    SidebarComponent,
    LabComponent,
    SelfstudylabComponent,
    LabfocusComponent,
    HomeComponent,
    FooterComponent,
    TexttospeechComponent,
    LoadingSnackbarComponent,
    DictionaryComponent,
    ThomeComponent,
    ManageCourseComponent,
    TlessonsComponent,
    TlabComponent,
    QuanhubComponent,
    ManageclassComponent,
    AssignmentComponent,
    NewclassComponent,
    MaterialsComponent,
    CommunicationComponent,
    StudentAandDComponent,
    ProblemreportComponent,
    CoursecontentComponent,
    TaskManagementComponent,
    CreatemeetComponent,
    TaskcreationComponent,
    QuizPageComponent,
    CreateFeedbackComponent,
    MeetpopComponent,
    ChatsComponent,
    GradingPageComponent,
    QuizManagementComponent,
    QuizCreationComponent,
    CreateCourseComponent,
    AdminDashboardComponent,
    UsersPageComponent,
    AddTeachersComponent,
    AddStudentsComponent,
    VideoZoomComponent,
    NotificationboxComponent,
    StudentProfileComponent,
    ViewerComponent,
    SafePipe,
    VerificationPageComponent,
    EditCourseComponent,
    VideoTableContentsModalComponent,
    CountComponent,
    EditDetailsComponent,
    QuizWritingComponent,
    IntroComponent,
    LoaderComponent,
    TeacherViewComponent,
    QuizSpeakingComponent,
    GradeListComponent,
    LessonPageComponent,
    TdashboardComponent,
    LabContainerTeacherComponent,
    LabLaptopTeacherComponent,
    ActiveBarComponent,
    LabButtonsComponent,
    LabContainerComponent,
    LabLaptopComponent,
    LearningModulesComponent,
    ModuleContainerComponent,
    PracticeContainerComponent,
    TsdashboardComponent,
    ModalsComponent,
    ModulePlaceholderComponent,
    Module1Component,
    LabVidsComponent,
    Drag1Component,
    Drag2Component,
    ModuleParentComponent,
    QuizTemplateComponent,
    AdashboardComponent,
    ModulesComponent,
    UploadlessonquizComponent,
    UploadLessonComponent,
    AlabComponent,
    Practice1Component,
    DrillsComponent,
    UploadDrillComponent,
    PracticeParentComponent,
    MeetViewComponent,
    GroupComponent,
    AddPrincipalComponent,
    QuizAnalyticsComponent,
    SurveyCertComponent,
    EssayAnalyserComponent,
    PopupQuizPageComponent,
    SpeechAnalyzerComponent,
    RecordListComponent,
    RecordReportComponent,
  RecordSpeechComponent,
    ChatbotComponent,
    LandingComponent,
    LmsLoginComponent,
    ModernLoginComponent,
    DriveLoginComponent,
    DriveDashboardComponent,
    DriveLayoutComponent,
    DriveSidebarComponent,
    DriveHeaderComponent,
    DriveBodyComponent,
    QrEnrollmentComponent,
    TopicThreadsComponent,
    CourseForumComponent,
    ThreadDetailComponent,
    DiscussionsComponent,
    TeacherDiscussionsComponent,
    CustomTabsComponent,
    CustomTabPanelComponent,
    CustomTableComponent
    ],
  bootstrap: [AppComponent], imports: [
    MatPaginatorModule,
    StyleClassModule,
        MatDatepickerModule,
        MatNativeDateModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatDialogModule,
        NgbModule,
        FormsModule,
    MatDialogModule,
        ButtonModule,
        NgxChartsModule,
        MatIconModule,
        BrowserAnimationsModule,
        DragDropModule,
        PdfViewerModule,
    NgxDocViewerModule,

    CardModule,
    TableModule,
    TextareaModule,
    PaginatorModule,
    TimelineModule,
    ScrollerModule,
    AccordionModule,
    DividerModule,
    FieldsetModule,
    PanelModule,
    ScrollPanelModule,
    TabsModule,
    DialogModule,
    DrawerModule,
    TooltipModule,
    FileUploadModule,
    BreadcrumbModule,
    CarouselModule,
    MatToolbarModule,
    MatCardModule,
    DropdownModule,
    MultiSelectModule,
    FormsModule,
    TabPanel,
    // TabViewModule,
    InputIconModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    CheckboxModule,
    ProgressBarModule,
    MenuModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,    
  
        ClickOutsideDirective,
  ], providers: [
    provideAnimationsAsync(),
    providePrimeNG({
        theme: {
            preset: MyPreset,
            options: {
              darkModeSelector: '.dark'
            }
        },
    }),
    NgbActiveModal, provideHttpClient(withInterceptorsFromDi())]

})
export class AppModule {}