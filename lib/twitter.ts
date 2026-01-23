// Twitter API v2 - 트윗 자동 포스팅
import crypto from 'crypto';

interface TweetResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

// OAuth 1.0a 서명 생성
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
}

// OAuth 헤더 생성
function generateOAuthHeader(
  method: string,
  url: string,
  apiKey: string,
  apiSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(
    method,
    url,
    oauthParams,
    apiSecret,
    accessTokenSecret
  );

  oauthParams.oauth_signature = signature;

  const headerParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParams}`;
}

// 트윗 포스팅
export async function postTweet(text: string): Promise<TweetResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { success: false, error: 'Twitter API 키가 설정되지 않았습니다' };
  }

  const url = 'https://api.twitter.com/2/tweets';
  
  try {
    const authHeader = generateOAuthHeader(
      'POST',
      url,
      apiKey,
      apiSecret,
      accessToken,
      accessTokenSecret
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Twitter API Error:', data);
      return { 
        success: false, 
        error: data.detail || data.title || 'Twitter API 오류' 
      };
    }

    return { 
      success: true, 
      tweetId: data.data?.id 
    };
  } catch (error) {
    console.error('Twitter 포스팅 실패:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// 블로그 글 트윗 생성
export function createBlogTweet(title: string, excerpt: string, url: string): string {
  // 트윗 최대 280자, URL은 약 23자로 계산됨
  const maxLength = 250; // 여유 두기
  
  let tweet = `${title}\n\n${excerpt}`;
  
  if (tweet.length > maxLength - 30) {
    tweet = `${title}\n\n${excerpt.slice(0, maxLength - title.length - 35)}...`;
  }
  
  return `${tweet}\n\n${url}`;
}
