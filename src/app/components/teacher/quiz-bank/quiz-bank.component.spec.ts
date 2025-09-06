import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizBankComponent } from './quiz-bank.component';

describe('QuizBankComponent', () => {
  let component: QuizBankComponent;
  let fixture: ComponentFixture<QuizBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizBankComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
