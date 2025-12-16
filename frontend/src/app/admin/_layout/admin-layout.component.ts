import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  AdminLayoutSideBarComponent,
  AdminLayoutContentComponent,
} from '@admin/_layout/components';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'admin-layout',
  imports: [AdminLayoutSideBarComponent, AdminLayoutContentComponent],
  templateUrl: './admin-layout.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  // Controla el menú lateral en móviles (offcanvas)
  public sidebarOpen = signal(false);

  public toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  public closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}

export default AdminLayoutComponent;
