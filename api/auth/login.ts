import { authenticateWithIdentifier } from '../../frontend/src/server/authService';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const params = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await authenticateWithIdentifier(params);
    return res.status(result.success ? 200 : 401).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
