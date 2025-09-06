import { Component, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../../general-modals/request-form/modal.component';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoadingSnackbarComponent } from '../../general-modals/loadingsnackbar/loadingsnackbar.component';

@Component({
  selector: 'app-drive-login',
  templateUrl: './drive-login.component.html',
  styleUrls: ['./drive-login.component.css'],
})
export class DriveLoginComponent implements OnInit {
  // Dynamic variables for text and placeholders
  pageTitle: string = 'GERIA DRIVE';
  pageSubtitle: string = 'Cloud Storage & File Management';
  trainingProgramTitle: string = 'Teacher Portal';
  trainingDescription: string = 'Secure access to educational resources';
  welcomeText: string = 'Welcome to Geria Drive';
  emailPlaceholder: string = 'Teacher Email';
  passwordPlaceholder: string = 'Password';
  rememberMeText: string = 'Remember me';
  loginButtonText: string = 'ACCESS DRIVE';
  noAccountText: string = 'Need LMS Access?';
  registerHereText: string = 'Go to LMS';

  // Dynamic image properties
  imageSrc: string = environment.appLogo;
  imageAlt: string = 'Geria Drive Logo';
  imageClass: string = 'z-10 w-3/4 max-w-xs p-2 sm:w-1/2 md:w-1/3 lg:w-2/5 xl:w-2/5';

  username = this.API.getSavedEmail() ?? '';
  password = '';
  showPassword: boolean = false;
  loginError: string = '';
  
  constructor(
    private API: APIService,
    private router: Router,
    private modalService: NgbModal,
    private snackBar: MatSnackBar
  ) {}
  
  rememberMe: boolean = this.API.isLocalStorage();

  ngOnInit(): void {
    // Check if user is already logged in via the LMS authentication system
    if (this.API.isLoggedIn && this.API.isLoggedIn()) {
      const userData = this.API.getUserData();
      // Only allow teachers and admins to access drive
      if (userData && (userData.accountType === 1 || userData.accountType === 2)) {
        this.router.navigate(['/drive']);
      }
    }
  }

  toggleDarkMode() {
    const darkMode = this.isDarkModeEnabled();
    if (darkMode) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  enableDarkMode() {
    document.querySelector('html')?.classList.add('dark');
    localStorage.setItem('dark', 'true');
  }

  disableDarkMode() {
    document.querySelector('html')?.classList.remove('dark');
    localStorage.setItem('dark', 'false');
  }

  isDarkModeEnabled(): boolean {
    return document.querySelector('html')?.classList.contains('dark') ?? false;
  }

  openModal() {
    const modalRef = this.modalService.open(ModalComponent);
  }

  usernameHandler(event: any) {
    this.username = event.target.value;
    this.loginError = '';
  }

  passwordHandler(event: any) {
    this.password = event.target.value;
    this.loginError = '';
  }

  login() {
    if (this.rememberMe) {
      this.API.useLocalStorage();
    } else {
      this.API.useSessionStorage();
    }
    
    // Set redirection to drive after successful login
    sessionStorage.setItem('redirectAfterLogin', '/drive');
    
    // Use the same authentication system as LMS
    this.API.login(this.username, this.password);
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  goToLMS() {
    this.router.navigate(['/lms-login']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }
}
