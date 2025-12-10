import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { setCookie } from '@fastgpt/service/support/permission/auth/common';
import { createUserSession } from '@fastgpt/service/support/user/session';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import crypto from 'crypto';
import { addLog } from '@fastgpt/service/common/system/log';

// 与外部平台约定的共享密钥
const SSO_SHARED_SECRET = process.env.SSO_SHARED_SECRET as string;

type FastLoginBody = {
  code: string; // 外部平台下发的一次性授权码（可包含用户ID/团队ID/时间戳等）
  token: string; // 对 code 的签名，如: HMAC-SHA256(code, secret)
  resourceApi?: string; // 资源列表 API 地址
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, token } = req.body as FastLoginBody;
  if (!code || !token) {
    throw new Error('invalid params');
  }

  // 1) 校验签名
  const expect = crypto.createHmac('sha256', SSO_SHARED_SECRET).update(code).digest('hex');
  if (expect !== token) {
    throw new Error('invalid signature');
  }

  // 2) 解析 code（base64 的 JSON）
  // 约定格式: { userId: string; teamId: string; tmbId: string; iat: number; exp: number; resourceApi: string }
  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(code, 'base64url').toString());
  } catch {
    throw new Error('invalid code payload');
  }
  if (!payload?.userId || !payload?.teamId || !payload?.tmbId) {
    throw new Error('invalid payload');
  }
  // exp/iat 校验，防重放
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('code expired');
  }

  // 3) 获取资源列表
  let allowApps: string[] = [];
  let allowDatasets: string[] = [];
  if (payload.resourceApi) {
    try {
      const resourceResponse = await fetch(payload.resourceApi);
      const resourceData = await resourceResponse.json();
      allowApps = resourceData.allowApps || [];
      allowDatasets = resourceData.allowDatasets || [];
    } catch (error) {
      addLog.warn('Failed to fetch resource list from external platform', {
        error: error as Record<string, any>
      });
    }
  }

  // 4) 生成会话
  const sessionKey = await createUserSession({
    userId: payload.userId,
    teamId: payload.teamId,
    tmbId: payload.tmbId,
    isRoot: true,
    ip: req.headers['x-forwarded-for'] as string,
    allowApps,
    allowDatasets,
    isIframe: true
  });
  setCookie(res, sessionKey);

  // 5) 返回用户详情（与普通登录返回结构保持一致）
  const user = await getUserDetail({ tmbId: payload.tmbId, userId: payload.userId });
  return { user, token: sessionKey };
}

export default NextAPI(handler);
