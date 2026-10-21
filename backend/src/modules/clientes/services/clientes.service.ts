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

  async create(createClienteDto: CreateClienteDto): Promise<ClienteEntity> {
    const newCliente = this.clienteRepository.create(createClienteDto);
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
