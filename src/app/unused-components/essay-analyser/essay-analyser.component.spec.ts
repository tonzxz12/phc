import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EssayAnalyserComponent } from './essay-analyser.component';

describe('EssayAnalyserComponent', () => {
  let component: EssayAnalyserComponent;
  let fixture: ComponentFixture<EssayAnalyserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EssayAnalyserComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EssayAnalyserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
