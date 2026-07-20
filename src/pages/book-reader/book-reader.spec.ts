import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookReader } from './book-reader';

describe('BookReader', () => {
  let component: BookReader;
  let fixture: ComponentFixture<BookReader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookReader],
    }).compileComponents();

    fixture = TestBed.createComponent(BookReader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
