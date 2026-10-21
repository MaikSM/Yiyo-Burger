import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    title: 'Admin',
    loadComponent: () => import('@admin/_layout/admin-layout.component'),
    children: [
      {
        path: '',
        title: 'Mesas',
        loadComponent: () =>
          import('@admin/pages/mesas/admin-mesas-page.component'),
      },
      {
        path: 'domicilios',
        title: 'Domicilios',
        loadComponent: () =>
          import('@admin/pages/domicilios/admin-domicilios-page.component'),
      },
      {
        path: 'roles',
        title: 'Roles',
        loadComponent: () =>
          import('@admin/pages/roles/admin-roles-page.component'),
      },
      {
        path: 'roles/create',
        title: 'Create Roles',
        loadComponent: () =>
          import('@admin/pages/roles/create/admin-roles-create-page.component'),
      },
      {
        path: 'roles/edit/:id',
        title: 'Edit Roles',
        loadComponent: () =>
          import('@admin/pages/roles/edit/admin-roles-edit-page.component'),
      },

      {
        path: 'users',
        title: 'Users',
        loadComponent: () =>
          import('@admin/pages/users/admin-users-page.component'),
      },
      {
        path: 'users/create',
        title: 'Create Users',
        loadComponent: () =>
          import('@admin/pages/users/create/admin-users-create-page.component'),
      },
      {
        path: 'users/edit/:id',
        title: 'Edit Users',
        loadComponent: () =>
          import('@admin/pages/users/edit/admin-users-edit-page.component'),
      },
      {
        path: 'clientes',
        title: 'Historial de Clientes',
        loadComponent: () =>
          import('@admin/pages/clientes/admin-clientes-page.component'),
      },
      {
        path: 'menu',
        title: 'Menú',
        loadComponent: () =>
          import('@admin/pages/inventario/admin-inventario-page.component'),
      },
      {
        path: 'inventario',
        title: 'Inventario',
        loadComponent: () =>
          import('@admin/pages/inventario/admin-inventario-page.component'),
      },
      {
        path: 'inventario/create',
        title: 'Create Inventario',
        loadComponent: () =>
          import(
            '@admin/pages/inventario/create/admin-inventario-create-page.component'
          ),
      },
      {
        path: 'inventario/edit/:movimiento_id',
        title: 'Edit Inventario',
        loadComponent: () =>
          import(
            '@admin/pages/inventario/edit/admin-inventario-edit-page.component'
          ),
      },
      {
        path: 'reservas-mesas',
        title: 'Reservas de Mesas',
        loadComponent: () =>
          import('@admin/pages/reservas/admin-reservas-page.component'),
      },
      {
        path: 'reservas-mesas/create-mesa',
        title: 'Crear Mesa',
        loadComponent: () =>
          import(
            '@admin/pages/reservas/create/admin-reservas-create-mesa-page.component'
          ),
      },
      {
        path: 'reservas-mesas/create-reserva',
        title: 'Crear Reserva',
        loadComponent: () =>
          import(
            '@admin/pages/reservas/create/admin-reservas-create-reserva-page.component'
          ),
      },
      {
        path: 'reservas-mesas/edit-mesa/:id',
        title: 'Editar Mesa',
        loadComponent: () =>
          import(
            '@admin/pages/reservas/edit/admin-reservas-edit-mesa-page.component'
          ),
      },
      {
        path: 'reservas-mesas/edit-reserva/:id',
        title: 'Editar Reserva',
        loadComponent: () =>
          import(
            '@admin/pages/reservas/edit/admin-reservas-edit-page.component'
          ),
      },
      {
        path: 'nomina',
        title: 'Nómina',
        loadComponent: () =>
          import('@admin/pages/nomina/admin-nomina-page.component'),
      },
      {
        path: 'asistencia',
        title: 'Asistencia y Nómina',
        loadComponent: () =>
          import('@admin/pages/nomina/admin-nomina-page.component'),
      },
      {
        path: 'asistencia/historial',
        title: 'Historial de Asistencia',
        loadComponent: () =>
          import('@admin/pages/asistencia/admin-asistencia-historial-page.component').then(m => m.AdminAsistenciaHistorialPageComponent),
      },
      {
        path: 'reportes',
        title: 'Reportes',
        loadComponent: () => 
          import('@admin/pages/reportes/admin-reportes-page.component'),
      },

      {
        path: 'impresoras',
        title: 'Impresoras',
        loadComponent: () =>
          import('@admin/pages/impresoras/admin-impresoras-page.component'),
      },
      {
        path: 'profile',
        title: 'Perfil',
        loadComponent: () =>
          import('@private/pages/profile/private-profile-page.component'),
      },
      {
        path: '**',
        title: 'Redirecting ... ',
        redirectTo: '',
        pathMatch: 'full',
      },
    ],
  },
];

export default adminRoutes;
