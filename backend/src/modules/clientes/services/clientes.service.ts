import { DatabaseConnection } from '../../../core/database/DatabaseConnection';
import { ClienteEntity } from '../entities/cliente.entity';
import { CreateClienteDto } from '../dtos/create-cliente.dto';
import { UpdateClienteDto } from '../dtos/update-cliente.dto';

export class ClientesService {
  private clienteRepository = DatabaseConnection.appDataSource.getRepository(ClienteEntity);

  async findAll(): Promise<ClienteEntity[]> {
    return this.clienteRepository.find({
      order: {
        nombre: 'ASC'
      }
    });
  }

  async findOne(id: string): Promise<ClienteEntity | null> {
    return this.clienteRepository.findOneBy({ cliente_id: id });
  }

  /** Deja solo dígitos y quita el indicativo de Colombia (57) si viene incluido. */
  private normalizePhone(value: unknown): string {
    let digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('57')) digits = digits.slice(2);
    return digits;
  }

  private cleanText(value: unknown): string {
    return String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Busca un cliente cuyo teléfono coincida EXACTAMENTE (tras normalizar, mínimo 7 dígitos). */
  async findByPhone(telefono: unknown): Promise<ClienteEntity | null> {
    const target = this.normalizePhone(telefono);
    if (target.length < 7) return null;
    const clientes = await this.clienteRepository.find();
    return clientes.find(c => this.normalizePhone(c.telefono) === target) || null;
  }

  /**
   * Crea un cliente o, si ya existe uno con el mismo teléfono, lo ACTUALIZA
   * (evita clientes duplicados al registrar domicilios o migrar mesas a domicilio).
   */
  async create(createClienteDto: CreateClienteDto): Promise<ClienteEntity> {
    const data: any = {
      ...createClienteDto,
      nombre: this.cleanText(createClienteDto.nombre),
      telefono: createClienteDto.telefono !== undefined ? this.cleanText(createClienteDto.telefono) : undefined,
      direccion: createClienteDto.direccion !== undefined ? this.cleanText(createClienteDto.direccion) : undefined,
      barrio: createClienteDto.barrio !== undefined ? this.cleanText(createClienteDto.barrio) : undefined,
    };

    const existing = await this.findByPhone(data.telefono);
    if (existing) {
      // Solo se sobrescriben los campos que vienen con valor (no se borra info existente)
      for (const key of ['nombre', 'telefono', 'direccion', 'barrio']) {
        if (data[key]) (existing as any)[key] = data[key];
      }
      return this.clienteRepository.save(existing);
    }

    const newCliente = this.clienteRepository.create(data as Partial<ClienteEntity>);
    return this.clienteRepository.save(newCliente);
  }

  async update(id: string, updateClienteDto: UpdateClienteDto): Promise<ClienteEntity | null> {
    const cliente = await this.findOne(id);
    if (!cliente) {
      return null;
    }
    this.clienteRepository.merge(cliente, updateClienteDto);
    return this.clienteRepository.save(cliente);
  }

  async remove(id: string): Promise<boolean> {
    const cliente = await this.findOne(id);
    if (!cliente) {
      return false;
    }
    await this.clienteRepository.remove(cliente);
    return true;
  }
}
