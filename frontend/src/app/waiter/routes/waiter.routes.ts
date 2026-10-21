import { Routes } from '@angular/router';

export const waiterRoutes: Routes = [
  {
    path: '',
    title: 'Mesero',
    loadComponent: () =>
      import('@waiter/_layout/waiter-layout.component').then((m) => m.default),
    children: [
      {
        path: '',
        redirectTo: 'mesas',
        pathMatch: 'full',
      },
      {
        path: 'pedidos',
        title: 'Mis Pedidos',
        loadComponent: () =>
          import('@waiter/pages/pedidos/waiter-pedidos-page.component').then(
            (m) => m.default,
          ),
      },
      {
        path: 'mesas',
        title: 'Mesas',
        loadComponent: () =>
          import('@waiter/pages/mesas/waiter-mesas-page.component').then(
            (m) => m.default,
          ),
      },
      {
        path: 'nuevo-pedido',
        redirectTo: 'mesas',
        pathMatch: 'full',
      },
      {
        path: 'perfil',
        title: 'Mi Perfil',
        loadComponent: () =>
          import('@waiter/pages/perfil/perfil.component').then(
            (m) => m.default,
          ),
      },
      {
        path: '**',
        title: 'Redirigiendo...',
        redirectTo: 'mesas',
        pathMatch: 'full',
      },
    ],
  },
];

export default waiterRoutes;
