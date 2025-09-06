import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { APIService } from '../../../services/API/api.service';

interface UserProfile {
  name: string;
  email: string;
  profilePicture?: string;
  role: string;
}

@Component({
  selector: 'app-drive-header',
  templateUrl: './drive-header.component.html',
  styleUrls: ['./drive-header.component.css']
})
export class DriveHeaderComponent implements OnInit {
  userProfile: UserProfile = {
    name: 'User',
    email: 'user@example.com',
    profilePicture: 'assets/user.png',
    role: 'User'
  };

  breadcrumbItems: MenuItem[] = [];
  homeItem: MenuItem = { icon: 'bx bx-home', routerLink: '/dashboard' };

  constructor(
    private router: Router,
    private apiService: APIService
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
    this.initializeBreadcrumbs();
  }

  loadUserProfile(): void {
    try {
      const userData = this.apiService.getUserData();
      if (userData) {
        let profilePicture = 'assets/user.png';
        if (userData.profile) {
          profilePicture = this.apiService.getURL(userData.profile);
        }

        this.userProfile = {
          name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'User',
          email: userData.email || 'user@school.edu',
          profilePicture: profilePicture,
          role: userData.accountType === 0 ? 'Student' : userData.accountType === 1 ? 'Teacher' : userData.accountType === 2 ? 'Admin' : 'User'
        };
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  initializeBreadcrumbs(): void {
    this.breadcrumbItems = [
      { label: 'My Drive', routerLink: '/drive' }
    ];
  }

  onProfileImageError(event: any): void {
    event.target.src = 'assets/user.png';
  }

  toggleSidebar(): void {
    // This will be handled by the parent layout component
    // Emit event or use a service for communication
  }
}
