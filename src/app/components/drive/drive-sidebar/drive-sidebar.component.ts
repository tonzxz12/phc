import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { APIService } from '../../../services/API/api.service';

@Component({
  selector: 'app-drive-sidebar',
  templateUrl: './drive-sidebar.component.html',
  styleUrls: ['./drive-sidebar.component.css']
})
export class DriveSidebarComponent implements OnInit {
  @Input() isOpen: boolean = true;
  @Output() sidebarToggle = new EventEmitter<boolean>();
  @Output() viewChange = new EventEmitter<string>();

  currentView: string = 'my-files';

  constructor(
    private router: Router,
    private apiService: APIService
  ) { }

  ngOnInit(): void {
    // Initialize with default view
    this.setCurrentView('my-files');
  }

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
    this.sidebarToggle.emit(this.isOpen);
  }

  setCurrentView(view: string): void {
    this.currentView = view;
    this.viewChange.emit(view);
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/lms-login']);
  }
}
