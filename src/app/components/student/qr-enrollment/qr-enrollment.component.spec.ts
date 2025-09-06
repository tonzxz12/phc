import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrEnrollmentComponent } from './qr-enrollment.component';

describe('QrEnrollmentComponent', () => {
  let component: QrEnrollmentComponent;
  let fixture: ComponentFixture<QrEnrollmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrEnrollmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrEnrollmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
