import { TestBed } from '@angular/core/testing';

import { SpeechlabGuard } from './speechlab.guard';

describe('SpeechlabGuard', () => {
  let guard: SpeechlabGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(SpeechlabGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
