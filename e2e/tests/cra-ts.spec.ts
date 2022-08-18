import { test, expect } from "@playwright/test";
import { ChildProcess, exec, spawn } from "child_process";
import { existsSync } from "fs";
import { fireCmd, runCmd } from "./helpers";

const TARGET_DIR = "./cra-ts";
const PORT = 4001;

let devServerProcess: ChildProcess;

test.beforeAll(async () => {
  test.setTimeout(180000);

  if (!existsSync(TARGET_DIR)) {
    await runCmd(`yarn create react-app ${TARGET_DIR} --template typescript`);
  }

  await runCmd(
    `node ../../dist/bin.js --ignore-git-changes --package-manager yarn -y`,
    { cwd: TARGET_DIR }
  );

  // todo: move testcomponent in

  await runCmd(`yarn --cwd ${TARGET_DIR} run relay`);

  await runCmd(`yarn --cwd ${TARGET_DIR} run build`);

  // todo: could be that we need to add it to path in CI
  await runCmd(`yarn global add serve`);

  devServerProcess = fireCmd(`serve -s ./build -l ${PORT}`, {
    cwd: TARGET_DIR,
    stdio: "inherit",
  });

  // Give the server some time to come up
  await new Promise((resolve) => setTimeout(resolve, 5000));
});

test("Execute CRA/TS graphql request", async ({ page }) => {
  await page.route("**/graphql", async (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { field: "cra-ts text" } }),
    });
  });

  await page.goto("http://localhost:" + PORT, { waitUntil: "networkidle" });

  const innerText = await page.locator("#test-data").innerText();

  await expect(innerText).toEqual("cra-ts text");
});

test.afterAll(() => {
  devServerProcess?.kill();

  // if (existsSync(scaffoldDir)) {
  //   fs.rm(scaffoldDir, { recursive: true });
  // }
});
