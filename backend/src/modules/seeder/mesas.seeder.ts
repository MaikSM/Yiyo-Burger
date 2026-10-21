import { DatabaseConnection } from '../../core/database/DatabaseConnection';
import { MesaEntity } from '../mesas/entities/mesa.entity';

export class MesasSeeder {
  static async run(): Promise<void> {
    try {
      const mesaRepository =
        DatabaseConnection.appDataSource.getRepository(MesaEntity);

      // Verificar si ya existen mesas
      const existingMesas = await mesaRepository.count();
      if (existingMesas > 0) {
        console.log('Las mesas ya están creadas en la base de datos');
        return;
      }

      // Crear 5 mesas con diferentes características
      const mesas = [
        // Mesas pequeñas (2 personas) - Interior
        {
          numero: 1,
          capacidad: 2,
          estado: 'libre' as const,
          ubicacion: 'Interior - Ventana',
        },
        {
          numero: 2,
          capacidad: 2,
          estado: 'libre' as const,
          ubicacion: 'Interior - Ventana',
        },

        // Mesas medianas (4 personas) - Interior
        {
          numero: 3,
          capacidad: 4,
          estado: 'libre' as const,
          ubicacion: 'Interior - Centro',
        },
        {
          numero: 4,
          capacidad: 4,
          estado: 'libre' as const,
          ubicacion: 'Interior - Centro',
        },

        // Mesa grande (6 personas) - Interior
        {
          numero: 5,
          capacidad: 6,
          estado: 'libre' as const,
          ubicacion: 'Interior - Privada',
        },
      ];

      await mesaRepository.save(mesas);

      console.log('✅ Se han creado 5 mesas exitosamente en la base de datos');
      console.log('📊 Resumen:');
      console.log('   - Mesas pequeñas (2 personas): 2 mesas');
      console.log('   - Mesas medianas (4 personas): 2 mesas');
      console.log('   - Mesas grandes (6 personas): 1 mesa');
      console.log('   - Todas las mesas están en estado "libre"');
    } catch (error) {
      console.error('❌ Error al crear las mesas:', error);
      throw error;
    }
  }
}
