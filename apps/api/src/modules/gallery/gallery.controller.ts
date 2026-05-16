import { Request, Response } from 'express';
import { GalleryService } from './gallery.service';

const galleryService = new GalleryService();

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'COMMITTEE_MEMBER'];

export const getAlbums = async (req: Request, res: Response) => {
  const isAdmin = ADMIN_ROLES.includes(req.user!.role);
  const result = await galleryService.getAlbums(!isAdmin);
  res.json({ success: true, data: result });
};

export const getAlbum = async (req: Request, res: Response) => {
  const isAdmin = ADMIN_ROLES.includes(req.user!.role);
  const result = await galleryService.getAlbum(req.params.id, isAdmin);
  res.json({ success: true, data: result });
};

export const createAlbum = async (req: Request, res: Response) => {
  const result = await galleryService.createAlbum({
    ...req.body,
    createdBy: req.user!.memberId!,
  });
  res.status(201).json({ success: true, data: result });
};

export const addImage = async (req: Request, res: Response) => {
  const result = await galleryService.addImage(req.params.id, {
    ...req.body,
    uploadedBy: req.user!.memberId!,
  });
  res.status(201).json({ success: true, data: result });
};

export const approveAlbum = async (req: Request, res: Response) => {
  const result = await galleryService.approveAlbum(req.params.id, req.user!.id);
  res.json({ success: true, data: result });
};

export const rejectAlbum = async (req: Request, res: Response) => {
  await galleryService.rejectAlbum(req.params.id);
  res.json({ success: true, message: 'Album rejected and removed' });
};

export const approveImage = async (req: Request, res: Response) => {
  const result = await galleryService.approveImage(req.params.id, req.user!.id);
  res.json({ success: true, data: result });
};

export const rejectImage = async (req: Request, res: Response) => {
  await galleryService.rejectImage(req.params.id);
  res.json({ success: true, message: 'Image rejected and removed' });
};

export const getPending = async (req: Request, res: Response) => {
  const result = await galleryService.getPending();
  res.json({ success: true, data: result });
};
