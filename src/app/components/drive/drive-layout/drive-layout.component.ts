import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-drive-layout',
  templateUrl: './drive-layout.component.html',
  styleUrls: ['./drive-layout.component.css']
})
export class DriveLayoutComponent implements OnInit {
  sidebarOpen: boolean = true;
  currentView: string = 'my-files';

  constructor() { }

  ngOnInit(): void {
  }

  onSidebarToggle(isOpen: boolean): void {
    this.sidebarOpen = isOpen;
  }

  onViewChange(view: string): void {
    this.currentView = view;
    // You can pass this to child components if needed
  }
}
