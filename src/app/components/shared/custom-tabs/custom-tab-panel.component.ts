import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-custom-tab-panel',
  template: '<div [hidden]="!active"><ng-content></ng-content></div>'
})
export class CustomTabPanelComponent {
  @Input() title!: string;
  active: boolean = false;
}
