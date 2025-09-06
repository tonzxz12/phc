import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecordSpeechComponent } from './record-speech.component';

describe('RecordSpeechComponent', () => {
  let component: RecordSpeechComponent;
  let fixture: ComponentFixture<RecordSpeechComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecordSpeechComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecordSpeechComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
