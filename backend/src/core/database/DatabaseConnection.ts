import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DatabaseConfig } from '../config/database.config';

import { RoleEntity } from '../../modules/role/entities/role.entity';
import { UserEntity } from '../../modules/user/entities/user.entity';
import { IngredienteEntity } from '../../modules/inventario/entities/ingrediente.entity';
import { InventarioEntity } from '../../modules/inventario/entities/inventario.entity';
import { MesaEntity } from '../../modules/mesas/entities/mesa.entity';
import { PedidoEntity } from '../../modules/pedidos/entities/pedido.entity';
import { PlatoEntity } from '../../modules/menu/entities/plato.entity';
import { CategoriaEntity } from '../../modules/categorias/entities/categoria.entity';
import { ClienteEntity } from '../../modules/clientes/entities/cliente.entity';
import { ProveedorEntity } from '../../modules/proveedores/entities/proveedor.entity';
import { OrdenCompraEntity } from '../../modules/proveedores/entities/orden-compra.entity';
import { FacturaProveedorEntity } from '../../modules/proveedores/entities/factura-proveedor.entity';
import { HistorialPagoEntity } from '../../modules/proveedores/entities/historial-pago.entity';
import { CierreCajaEntity } from '../../modules/config/entities/cierre-caja.entity';
import { GastoEntity } from '../../modules/config/entities/gasto.entity';
import { SystemSecurityEntity } from '../../modules/config/entities/system-security.entity';
import { BarrioEntity } from '../../modules/barrios/entities/barrio.entity';
import { PagoNominaEntity } from '../../modules/nomina/entities/pago-nomina.entity';
import { AsistenciaEntity } from '../../modules/nomina/entities/asistencia.entity';
import { PrintJobEntity } from '../../modules/impresion/entities/print-job.entity';
import { DailySequenceEntity } from '../../modules/impresion/entities/daily-sequence.entity';

// Define una clase para manejar la conexión a la base de datos.
export class DatabaseConnection {
  // Declara una propiedad estática para almacenar la instancia de la conexión a la base de datos.
  public static appDataSource: DataSource = new DataSource({
    ...DatabaseConfig.getDataSourceOptions(),
    entities: [
      RoleEntity,
      UserEntity,
      IngredienteEntity,
      InventarioEntity,
      MesaEntity,
      PedidoEntity,
      PlatoEntity,
      CategoriaEntity,
      ClienteEntity,
      ProveedorEntity,
      OrdenCompraEntity,
      FacturaProveedorEntity,
      HistorialPagoEntity,
      CierreCajaEntity,
      GastoEntity,
      SystemSecurityEntity,
      BarrioEntity,
      PagoNominaEntity,
      AsistenciaEntity,
      PrintJobEntity,
      DailySequenceEntity,
    ],
  });
}
