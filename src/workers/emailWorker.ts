import "dotenv/config";
import { redis } from "../redis.ts";
import { EnqueueOrderEmail, QUEUE_KEY } from "../queue/emailQueue.ts";

const run = async () => {
  console.log("Email worker 已启动，等待任务…");

  // B：Blocking；列表为空时不立刻返回，而是阻塞等待，直到有新元素或超时
  // R：Right；从列表右端弹出元素
  // POP：弹出；取出并删除一个元素
  while (true) {
    // BRPOP：阻塞最多 5 秒；有任务则返回 [key, value]
    const result = await redis.brpop(QUEUE_KEY, 5);
    if (!result) continue;
    const job = JSON.parse(result[1]) as EnqueueOrderEmail;

    // mock：真实项目这里调 SendGrid / 阿里云邮件
    console.log(
      `[Mock Email] 订单 #${job.orderId} → ${job.email}（userId=${job.userId}）`,
    );
  }
};

run().catch((error) => {
  console.log(error);
});
