import { Router } from 'express';
import * as galleryController from './gallery.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeMinRole } from '../../middleware/authorize';
import { Role } from '../../types';

const router = Router();

router.use(authenticate);

router.get('/albums', galleryController.getAlbums);
router.post('/albums', galleryController.createAlbum);
router.get('/albums/:id', galleryController.getAlbum);
router.post('/albums/:id/images', galleryController.addImage);
router.get('/pending', authorizeMinRole(Role.COMMITTEE_MEMBER), galleryController.getPending);
router.patch('/albums/:id/approve', authorizeMinRole(Role.COMMITTEE_MEMBER), galleryController.approveAlbum);
router.patch('/albums/:id/reject', authorizeMinRole(Role.COMMITTEE_MEMBER), galleryController.rejectAlbum);
router.patch('/images/:id/approve', authorizeMinRole(Role.COMMITTEE_MEMBER), galleryController.approveImage);
router.patch('/images/:id/reject', authorizeMinRole(Role.COMMITTEE_MEMBER), galleryController.rejectImage);

export default router;
