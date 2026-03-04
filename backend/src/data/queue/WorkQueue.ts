export class WorkQueue {
  private queue: Array<() => Promise<void>> = [];

  private running = 0;

  constructor(private readonly maxConcurrency = 2) {}

  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrapped = async (): Promise<void> => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running -= 1;
          this.next();
        }
      };

      this.queue.push(wrapped);
      this.next();
    });
  }

  private next(): void {
    if (this.running >= this.maxConcurrency) return;
    const job = this.queue.shift();
    if (!job) return;
    this.running += 1;
    void job();
  }
}

// Global iş kuyruğu: Puppeteer gibi ağır işler için kullanılabilir.
export const globalWorkQueue = new WorkQueue(2);

