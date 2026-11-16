import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgxSonnerToaster],
  template: `
    <ngx-sonner-toaster
      [expand]="false"
      [visibleToasts]="1"
      [duration]="1600"
      [closeButton]="false"
      position="top-center"
      richColors
    />

    <router-outlet />
  `,
})
export class AppComponent {}
