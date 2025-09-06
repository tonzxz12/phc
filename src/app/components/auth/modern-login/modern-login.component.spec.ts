import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModernLoginComponent } from './modern-login.component';

describe('ModernLoginComponent', () => {
  let component: ModernLoginComponent;
  let fixture: ComponentFixture<ModernLoginComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModernLoginComponent]
    });
    fixture = TestBed.createComponent(ModernLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
