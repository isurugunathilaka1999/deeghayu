import { Request, Response } from 'express';
import { PaymentEventService } from './payment-event.service';

const service = new PaymentEventService();

export const create = async (req: Request, res: Response) => {
  const result = await service.create({ ...req.body, recordedBy: req.user!.id });
  res.status(201).json({ success: true, data: result });
};

export const getActive = async (req: Request, res: Response) => {
  const result = await service.getActive();
  res.json({ success: true, data: result });
};

export const getById = async (req: Request, res: Response) => {
  const result = await service.getById(req.params.id);
  res.json({ success: true, data: result });
};
