import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvaluationReportComponent } from './evaluation-report.component';

describe('EvaluationReportComponent', () => {
  let component: EvaluationReportComponent;
  let fixture: ComponentFixture<EvaluationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluationReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
