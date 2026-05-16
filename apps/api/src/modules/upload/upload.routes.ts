import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { upload, saveImage } from '../../utils/upload';
import { BadRequestError } from '../../utils/errors';

const router = Router();

router.use(authenticate);

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError('No image provided');
  const folder = (req.query.folder as string) || 'general';
  const url = await saveImage(req.file.buffer, folder);
  res.json({ success: true, data: { url } });
});

export default router;
