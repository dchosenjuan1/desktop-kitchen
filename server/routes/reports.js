import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();

function getDateRange(period) {
  const now = new Date();
  let startDate;

  switch (period) {
    case 'daily':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
  }

  return startDate.toISOString().split('T')[0];
}

// Bug #3 fix: Alias revenue -> total_revenue for frontend
// GET /api/reports/sales - sales summary
router.get('/sales', (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const startDate = getDateRange(period);

    const stats = get(`
      SELECT
        COUNT(*) as order_count,
        ROUND(SUM(subtotal), 2) as total_revenue,
        ROUND(AVG(total), 2) as avg_ticket,
        ROUND(SUM(tip), 2) as tip_total,
        ROUND(SUM(tax), 2) as tax_total
      FROM orders
      WHERE DATE(created_at) >= ?
        AND status IN ('completed', 'ready')
    `, [startDate]);

    res.json({
      period,
      startDate,
      ...stats,
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// Bug #4 fix: Alias total_revenue -> revenue for frontend
// GET /api/reports/top-items - top selling items
router.get('/top-items', (req, res) => {
  try {
    const { period = 'daily', limit = 10 } = req.query;
    const startDate = getDateRange(period);
    const limitNum = Math.min(parseInt(limit) || 10, 100);

    const items = all(`
      SELECT
        oi.item_name,
        SUM(oi.quantity) as quantity_sold,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at) >= ?
        AND o.status IN ('completed', 'ready')
      GROUP BY oi.item_name
      ORDER BY quantity_sold DESC
      LIMIT ?
    `, [startDate, limitNum]);

    res.json(items);
  } catch (error) {
    console.error('Error fetching top items report:', error);
    res.status(500).json({ error: 'Failed to fetch top items report' });
  }
});

// Bug #5 fix: Rename fields to match frontend expectations
// GET /api/reports/employee-performance - sales by employee
router.get('/employee-performance', (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    const startDate = getDateRange(period);

    const employees = all(`
      SELECT
        e.id as employee_id,
        e.name as employee_name,
        COUNT(o.id) as orders_processed,
        ROUND(SUM(o.subtotal), 2) as total_sales,
        ROUND(AVG(o.total), 2) as avg_ticket,
        ROUND(SUM(o.tip), 2) as tips_received
      FROM employees e
      LEFT JOIN orders o ON e.id = o.employee_id AND DATE(o.created_at) >= ? AND o.status IN ('completed', 'ready')
      GROUP BY e.id, e.name
      ORDER BY total_sales DESC
    `, [startDate]);

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employee performance report:', error);
    res.status(500).json({ error: 'Failed to fetch employee performance report' });
  }
});

// Bug #6 fix: Return flat array instead of wrapped {date, hourly: [...]}
// GET /api/reports/hourly - orders by hour of day
router.get('/hourly', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const hourly = all(`
      SELECT
        CAST(SUBSTR(created_at, 12, 2) AS INTEGER) as hour,
        COUNT(*) as orders,
        ROUND(SUM(subtotal), 2) as revenue,
        ROUND(AVG(total), 2) as avg_ticket
      FROM orders
      WHERE DATE(created_at) = ?
      GROUP BY hour
      ORDER BY hour ASC
    `, [today]);

    // Fill in missing hours with 0 values
    const hourlyMap = {};
    for (let i = 0; i < 24; i++) {
      hourlyMap[i] = {
        hour: i,
        orders: 0,
        revenue: 0,
        avg_ticket: 0,
      };
    }

    hourly.forEach(row => {
      hourlyMap[row.hour] = row;
    });

    const result = Object.values(hourlyMap);

    res.json(result);
  } catch (error) {
    console.error('Error fetching hourly report:', error);
    res.status(500).json({ error: 'Failed to fetch hourly report' });
  }
});

export default router;
