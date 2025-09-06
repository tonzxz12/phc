import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { LoaderService } from '../../API/services-includes/loader.service';

@Injectable({
  providedIn: 'root'
})
export class LoaderGuard  {

  constructor(private loaderService: LoaderService) {}
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

  //   console.log('LoaderGuard activated');
  //   this.loaderService.show(); // Show loader
  //  setTimeout(() => {
  //    this.loaderService.hide();
  //     console.log('Hiding loader');
  //   }, 2000); // Hide after 3 seconds
    return true; // Proceed with navigation
  }

}
