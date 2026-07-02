import { redis } from "../redis.ts";

export const QUEUE_KEY = "email:queue";

export interface EnqueueOrderEmail {
  userId: number;
  orderId: number;
  email: string;
}

export const enqueueOrderEmail = async (
  job: EnqueueOrderEmail,
): Promise<void> => {
  await redis.lpush(QUEUE_KEY, JSON.stringify(job));
};
