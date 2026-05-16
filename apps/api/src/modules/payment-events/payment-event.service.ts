import { v4 as uuidv4 } from 'uuid';
import { pool } from '../../config/database';
import { PaymentStatus, PaymentType } from '../../types';
import { NotFoundError } from '../../utils/errors';

export class PaymentEventService {
  async create(data: {
    title: string;
    type: PaymentType;
    customType?: string;
    amount: number;
    dueDate: string;
    month?: number;
    year?: number;
    description?: string;
    recordedBy: string;
  }) {
    const dueDate = new Date(data.dueDate);
    const month = data.month || (dueDate.getMonth() + 1);
    const year = data.year || dueDate.getFullYear();
    const isPastDue = dueDate < new Date();
    const initialStatus: PaymentStatus = isPastDue ? 'OVERDUE' : 'PENDING';
    const customType = (data.type === 'CUSTOM' && data.customType?.trim()) ? data.customType.trim() : null;
    const amount = Number(data.amount);

    const eventId = uuidv4();
    await pool.query(
      `INSERT INTO payment_events (id, title, type, "customType", amount, "dueDate", month, year, description, "recordedBy", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [eventId, data.title, data.type, customType, amount, dueDate, month, year, data.description || null, data.recordedBy]
    );

    const membersRes = await pool.query(`SELECT id FROM members WHERE status = 'ACTIVE'`);
    const memberIds: string[] = membersRes.rows.map((r: any) => r.id);

    if (memberIds.length > 0) {
      const rows: string[] = [];
      const params: any[] = [];
      let i = 1;
      for (const memberId of memberIds) {
        rows.push(`($${i},$${i+1},$${i+2},$${i+3},$${i+4},$${i+5},$${i+6},$${i+7},NULL,$${i+8},$${i+9},$${i+10},$${i+11},$${i+12},NOW(),NOW())`);
        params.push(uuidv4(), memberId, data.type, customType, initialStatus, amount, 0, dueDate, month, year, data.description || null, data.recordedBy, eventId);
        i += 13;
      }
      await pool.query(
        `INSERT INTO payments (id, "memberId", type, "customType", status, amount, "paidAmount", "dueDate", "paidAt", month, year, description, "recordedBy", "eventId", "createdAt", "updatedAt")
         VALUES ${rows.join(',')}`,
        params
      );
    }

    return { id: eventId, memberCount: memberIds.length };
  }

  async getActive() {
    const result = await pool.query(`
      SELECT
        pe.*,
        COUNT(p.id)::int                                                  AS "totalCount",
        COUNT(p.id) FILTER (WHERE p.status = 'PAID')::int                AS "paidCount",
        COUNT(p.id) FILTER (WHERE p.status = 'OVERDUE')::int             AS "overdueCount",
        COALESCE(SUM(p."paidAmount"), 0)::numeric                        AS "collectedAmount"
      FROM payment_events pe
      LEFT JOIN payments p ON p."eventId" = pe.id
      GROUP BY pe.id
      HAVING COUNT(p.id) FILTER (WHERE p.status NOT IN ('PAID', 'WAIVED')) > 0
      ORDER BY pe."dueDate" ASC
    `);
    return result.rows;
  }

  async getById(eventId: string) {
    const eventRes = await pool.query(`SELECT * FROM payment_events WHERE id = $1`, [eventId]);
    if (!eventRes.rows[0]) throw new NotFoundError('Payment event not found');

    const paymentsRes = await pool.query(`
      SELECT p.*, m."fullName", m."membershipId"
      FROM payments p
      JOIN members m ON m.id = p."memberId"
      WHERE p."eventId" = $1
      ORDER BY
        CASE p.status
          WHEN 'OVERDUE'  THEN 1
          WHEN 'PENDING'  THEN 2
          WHEN 'PARTIAL'  THEN 3
          ELSE 4
        END,
        m."fullName" ASC
    `, [eventId]);

    const payments = paymentsRes.rows.map(({ fullName, membershipId, ...p }: any) => ({
      ...p,
      member: { fullName, membershipId },
    }));

    const totalCount = payments.length;
    const paidCount = payments.filter((p: any) => p.status === 'PAID' || p.status === 'WAIVED').length;
    const collectedAmount = payments.reduce((s: number, p: any) => s + Number(p.paidAmount), 0);

    return { ...eventRes.rows[0], payments, totalCount, paidCount, collectedAmount };
  }
}
