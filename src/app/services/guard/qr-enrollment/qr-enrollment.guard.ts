import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { APIService } from '../../API/api.service';

@Injectable({
    providedIn: 'root'
})
export class QrEnrollmentGuard implements CanActivate {
    constructor(private API: APIService, private router: Router) {}

    canActivate(route: ActivatedRouteSnapshot): boolean {
        console.log('QR Enrollment Guard triggered');
        console.log('Route params:', route.params);
        console.log('Route paramMap:', route.paramMap);
        
        const courseId = route.paramMap.get('courseId');
        console.log('Course ID from guard:', courseId);
        
        if (!this.API.isLoggedIn()) {
            console.log('User not logged in, storing courseId and redirecting');
            sessionStorage.setItem('qr_enrollment_course', courseId || '');
            this.router.navigate(['/login']);
            return false;
        }

        console.log('User is logged in, allowing access');
        return true;
    }
}