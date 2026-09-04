import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CondominiumConfigPage } from './condominium-config.page';

describe('CondominiumConfigPage', () => {
  let component: CondominiumConfigPage;
  let fixture: ComponentFixture<CondominiumConfigPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CondominiumConfigPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CondominiumConfigPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
