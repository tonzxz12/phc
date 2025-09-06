import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { APIService } from '../../API/api.service';

@Injectable({
  providedIn: 'root'
})
export class DriveGuard implements CanActivate {

  constructor(
    private router: Router,
    private apiService: APIService
  ) {}

  canActivate(): boolean {
    console.log('DriveGuard - Checking authentication...');
    
    try {
      // Check if user is logged in via the LMS authentication system
      if (this.apiService.isLoggedIn && this.apiService.isLoggedIn()) {
        console.log('DriveGuard - User logged in via API service');
        
        // Check if user is a teacher or admin (only they can access drive)
        const userData = this.apiService.getUserData();
        if (userData && (userData.accountType === 1 || userData.accountType === 2)) {
          console.log('DriveGuard - User has teacher/admin access');
          return true;
        } else {
          console.log('DriveGuard - User is not teacher/admin, access denied');
          this.router.navigate(['/drive-login']);
          return false;
        }
      }

      console.log('DriveGuard - User not authenticated, redirecting to drive login');
      this.router.navigate(['/drive-login']);
      return false;
      
    } catch (error) {
      console.error('DriveGuard - Error checking authentication:', error);
      this.router.navigate(['/drive-login']);
      return false;
    }
  }
}
