import { Component, OnInit } from '@angular/core';
import { APIService } from 'src/app/services/API/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComponent } from '../../general-modals/request-form/modal.component';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-modern-login',
  templateUrl: './modern-login.component.html',
  styleUrls: ['./modern-login.component.css'],
})
export class ModernLoginComponent implements OnInit {
  // Dynamic variables for text and placeholders
  pageTitle: string = 'Welcome to PHC';
  pageSubtitles: string[] = ['Empowering Your Learning Journey'];
  trainingProgramTitle: string = 'PHC Learn';
  trainingDescription: string = 'Unlock your potential with innovative online courses designed for active engagement and real-world success.';
  welcomeText: string = 'Join PHC and start learning new skills today!';
  emailPlaceholder: string = 'Enter your email address';
  passwordPlaceholder: string = 'Enter your password';
  rememberMeText: string = 'Keep me signed in';
  loginButtonText: string = 'Sign In';
  noAccountText: string = "Don't have an account?";
  registerHereText: string = 'Create one now';

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
    
    // Store the current URL to redirect after login if coming from drive
    const currentUrl = this.router.url;
    if (currentUrl.includes('drive')) {
      sessionStorage.setItem('redirectAfterLogin', '/drive');
    }
    
    this.API.login(this.username, this.password);
  }
  
  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  goToDrive() {
    this.router.navigate(['/drive-login']);
  }

  goToLanding() {
    this.router.navigate(['/']);
  }

  // Handle Enter key press
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}
