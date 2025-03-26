declare module "timesync" {
  interface TimesyncOptions {
    server: string;
    interval?: number;
    timeout?: number;
    repeat?: number;
    delay?: number;
  }

  interface Timesync {
    now(): Promise<number>;
  }

  export function create(options: TimesyncOptions): Timesync;
}
