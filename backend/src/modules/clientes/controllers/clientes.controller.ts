import { Request, Response } from 'express';
import { ClientesService } from '../services/clientes.service';
import { CreateClienteDto } from '../dtos/create-cliente.dto';
import { UpdateClienteDto } from '../dtos/update-cliente.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class ClientesController {
  private clientesService = new ClientesService();

  async findAll(req: Request, res: Response) {
    try {
      const clientes = await this.clientesService.findAll();
      res.status(200).json(clientes);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener clientes', error: error.message });
    }
  }

  async findOne(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cliente = await this.clientesService.findOne(id);
      if (!cliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      res.status(200).json(cliente);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al obtener el cliente', error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const dto = plainToInstance(CreateClienteDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Datos inválidos', errors });
      }

      const newCliente = await this.clientesService.create(dto);
      res.status(201).json(newCliente);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al crear el cliente', error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dto = plainToInstance(UpdateClienteDto, req.body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        return res.status(400).json({ message: 'Datos inválidos', errors });
      }

      const updatedCliente = await this.clientesService.update(id, dto);
      if (!updatedCliente) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      res.status(200).json(updatedCliente);
    } catch (error: any) {
      res.status(500).json({ message: 'Error al actualizar el cliente', error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const success = await this.clientesService.remove(id);
      if (!success) {
        return res.status(404).json({ message: 'Cliente no encontrado' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: 'Error al eliminar el cliente', error: error.message });
    }
  }
}
