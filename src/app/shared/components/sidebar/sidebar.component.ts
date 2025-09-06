import { Component, ElementRef, Renderer2, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { ProblemreportComponent } from 'src/app/components/general-modals/problemreport/problemreport.component';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  isSidebarMinimized: boolean = false;
  isStudent = this.API.getUserType() == '0';
  environment = environment;
  constructor(
    private API: APIService,
    private elRef: ElementRef,
    private renderer: Renderer2,
    private modalService: NgbModal,
    private router: Router
  ) {}
  openModal() {
    const modalRef = this.modalService.open(ProblemreportComponent);
  }
  // Insert here sidenav content specific to teacher, student, etc
  studentDashboardItems = {
    DASHBOARD: {
      redirect: 'student/dashboard',
      icon: 'bx-border-all',
      routerLink: '/student/dashboard',
    },
    COURSES: {
      redirect: 'student/courses',
      icon: 'bx-extension',
      routerLink: '/student/courses',
    },
    MEET: {
      redirect: 'student/quanhub',
      icon: 'bx-video',
      routerLink: '/student/quanhub',
    },
    DISCUSSIONS: {
      redirect: 'student/discussions',
      icon: 'bx-message-dots',
      routerLink: '/student/discussions',
    },
    TASKS: {
      redirect: '/student/to-do',
      icon: 'bx-notepad',
      routerLink: '/student/to-do',
    },
    FLASHCARDS: {
      redirect: '/student/flashcards',
      icon: 'bx bxs-carousel',
      routerLink: '/student/flashcards',
    },   
    'SPEECHLAB': {
      redirect: '/student/speechlab',
      icon: 'bx-notepad',
      routerLink: '/student/speechlab',
    },
    "PERFORMANCE" :  {
      redirect: 'student/performance',
      icon : 'bx-line-chart',
      routerLink: '/student/performance'
    },
    "EVALUATION" :  {
      redirect: 'student/student-evaluation',
      icon : 'bx-star',
      routerLink: '/student/student-evaluation'
    },
    // 'SPEECH ANALYZER': {
    //   redirect: 'student/speech-analyzer/record-speech',
    //   icon: 'bx-spreadsheet',
    //   routerLink: '/student/speech-analyzer/record-speech',
    // },
  };

  teacherDashboardItems = {
    DASHBOARD: {
    redirect: 'teacher/dashboard',
    icon: 'bx-home-alt', // Suggesting a home icon for the main dashboard.
    routerLink: '/teacher/dashboard',
    },
     'MANAGE COURSES': {
    redirect: 'teacher/managecourse',
    icon: 'bx-book', // A general book icon for course management.
    routerLink: '/teacher/managecourse',
  },
  "MANAGE QUIZ": {
    redirect: 'teacher/quiz-management',
    icon: 'bx-edit-alt', // Suggesting a pen or edit icon to indicate creating/managing quizzes.
    routerLink: '/teacher/quiz-management',
  },
  "MANAGE TASK": {
    redirect: 'teacher/task-management',
    icon: 'bx-task', // Suggesting a task-specific icon.
    routerLink: '/teacher/task-management',
  },
 
  'MANAGE CLASS': {
    redirect: 'teacher/manageclass',
    icon: 'bx-group', // Suggesting a group icon to represent managing a class.
    routerLink: '/teacher/manageclass',
  },
  DISCUSSIONS: {
    redirect: 'teacher/discussions',
    icon: 'bx-message-dots', // A message icon for discussions/forums.
    routerLink: '/teacher/discussions',
  },
  COMMUNICATION: {
    redirect: 'teacher/communication',
    icon: 'bx-group', // Suggesting a group icon to represent managing a class.
    routerLink: '/teacher/communication',
  },
  MEET: {
    redirect: 'teacher/quanhub',
    icon: 'bx-camera', // A camera icon for meetings.
    routerLink: '/teacher/quanhub',
  },
  GRADES: {
    redirect: 'teacher/grade-list',
    icon: 'bx-bar-chart-alt-2', // A chart or spreadsheet icon to represent grades.
    routerLink: '/teacher/grade-list',
    },
  'PROGRESS REPORT': {
    redirect: 'teacher/progress-report',
    icon: 'bx-line-chart', // A line chart icon for progress reports.
    routerLink: '/teacher/progress-report',
  },
  'PERFORMANCE': {
    redirect: 'teacher/student-performance',
    icon: 'bx-star', // A line chart icon for progress reports.
    routerLink: '/teacher/student-performance',
  },
 
 
  };

  adminDashboardItems = {
    DASHBOARD: {
      redirect: 'admin/dashboard',
      icon: 'bx-border-all',
      routerLink: '/admin/dashboard',
    },
    USERS: {
      redirect: 'admin/users',
      icon: 'bx-user',
      routerLink: '/admin/users',
    },
    MODERATION: {
      redirect: 'admin/moderation',
      icon: 'bx-shield-alt',
      routerLink: '/admin/moderation',
    },
    COUNT: {
      redirect: 'admin/count',
      icon: 'bxs-time-five',
      routerLink: '/admin/count',
    },
    'EVALUATION REPORT': {
      redirect: 'admin/evaluation-report',
      icon: 'bx-star',
      routerLink: '/admin/evaluation-report',
    },
    'USER ACTIVITY': {
      redirect: 'admin/user-activity',
      icon: 'bx-user-activity',
      routerLink: '/admin/user-activity',
    },
  
  };


  studentExtraDashboardItems:any = {
    "AI CHATBOT": {
      redirect: 'student/chatbots',
      icon: 'bx-book-bookmark',
      routerLink: '/student/chatbots',
    },
    "TEXT TO SPEECH": {
      redirect: 'student/texttospeech',
      icon: 'bx-user-voice',
      routerLink: '/student/texttospeech',
    },
  }

  teacherExtraDashboardItems:any = {
    "AI CHATBOT": {
      redirect: 'teacher/chatbots',
      icon: 'bx-book-bookmark',
      routerLink: '/teacher/chatbots',
    },
    "TEXT TO SPEECH": {
      redirect: 'teacher/texttospeech',
      icon: 'bx-user-voice',
      routerLink: '/teacher/texttospeech',
    },
  }



  principalDashboardItems = {
    DASHBOARD: {
      redirect: 'admin/dashboard',
      icon: 'bx-border-all',
      routerLink: '/admin/dashboard',
    },
    USERS: {
      redirect: 'admin/users',
      icon: 'bx-user',
      routerLink: '/admin/users',
    },
    COUNT: {
      redirect: 'admin/count',
      icon: 'bxs-time-five',
      routerLink: '/admin/count',
    },
  
  };

  displayedItems: any;
  itemKeys: any;

  checkAccount() {
    return this.API.getUserType();
  }

  getObjectKeys(items:any){
    return Object.keys(items);
  }

  // Get reported message count for admin moderation badge
  getReportedMessageCount(): number {
    // For now, return a sample count for demonstration. In production, this should come from the API service
    // You could add a method to APIService to get this data
    if (this.API.getUserType() == '2') { // Admin account
      // This would typically be fetched from API and updated in real-time
      return 2; // Sample count for demonstration - will be updated once API integration is complete
    }
    return 0;
  }

  ngOnInit(): void {
    this.API.downloadCourses();
    this.API.downloadProgress$.subscribe((progress) => {
      this.progress = progress;
    });
    switch (this.API.getUserData().accountType) {
      case 0:
        this.displayedItems = this.studentDashboardItems;
        break;
      case 1:
        this.displayedItems = this.teacherDashboardItems;
        break;
      case 2:
        this.displayedItems = this.adminDashboardItems;
        break;
        case 3:
        this.displayedItems = this.principalDashboardItems
        break;
      default:
        this.API.failedSnackbar('System Error');
    }
    for(let excluded of environment.exclude){
      delete this.displayedItems[excluded];
    }
    this.itemKeys = Object.keys(this.displayedItems);

    // Retrieving elements from the DOM using ElementRef
    const body: HTMLElement = this.elRef.nativeElement;
    const sidebar: HTMLElement = body.querySelector('nav') as HTMLElement;
    const toggle: HTMLElement = body.querySelector('.toggle') as HTMLElement;
    this.renderer.addClass(document.body, 'custom:ml-64');

    // Adding a click event listener to the toggle button
    toggle.addEventListener('click', () => {
      // Toggling the 'close' class on the sidebar
      sidebar.classList.toggle('close');

      // Toggling the class for the icon transformation
      const toggleIcon: HTMLElement = body.querySelector(
        '.bx-chevron-left.toggle'
      ) as HTMLElement;
      toggleIcon.classList.toggle('rotate');

      // Add transition styles using Renderer2 for the body element
      const transitionDuration = 300; // in milliseconds
      this.renderer.setStyle(
        document.body,
        'transition',
        `margin-left ${transitionDuration}ms ease-in-out`
      );

      // Set the 'margin-left' property based on whether the sidebar is closed or open
      if (sidebar.classList.contains('close')) {
        this.renderer.removeClass(document.body, 'custom:ml-64');
        this.renderer.addClass(document.body, 'custom:ml-20');
      } else {
        this.renderer.removeClass(document.body, 'custom:ml-20');
        this.renderer.addClass(document.body, 'custom:ml-64');
      }

      this.isSidebarMinimized = !this.isSidebarMinimized;
    });
  }
  confirmBox() {
    Swal.fire({
      title: 'Are you sure want to Logout?',
      text: 'You will be redirected to login',
      icon: 'warning',
      confirmButtonColor: 'var(--secondary-color)',
      cancelButtonColor: '#7F7F7F',
      showCancelButton: true,
      confirmButtonText: 'Logout!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.value) {
        Swal.fire({
          title: 'Logout Successfully!',
          text: 'Thank you for your time. :)',
          icon: 'success',
          confirmButtonColor: '#0172AF',
        }).then(() => {
          this.logout();
          this.renderer.removeClass(document.body, 'custom:ml-20');
          this.renderer.removeClass(document.body, 'custom:ml-64'); // Remove the margin-left style
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Cancelled',
          text: 'We are happy you stayed :)',
          icon: 'error',
          confirmButtonColor: '#0172AF', // Replace 'yourColor' with your preferred color
        });
      }
    });
  }

  progress: number = 0;
  navigate(location: string) {
    this.router.navigate([location]);
  }

  goOffline() {
    this.API.goOffline();
  }
  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64'); // Remove the margin-left style
    this.API.logout(); // Call the logout method from your API service
  }
}