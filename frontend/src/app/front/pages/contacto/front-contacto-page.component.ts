import { Component } from '@angular/core';

@Component({
  selector: 'app-front-contacto-page',
  standalone: true,
  imports: [],
  templateUrl: './front-contacto-page.component.html',
  styles: ``,
})
export class FrontContactoPageComponent {
  currentYear = new Date().getFullYear();
}