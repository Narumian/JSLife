import { spawn } from "node:child_process";

const children = [
  spawn("npm", ["run", "dev:web"], { stdio: "inherit" }),
  spawn("npm", ["run", "agent"], { stdio: "inherit" }),
];

let closing = false;
const close = (signal = "SIGTERM") => {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill(signal);
};

for (const child of children) {
  child.on("exit", (code) => {
    if (!closing && code) {
      close();
      process.exitCode = code;
    }
  });
}

process.on("SIGINT", () => { close("SIGINT"); });
process.on("SIGTERM", () => { close("SIGTERM"); });

