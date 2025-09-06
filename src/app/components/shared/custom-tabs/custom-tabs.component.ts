import { Component, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { CustomTabPanelComponent } from './custom-tab-panel.component';

@Component({
  selector: 'app-custom-tabs',
  templateUrl: './custom-tabs.component.html',
  styleUrls: ['./custom-tabs.component.css']
})
export class CustomTabsComponent implements AfterContentInit {
  @ContentChildren(CustomTabPanelComponent) panels!: QueryList<CustomTabPanelComponent>;
  selectedIndex: number = 0;

  ngAfterContentInit() {
    this.panels.toArray().forEach((panel, index) => {
      panel.active = index === this.selectedIndex;
    });
  }

  selectTab(index: number) {
    this.selectedIndex = index;
    this.panels.toArray().forEach((panel, i) => {
      panel.active = i === index;
    });
  }
}
