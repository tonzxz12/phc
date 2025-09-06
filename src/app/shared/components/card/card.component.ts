import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent implements OnInit {
  @Input() difficulty: number = 0;
  @Input() picture: string = '';
  @Input() number: string = '';
  @Input() lecture: string = '';
  @Input() profilepic: string = '';
  @Input() name: string = '';
  @Input() description: string = '';
  @Input() target_audience: string = '';
  @Input() objectives: string = '';
  @Input() job: string = '';
  @Input() enrolled: number = 0;


  targetAudience: string[] = [];

  ngOnInit() {
    this.targetAudience = this.target_audience.replace(/[{}]/g, '').split(',').map(item => item.trim());
  }
}
