import { Component, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { APIService } from 'src/app/services/API/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy{
  constructor(private api:APIService, private renderer:Renderer2, private elRef:ElementRef){}
  refresh:any
  ngOnInit(): void {
    if(this.api.getUserData()){
      this.api.refreshCookies();
      this.refresh = setInterval(()=>{
        this.api.refreshCookies();
      },1000 * 60 * 30)
    }
    const body: HTMLElement = this.elRef.nativeElement;
    const sidebar: HTMLElement = body.querySelector('nav') as HTMLElement;
    if (sidebar.classList.contains('close')) {
      this.renderer.removeClass(document.body, 'custom:ml-64');
      this.renderer.addClass(document.body, 'custom:ml-20');
    } else {
      this.renderer.removeClass(document.body, 'custom:ml-20');
      this.renderer.addClass(document.body, 'custom:ml-64');
    }


  }

  ngOnDestroy(): void {
    clearInterval(this.refresh);
  }
}
