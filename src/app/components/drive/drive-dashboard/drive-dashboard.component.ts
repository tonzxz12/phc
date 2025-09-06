import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { APIService } from '../../../services/API/api.service';

@Component({
  selector: 'app-drive-dashboard',
  templateUrl: './drive-dashboard.component.html',
  styleUrls: ['./drive-dashboard.component.css']
})
export class DriveDashboardComponent implements OnInit {

  constructor(
    private router: Router,
    private apiService: APIService
  ) { }

  ngOnInit(): void {
    console.log('Drive Dashboard initializing...');
    
    // Check authentication using LMS authentication system
    if (!this.apiService.isLoggedIn()) {
      console.warn('User not logged in via LMS, redirecting to login');
      this.router.navigate(['/lms-login']);
      return;
    }
    
    // Get detailed user information for debugging
    const userData = this.apiService.getUserData();
    console.log('Drive Dashboard - Full user data:', userData);
    console.log('Drive Dashboard - User ID:', userData?.id);
    console.log('Drive Dashboard - Account Type:', userData?.accountType);
    console.log('Drive Dashboard - Is Logged In:', this.apiService.isLoggedIn());
  }
}
