import { TodoUpdate } from "@/data/todos";

export class Distributor {
  private stream: ReadableStream<TodoUpdate>;
  private controller: ReadableStreamDefaultController<TodoUpdate>;

  private constructor(
    stream: ReadableStream<TodoUpdate>,
    controller: ReadableStreamDefaultController<TodoUpdate>,
  ) {
    this.stream = stream;
    this.controller = controller;
  }

  static async new() {
    console.log("[DEBUG] creating Distributor");
    const { stream, controller } = await new Promise<{
      stream: ReadableStream<TodoUpdate>;
      controller: ReadableStreamDefaultController<TodoUpdate>;
    }>((resolve) => {
      const stream = new ReadableStream<TodoUpdate>({
        pull(controller) {
          resolve({ stream, controller });
        },
      });
    });

    return new Distributor(stream, controller);
  }

  getSteam() {
    const [stream1, stream2] = this.stream.tee();
    this.stream = stream1;
    return stream2;
  }
  enqueue(update: TodoUpdate) {
    this.controller.enqueue(update);
  }
}

export const distributor = await Distributor.new();
