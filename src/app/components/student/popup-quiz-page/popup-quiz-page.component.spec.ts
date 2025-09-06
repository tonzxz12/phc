import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopupQuizPageComponent } from './popup-quiz-page.component';

describe('PopupQuizPageComponent', () => {
  let component: PopupQuizPageComponent;
  let fixture: ComponentFixture<PopupQuizPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PopupQuizPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopupQuizPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
