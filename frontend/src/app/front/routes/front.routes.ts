import { Routes } from '@angular/router';

export const frontRoutes: Routes = [
  {
    path: '',
    title: 'Front',
    loadComponent: () => import('../_layout/front-layout.component').then(m => m.FrontLayoutComponent),
    children: [
      {
        path: '',
        title: 'Home',
        loadComponent: () =>
          import('../pages/home/front-home-page.component').then(m => m.FrontHomePageComponent),
      },
      {
        path: 'menu',
        title: 'Menú',
        loadComponent: () =>
          import('../pages/menu/front-menu-page.component').then(m => m.FrontMenuPageComponent),
      },
      {
        path: 'camara',
        title: 'Cámara',
        loadComponent: () =>
          import('../pages/camera/front-camera-page.component').then(m => m.FrontCameraPageComponent),
      },
      {
        path: 'contacto',
        title: 'Contacto',
        loadComponent: () =>
          import('../pages/contacto/front-contacto-page.component').then(m => m.FrontContactoPageComponent),
      },
    ],
  },
];

export default frontRoutes;
