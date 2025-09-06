import { Component, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../general-modals/request-form/modal.component';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  // Dynamic variables for text and placeholders
  pageTitle: string = 'Stay Active and Engaged';
  pageSubtitles: string[] = ['Learn New Things', 'Online',];
  trainingProgramTitle: string = environment.appTitle;
  trainingDescription: string = environment.appPhrase;
  welcomeText: string = environment.welcomeText;
  emailPlaceholder: string = 'Email';
  passwordPlaceholder: string = 'Password';
  rememberMeText: string = 'Remember me';
  loginButtonText: string = 'LOGIN';
  noAccountText: string = 'No Account?';
  registerHereText: string = 'Register here';

  // Dynamic image properties
  imageSrc: string = environment.appLogo;  // Image source
  imageAlt: string = 'altlog';  // Alt text for the image
  imageClass: string = 'z-10 w-3/4 max-w-xs p-2 sm:w-1/2 md:w-1/3 lg:w-2/5 xl:w-2/5';  // CSS classes for the image


  username =  this.API.getSavedEmail() ?? '';
  password = '';
  showPassword: boolean = false;
  constructor(
    private API: APIService,
    private router: Router,
    private modalService: NgbModal
  ) {}
  rememberMe:boolean = this.API.isLocalStorage();

  ngOnInit(): void {
    // console.log(this.API.getSavedEmail());
    this.checkForPendingQrEnrollment();
  }

  checkForPendingQrEnrollment(): void {
    const qrCourseId = sessionStorage.getItem('qr_enrollment_course');
    
    if (qrCourseId && this.API.isLoggedIn()) {
      // User is already logged in with pending QR enrollment
      const userType = this.API.getUserType();
      
      if (userType === '0') { // Student
        sessionStorage.removeItem('qr_enrollment_course');
        this.router.navigate(['/student/qr-enroll', qrCourseId]);
      } else {
        // Non-student user tried to use QR enrollment
        sessionStorage.removeItem('qr_enrollment_course');
        this.API.failedSnackbar('QR enrollment is only available for students.');
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
  openModal() {
    const modalRef = this.modalService.open(ModalComponent);
    // You might pass data or perform any other operations here.
  }
  usernameHandler(event: any) {
    this.username = event.target.value;
  }
  passwordHandler(event: any) {
    this.password = event.target.value;
  }

  login() {
    if(this.rememberMe){
      this.API.useLocalStorage();
    }else{
      this.API.useSessionStorage();
    }
    this.API.login(this.username, this.password);
  }
  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
}