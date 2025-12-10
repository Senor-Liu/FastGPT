import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCert, clearCookie } from '@fastgpt/service/support/permission/auth/common';
import { delUserSession } from '@fastgpt/service/support/user/session';

async function handler(req: NextApiRequest, res: NextApiResponse<any>) {
  try {
    const { sessionId } = await authCert({ req, authToken: true });
    await delUserSession(sessionId);
  } catch (error) {}
  clearCookie(res);
}

export default NextAPI(handler);
