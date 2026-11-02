import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FloatingMenu } from './floating-menu';
import { MenuItem } from '../../navigation/domain/menu-item.model';

describe('FloatingMenu', () => {
  let fixture: ComponentFixture<FloatingMenu>;
  let component: FloatingMenu;

  const mockItems: MenuItem[] = [
    { label: 'Home', route: '/' },
    {
      label: 'Ensino',
      route: '/ensino',
      children: [{ label: 'Cursos', route: '/ensino/cursos' }],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingMenu],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingMenu);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', mockItems);
    fixture.detectChanges();
  });

  it('deve exibir "▴" quando o item com submenu não estiver aberto/clicado', () => {
    const caret = fixture.nativeElement.querySelector('.floating-menu__caret');
    expect(caret?.textContent?.trim()).toBe('▴');
  });

  it('deve alternar para "▾" quando o mouse passar por cima do item ou for acionado', () => {
    const itemWithSubmenu = fixture.nativeElement.querySelectorAll('.floating-menu__item')[1];
    itemWithSubmenu.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    const caret = fixture.nativeElement.querySelector('.floating-menu__caret');
    expect(caret?.textContent?.trim()).toBe('▾');

    itemWithSubmenu.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(caret?.textContent?.trim()).toBe('▴');
  });
});

