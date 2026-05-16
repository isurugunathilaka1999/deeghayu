import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../utils/errors';

export class GalleryService {
  async getAlbums(onlyApproved: boolean) {
    const where = onlyApproved ? 'WHERE ga."isApproved" = true' : '';
    const result = await pool.query(
      `SELECT ga.*,
              m."fullName" AS "creatorName",
              m."membershipId" AS "creatorMembershipId",
              m."profilePhoto" AS "creatorPhoto",
              (SELECT COUNT(*) FROM gallery_images gi WHERE gi."albumId" = ga.id AND gi."isApproved" = true)::int AS "imageCount"
       FROM gallery_albums ga
       JOIN members m ON m.id = ga."createdBy"
       ${where}
       ORDER BY ga."createdAt" DESC`
    );
    return result.rows.map(({ creatorName, creatorMembershipId, creatorPhoto, ...a }) => ({
      ...a,
      creator: { fullName: creatorName, membershipId: creatorMembershipId, profilePhoto: creatorPhoto },
    }));
  }

  async getAlbum(id: string, isAdmin: boolean) {
    const albumResult = await pool.query(
      `SELECT ga.*, m."fullName" AS "creatorName", m."membershipId" AS "creatorMembershipId"
       FROM gallery_albums ga
       JOIN members m ON m.id = ga."createdBy"
       WHERE ga.id = $1`,
      [id]
    );
    if (!albumResult.rows[0]) throw new NotFoundError('Album not found');
    const { creatorName, creatorMembershipId, ...album } = albumResult.rows[0];

    const imagesResult = await pool.query(
      `SELECT gi.*, m."fullName" AS "uploaderName"
       FROM gallery_images gi
       JOIN members m ON m.id = gi."uploadedBy"
       WHERE gi."albumId" = $1 ${!isAdmin ? 'AND gi."isApproved" = true' : ''}
       ORDER BY gi."createdAt" DESC`,
      [id]
    );

    return {
      ...album,
      creator: { fullName: creatorName, membershipId: creatorMembershipId },
      images: imagesResult.rows.map(({ uploaderName, ...img }) => ({
        ...img,
        uploader: { fullName: uploaderName },
      })),
    };
  }

  async createAlbum(data: { title: string; description?: string; coverImage?: string; createdBy: string }) {
    const result = await pool.query(
      `INSERT INTO gallery_albums (id, title, description, "coverImage", "createdBy", "isApproved", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, false, NOW(), NOW()) RETURNING *`,
      [uuidv4(), data.title, data.description || null, data.coverImage || null, data.createdBy]
    );
    return result.rows[0];
  }

  async addImage(albumId: string, data: { imageUrl: string; caption?: string; uploadedBy: string }) {
    const album = await pool.query('SELECT id, "isApproved" FROM gallery_albums WHERE id = $1', [albumId]);
    if (!album.rows[0]) throw new NotFoundError('Album not found');

    const result = await pool.query(
      `INSERT INTO gallery_images (id, "albumId", "imageUrl", caption, "uploadedBy", "isApproved", "createdAt")
       VALUES ($1, $2, $3, $4, $5, false, NOW()) RETURNING *`,
      [uuidv4(), albumId, data.imageUrl, data.caption || null, data.uploadedBy]
    );
    return result.rows[0];
  }

  async approveAlbum(id: string, adminUserId: string) {
    const result = await pool.query(
      `UPDATE gallery_albums SET "isApproved" = true, "approvedBy" = $1, "approvedAt" = NOW(), "updatedAt" = NOW()
       WHERE id = $2 RETURNING *`,
      [adminUserId, id]
    );
    if (!result.rows[0]) throw new NotFoundError('Album not found');
    return result.rows[0];
  }

  async rejectAlbum(id: string) {
    const result = await pool.query(
      `DELETE FROM gallery_albums WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Album not found');
  }

  async approveImage(id: string, adminUserId: string) {
    const result = await pool.query(
      `UPDATE gallery_images SET "isApproved" = true, "approvedBy" = $1, "approvedAt" = NOW()
       WHERE id = $2 RETURNING *`,
      [adminUserId, id]
    );
    if (!result.rows[0]) throw new NotFoundError('Image not found');
    return result.rows[0];
  }

  async rejectImage(id: string) {
    const result = await pool.query(
      `DELETE FROM gallery_images WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rows[0]) throw new NotFoundError('Image not found');
  }

  async getPending() {
    const [albumsResult, imagesResult] = await Promise.all([
      pool.query(
        `SELECT ga.*, m."fullName" AS "creatorName", m."membershipId" AS "creatorMembershipId"
         FROM gallery_albums ga
         JOIN members m ON m.id = ga."createdBy"
         WHERE ga."isApproved" = false
         ORDER BY ga."createdAt" ASC`
      ),
      pool.query(
        `SELECT gi.*, m."fullName" AS "uploaderName", ga.title AS "albumTitle"
         FROM gallery_images gi
         JOIN members m ON m.id = gi."uploadedBy"
         JOIN gallery_albums ga ON ga.id = gi."albumId"
         WHERE gi."isApproved" = false
         ORDER BY gi."createdAt" ASC`
      ),
    ]);

    return {
      albums: albumsResult.rows.map(({ creatorName, creatorMembershipId, ...a }) => ({
        ...a,
        creator: { fullName: creatorName, membershipId: creatorMembershipId },
      })),
      images: imagesResult.rows.map(({ uploaderName, albumTitle, ...i }) => ({
        ...i,
        uploader: { fullName: uploaderName },
        album: { title: albumTitle },
      })),
    };
  }
}
