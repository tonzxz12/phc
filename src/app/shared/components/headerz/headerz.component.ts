import { Component, ElementRef, Renderer2, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import Swal from 'sweetalert2';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ProblemreportComponent } from 'src/app/components/general-modals/problemreport/problemreport.component';
import { NavigationEnd, Router } from '@angular/router';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { environment } from 'src/environments/environment';
import { SurveyCertComponent } from 'src/app/components/student/student-modals/survey-cert/survey-cert.component';
import { MenuItem } from 'primeng/api'; // <-- IMPORTANT for Breadcrumb Items

@Component({
  selector: 'app-headerz',
  templateUrl: './headerz.component.html',
  styleUrls: ['./headerz.component.css'],
  animations: [
    trigger('openClose', [
      state('void', style({ opacity: 0, transform: 'translateX(-100%)' })),
      transition('void => *', [
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition('* => void', [
        animate('250ms ease-in-out', style({ opacity: 0, transform: 'translateX(-100%)' }))
      ]),
    ]),
  ],
})
export class HeaderzComponent implements OnInit, OnDestroy {
  title: string = 'Geria LMS'; // Dynamically set title
  isMenuVisible: boolean = false;
  profile?: string;
  search: string = '';
  audio: HTMLAudioElement;

  // For PrimeNG Breadcrumb
  breadcrumbItems: MenuItem[] = [];
  homeItem: MenuItem = {};

  reflectFullName() {
    return this.API.userData.firstname + ' ' + this.API.userData.lastname;
  }

  reflectProfile() {
    return this.API.getURL(this.API.userData.profile) ?? this.API.noProfile();
  }

   // Toggle dark mode
   toggleDarkMode() {
    const darkMode = this.isDarkModeEnabled();
    if (darkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  // Enable dark mode
  enableDarkMode() {
    document.querySelector('html')?.classList.add('dark');
    localStorage.setItem('dark', 'true');
  }

  // Disable dark mode
  disableDarkMode() {
    document.querySelector('html')?.classList.remove('dark');
    localStorage.setItem('dark', 'false');
  }

  // Check if dark mode is enabled
  isDarkModeEnabled(): boolean {
    return document.querySelector('html')?.classList.contains('dark') ?? false;
  }

  toggleMenu(): void {
    this.isMenuVisible = !this.isMenuVisible;
  }

  hideSidebar(): void {
    this.isMenuVisible = false;
  }

  isSidebarMinimized: boolean = false;

  constructor(
    private API: APIService,
    private elRef: ElementRef,
    private renderer: Renderer2,
    private modalService: NgbModal,
    private router: Router,
    private cdf: ChangeDetectorRef
  ) {
    this.audio = new Audio();
    this.audio.src = 'assets/sounds/notif.mp3';
    this.audio.load();
  }

  showNotificationBox: boolean = false;

  // Function to toggle the visibility of the notification box
  toggleNotificationBox() {
    this.showNotificationBox = !this.showNotificationBox;
  }

  notifications: any = [];
  newNotif: number = 0;

  getNotifications(muteCount?: boolean) {
    const obs$ = this.API.getNotifications().subscribe((data) => {
      this.notifications = data.output;
      this.API.notifications = this.notifications;
      for (let notif of data.output) {
        if (notif.status != 'seen') {
          this.API.inbox += 1;
        }
        if (notif.status === 'not_seen') {
          this.newNotif += 1;
        }
      }
      if (this.newNotif > 0 && !muteCount) {
        this.API.successSnackbar(`You have ${this.newNotif} new notifications`);
        this.playNotificationSound();
      }
      obs$.unsubscribe();
    });
  }

  getInbox() {
    return this.API.inbox;
  }

  ngOnDestroy(): void {
    this.API.socket.close();
  }

 ngOnInit(): void {
    // 1. Initialize WebSocket
    this.API.socket = new WebSocket(environment.socket);
    this.API.socket.binaryType = 'arraybuffer';
    this.API.socket.onopen = () => {
      this.API.socket!.onmessage = (message) => {
        const data = new TextDecoder('utf-8').decode(message.data);
        this.readMessage(data);
      };
    };

    // 2. Load user data and get notifications
    this.API.userData = this.API.getUserData();
    this.getNotifications();

    // 3. Determine accountType -> set up the sidebar items
    const accountType = this.API.userData.accountType;
    switch (accountType) {
      case 0: // Student
        this.displayedItems = this.studentDashboardItems;
        this.mainItemKeys = ['DASHBOARD', 'COURSES', 'MEET', 'TASKS', 'FLASHCARDS', 'SPEECHLAB', 'PERFORMANCE'];
        break;
      case 1: // Teacher
        this.displayedItems = this.teacherDashboardItems;
        this.mainItemKeys = [
          'DASHBOARD',
          'MANAGE COURSES',
          'MANAGE QUIZ',
          'MANAGE TASK',
          'MANAGE CLASS',
          'COMMUNICATION',
          'MEET',
          'GRADES',
        ];
        break;
      case 2: // Admin
        this.displayedItems = this.adminDashboardItems;
        this.mainItemKeys = ['DASHBOARD', 'USERS', 'COUNT', 'SPEECHLAB'];
        break;
      case 3: // Principal
        this.displayedItems = this.principalDashboardItems;
        this.mainItemKeys = ['DASHBOARD', 'USERS', 'COUNT', 'SPEECHLAB'];
        break;
      default:
        this.API.failedSnackbar('System Error');
        return;
    }

    // Apply environment exclusions like in sidebar component
    for(let excluded of environment.exclude){
      delete this.displayedItems[excluded];
    }
    // Update mainItemKeys to reflect exclusions
    this.mainItemKeys = this.mainItemKeys.filter(key => this.displayedItems[key]);

    // 4. SIDEBAR BEHAVIOR
    const body: HTMLElement = this.elRef.nativeElement;
    const sidebar: HTMLElement | null = body.querySelector('nav');
    const burger: HTMLElement | null = body.querySelector('.nav');
    const toggle: HTMLElement | null = body.querySelector('.toggle');

    this.renderer.addClass(document.body, 'custom:ml-64');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('close');
        const toggleIcon: HTMLElement | null = body.querySelector('.bx-chevron-left.toggle');
        if (toggleIcon) {
          toggleIcon.classList.toggle('rotate');
        }
        const transitionDuration = 300;
        this.renderer.setStyle(document.body, 'transition', `margin-left ${transitionDuration}ms ease-in-out`);
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

    if (burger && sidebar) {
      burger.addEventListener('click', () => {
        sidebar.classList.toggle('nav');
        const burgerButton: HTMLElement | null = body.querySelector('.bx-chevron-left.toggle');
        if (burgerButton) {
          burgerButton.classList.toggle('rotate');
        }
        const transitionDuration = 300;
        this.renderer.setStyle(document.body, 'transition', `margin-left ${transitionDuration}ms ease-in-out`);
        if (sidebar.classList.contains('nav')) {
          this.renderer.removeClass(document.body, 'custom:ml-64');
          this.renderer.addClass(document.body, 'custom:ml-20');
        } else {
          this.renderer.removeClass(document.body, 'custom:ml-20');
          this.renderer.addClass(document.body, 'custom:ml-64');
        }
        this.isSidebarMinimized = !this.isSidebarMinimized;
      });
    }

  // 5. BREADCRUMB SETUP
this.homeItem = {
  icon: 'fas fa-home',
  routerLink: `/${this.API.getUserType() === '0' ? 'student' : 'teacher'}/dashboard`
};

// Set default breadcrumb items
const userType = this.API.getUserType() === '0' ? 'Student' : 'Teacher';
this.breadcrumbItems = [
  { label: userType },
  { label: 'Dashboard', routerLink: `/${userType.toLowerCase()}/dashboard` }
];

// Update breadcrumbs based on current route
this.router.events.subscribe((event) => {
  if (event instanceof NavigationEnd) {
    const currentRoute = this.router.url;
    
    // Reset breadcrumb items starting with user type
    this.breadcrumbItems = [{ label: userType }];
    
    // Map routes to breadcrumb items
    const routeMap: { [key: string]: MenuItem } = {
      // Student routes
      '/student/dashboard': { label: 'Dashboard' },
      '/student/courses': { label: 'Courses' },
      '/student/quanhub': { label: 'Meet' },
      '/student/to-do': { label: 'Tasks' },
      // '/student/chatbots': { label: 'AI Chatbot' },
      '/student/texttospeech': { label: 'Text to Speech' },
      '/student/speechlab': { label: 'Speech Lab' },
      '/student/performance': { label: 'Performance' },
      
      // Teacher routes
      '/teacher/dashboard': { label: 'Dashboard' },
      '/teacher/quiz-management': { label: 'Manage Quiz' },
      '/teacher/task-management': { label: 'Manage Task' },
      '/teacher/managecourse': { label: 'Manage Courses' },
      '/teacher/manageclass': { label: 'Manage Class' },
      '/teacher/quanhub': { label: 'Meet' },
      '/teacher/grade-list': { label: 'Grades' },
      '/teacher/chatbot': { label: 'AI Chatbot' },
      '/teacher/flashcards': { label: 'Flashcards' },
      '/teacher/texttospeech': { label: 'Text to Speech' },
      '/teacher/speechlab': { label: 'Speech Lab' }
    };

    if (routeMap[currentRoute]) {
      this.breadcrumbItems.push({ 
        ...routeMap[currentRoute], 
        routerLink: currentRoute 
      });
    }
  }
});
}

  confirmBox() {
    Swal.fire({
      title: 'Are you sure want to Logout?',
      text: 'You will be redirected to login',
      icon: 'warning',
      confirmButtonColor: 'var(--tertiary-color)',
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
          confirmButtonColor: 'var(--secondary-color)',
        }).then(() => {
          this.logout();
          this.renderer.removeClass(document.body, 'custom:ml-20');
          this.renderer.removeClass(document.body, 'custom:ml-64');
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Cancelled',
          text: 'We are happy you stayed :)',
          icon: 'error',
          confirmButtonColor: 'var(--secondary-color)',
        });
      }
    });
  }

  navigate(location: string): void {
    this.hideSidebar();
    this.router.navigate([location]);
  }

  gotoProfile() {
    if (this.API.getUserType() == '0') {
      this.navigate('student/studentProfile');
    }
    if (this.API.getUserType() == '1') {
      this.navigate('teacher/teacherProfile');
    }
    if (this.API.getUserType() == '2') {
      this.navigate('admin/adminProfile');
    }
  }

  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64');
    this.API.logout();
  }

  openModal() {
    this.modalService.open(ProblemreportComponent);
  }

  checkAccount() {
    return this.API.getUserType();
  }

  getObjectKeys(items: any) {
    return Object.keys(items);
  }

  // ============== SIDEBAR DEFINITIONS ==============
  displayedItems!: { [key: string]: { redirect: string; icon: string; routerLink: string } };
  mainItemKeys: string[] = [];

  studentDashboardItems: { [key: string]: any } = {
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
    PERFORMANCE: {
      redirect: 'student/performance',
      icon: 'bx-line-chart',
      routerLink: '/student/performance',
    },
    // 'SPEECH ANALYZER': {
    //   redirect: 'student/speech-analyzer/record-speech',
    //   icon: 'bx-spreadsheet',
    //   routerLink: '/student/speech-analyzer/record-speech',
    // },
  };

  studentExtraDashboardItems: any = {
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
  };

  teacherDashboardItems: { [key: string]: any } = {
    DASHBOARD: {
      redirect: 'teacher/dashboard',
      icon: 'bx-home-alt',
      routerLink: '/teacher/dashboard',
    },
    'MANAGE COURSES': {
      redirect: 'teacher/managecourse',
      icon: 'bx-book',
      routerLink: '/teacher/managecourse',
    },
    "MANAGE QUIZ": {
      redirect: 'teacher/quiz-management',
      icon: 'bx-edit-alt',
      routerLink: '/teacher/quiz-management',
    },
    "MANAGE TASK": {
      redirect: 'teacher/task-management',
      icon: 'bx-task',
      routerLink: '/teacher/task-management',
    },
    'MANAGE CLASS': {
      redirect: 'teacher/manageclass',
      icon: 'bx-group',
      routerLink: '/teacher/manageclass',
    },
    COMMUNICATION: {
      redirect: 'teacher/communication',
      icon: 'bx-group',
      routerLink: '/teacher/communication',
    },
    MEET: {
      redirect: 'teacher/quanhub',
      icon: 'bx-camera',
      routerLink: '/teacher/quanhub',
    },
    GRADES: {
      redirect: 'teacher/grade-list',
      icon: 'bx-bar-chart-alt-2',
      routerLink: '/teacher/grade-list',
    },
  };

  teacherExtraDashboardItems: any = {
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
    COUNT: {
      redirect: 'admin/count',
      icon: 'bxs-time-five',
      routerLink: '/admin/count',
    },
    SPEECHLAB: {
      redirect: 'admin/speechlab',
      icon: 'bxs-time-five',
      routerLink: '/admin/speechlab',
    },
  };

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
    SPEECHLAB: {
      redirect: 'admin/speechlab',
      icon: 'bxs-time-five',
      routerLink: '/admin/speechlab',
    },
  };

  userType = this.API.getUserType();
  routes = [
    { for: '0', name: 'Go to Assignments', link: '/student/to-do' },
    { for: '0', name: 'Go to Quizzes', link: '/student/to-do' },
    { for: '0', name: 'Go to Text-to-Speech', link: '/student/texttospeech' },
    { for: '0', name: 'Go to Courses', link: '/student/courses' },
    { for: '0', name: 'Go to Lessons', link: '/student/courses' },
    { for: '0', name: 'Go to Dashboard', link: '/student/dashboard' },
    { for: '0', name: 'Go to Meet', link: '/student/quanhub' },
    { for: '0', name: 'Go to Self Study', link: '/student/selfstudylab' },
    { for: '0', name: 'Go to Practice', link: '/student/selfstudylab' },
    { for: '0', name: 'Go to Dictionary', link: '/student/dictionary' },
    { for: '0', name: 'Go to Profile', link: '/student/studentProfile' },
    { for: '0', name: 'Go to Messages', link: '/student/dashboard' },
    { for: '0', name: 'Go to Speechlab', link: '/student/speechlab' },

    { for: '1', name: 'Go to Manage Courses', link: '/teacher/managecourse' },
    { for: '1', name: 'Go to Manage Class', link: '/teacher/manageclass' },
    { for: '1', name: 'Go to Quizzes', link: '/teacher/quiz-management' },
    { for: '1', name: 'Go to Tasks', link: '/teacher/task-management' },
    { for: '1', name: 'Go to Grades', link: '/teacher/grade-list' },
    { for: '1', name: 'Go to Text-to-Speech', link: '/teacher/texttospeech' },
    { for: '1', name: 'Go to Profile', link: '/teacher/teacherProfile' },
    { for: '1', name: 'Go to Messages', link: '/teacher/communication' },
    { for: '1', name: 'Go to Alert', link: '/teacher/communication' },
    { for: '1', name: 'Go to Broadcast', link: '/teacher/communication' },
    { for: '1', name: 'Go to Meet', link: '/teacher/quanhub' },
    { for: '1', name: 'Go to Speechlab', link: '/teacher/speechlab' },
  ];
  searchbar = '';

  handleSearchInput(event: any) {
    this.API.search = event.target.value;
    this.searchbar = this.API.search;
  }

  has(word: string, search: string) {
    return word.trim().toLowerCase().includes(search.trim().toLowerCase());
  }

  goTo(route: string) {
    this.router.navigate([route]);
    this.searchbar = '';
  }

  activateSearch() {
    // optional...
  }

  playNotificationSound(): void {
    // Only play sound if user has interacted with the page
    this.audio.play().catch(error => {
      console.log('Audio autoplay prevented:', error);
    });
  }

  readMessage(data: any) {
    const parsedMessage = JSON.parse(data);
    
    if(parsedMessage.app == 'systems'){
      this.API.reInit();
    }

    if (parsedMessage.app != 'quanlab') {
      return;
    }
    if (
      parsedMessage.type === 'notification' &&
      this.API.getUserType() === '2' &&
      parsedMessage.to === '[--administrator--]'
    ) {
      this.getNotifications(true);
      this.API.verificationNotifier.next(1);
      this.playNotificationSound();
      if (
        parsedMessage.title.toLowerCase().includes('verification') &&
        parsedMessage.sender === 'Anonymous'
      ) {
        this.API.successSnackbar('New verification request');
      } else {
        this.API.successSnackbar(`New notification from ${parsedMessage.sender}`, 5000);
      }
      return;
    }
    if (parsedMessage.to === this.API.getUserData().id) {
      if (parsedMessage.type === 'notification') {
        this.getNotifications(true);
        this.playNotificationSound();
        this.API.successSnackbar(`New notification from ${parsedMessage.sender}`, 5000);
      }
      if (parsedMessage.type === 'messaging') {
        if (this.API.chat?.id === parsedMessage.from) {
          this.API.messages.push({
            senderid: parsedMessage.from,
            recipientid: parsedMessage.to,
            message: parsedMessage.message,
          });
          this.API.messsagesMarkAllAsRead(this.API.chat.id);
        } else {
          this.API.getConversations();
          this.API.successSnackbar(`You have a message from ${parsedMessage.sender}`, 5000);
        }
      }
      if (parsedMessage.type === 'omegle-request-handhsake') {
        if (!parsedMessage.interests.length) return;
        this.API.chat = {
          firstname: 'Say',
          lastname: 'Hi!',
          id: parsedMessage.from,
          anonymous: true,
          interests: parsedMessage.interests,
        };
        this.API.interests = [];
        this.API.socketSend({
          app: 'quanlab',
          type: 'omegle-accept-handhsake',
          from: parsedMessage.to,
          to: parsedMessage.from,
          interests: parsedMessage.interests,
        });
      }
      if (parsedMessage.type === 'omegle-accept-handhsake') {
        if (!parsedMessage.interests.length) return;
        this.API.chat = {
          firstname: 'Say',
          lastname: 'Hi!',
          id: parsedMessage.from,
          anonymous: true,
          interests: parsedMessage.interests,
        };
        this.API.interests = [];
      }
      if (parsedMessage.type === 'omegle-terminate-handhsake') {
        this.API.chat = null;
        this.API.failedSnackbar('Person disconnected from chat.');
      }
    }
    if (parsedMessage.type === 'omegle') {
      const interests = parsedMessage.interests.filter((x: string) =>
        this.API.interests.includes(x)
      );
      if (interests.length) {
        this.API.socketSend({
          app: 'quanlab',
          type: 'omegle-request-handhsake',
          from: this.API.getUserData().id,
          to: parsedMessage.from,
          interests: interests,
        });
      }
    }
  }
}
