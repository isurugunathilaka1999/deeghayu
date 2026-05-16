import { Router } from 'express';
import * as controller from './payment-event.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorizeMinRole } from '../../middleware/authorize';
import { Role } from '../../types';

const router = Router();
router.use(authenticate);
router.use(authorizeMinRole(Role.TREASURER));

router.get('/', controller.getActive);
router.post('/', controller.create);
router.get('/:id', controller.getById);

export default router;
