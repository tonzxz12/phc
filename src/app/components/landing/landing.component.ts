import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  
  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  scrollToPlatforms() {
    const platformsSection = document.getElementById('platforms');
    if (platformsSection) {
      platformsSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  navigateToLMS() {
    this.router.navigate(['/lms-login']);
  }

  navigateToDrive() {
    this.router.navigate(['/drive-login']);
  }

  navigateToGeriaHealth() {
    window.open('https://geria-health.vercel.app/', '_blank');
  }

  navigateToVoiceCloning() {
    window.open('https://geria-health.vercel.app/', '_blank');
  }
}
