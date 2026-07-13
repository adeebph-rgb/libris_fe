import { TestBed } from '@angular/core/testing';

import { BookApi } from './book-api';

describe('BookApi', () => {
  let service: BookApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
