import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { APIService } from './services/API/api.service';

import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { PrimeNG } from 'primeng/config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  environment= environment;
  constructor(
    private API: APIService, private renderer: Renderer2, private cdr:ChangeDetectorRef) {}

      
  async ngOnInit() {
    
      if(!environment.debug){
        window.console.log = () => {}
        window.console.warn = ()=> {}
      }
      // this.checkNetworkStatus();
     const dark =  localStorage.getItem('dark');
     if(dark){
        if(dark == 'true'){
            this.enableDarkMode()
        }
     }

     const websocket = new WebSocket(environment.contentAPI.replaceAll('/system','') + '/sys-websocket');
         websocket.onopen = () => {
          websocket.onmessage = async (message) => {
            const messages = message.data.replaceAll('"','').trim().split(' ');
            if(messages.includes(window.location.hostname.split(':')[0])){
              // await this.API.reInit();
              if(environment.maintenance){
                this.renderer.removeClass(document.body, 'custom:ml-20');
                this.renderer.removeClass(document.body, 'custom:ml-64'); 
              }
              this.cdr.detectChanges(); 
              
            }
             
           };
         };
     

    //  await this.API.reInit(); 

  }

  

  initializedConfig(){
    return this.API.initializedConfig;
  }

  ngOnDestroy(): void {
      // this.networkStatus$.unsubscribe();
  }

  title = 'quanlab';

  logout() {
    this.renderer.removeClass(document.body, 'min-[768px]:ml-64');
    this.API.logout(); 
  }

  // @HostListener('document:contextmenu', ['$event'])
  // onContextMenu(event: MouseEvent): void {
  //   event.preventDefault();
  // }

  enableDarkMode() {
    document.querySelector('html')?.classList.add('dark');
  }

  // Disable dark mode
  disableDarkMode() {
    document.querySelector('html')?.classList.remove('dark');
  }

  
  
  private disableContextMenu(): void {
    this.disableCtrlShiftKeys();
    this.renderer.listen('document', 'contextmenu', (event) => {
      event.preventDefault();
      this.API.failedSnackbar('Right Click is Disabled!');

    });
  }

  private disableCtrlShiftKeys(): void {
    this.renderer.listen('document', 'keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'I' || event.key === 'C')) {
        event.preventDefault();
        this.API.failedSnackbar('Ctrl+Shift+' + event.key + ' is Disabled!');
      }
    });
  }
  
}
