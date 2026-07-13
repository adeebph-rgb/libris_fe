import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mylibrary } from './mylibrary';

describe('Mylibrary', () => {
  let component: Mylibrary;
  let fixture: ComponentFixture<Mylibrary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mylibrary],
    }).compileComponents();

    fixture = TestBed.createComponent(Mylibrary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
