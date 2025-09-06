import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordReportComponent } from './record-report.component';

describe('RecordReportComponent', () => {
  let component: RecordReportComponent;
  let fixture: ComponentFixture<RecordReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordReportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
