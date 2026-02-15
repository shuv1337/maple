/**
 * Deploy to Tinybird with --allow-destructive-operations.
 *
 * The SDK CLI doesn't expose this flag yet. This script builds the TS
 * resources using the SDK, then calls the Tinybird v1/deploy API directly
 * with allow_destructive_operations=true.
 *
 * Usage: bun scripts/tinybird-deploy-destructive.ts [--check]
 */

// @ts-ignore — internal SDK modules
import { loadConfig } from "../node_modules/@tinybirdco/sdk/dist/cli/config.js";
// @ts-ignore
import { buildFromInclude } from "../node_modules/@tinybirdco/sdk/dist/generator/index.js";

const isCheck = process.argv.includes("--check");
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 300; // 10 minutes

interface DeployResponse {
  result: "success" | "failed" | "no_changes";
  deployment?: {
    id: string;
    status: string;
    feedback?: Array<{ resource: string | null; level: string; message: string }>;
    deleted_datasource_names?: string[];
    deleted_pipe_names?: string[];
    changed_datasource_names?: string[];
    changed_pipe_names?: string[];
    new_datasource_names?: string[];
    new_pipe_names?: string[];
  };
  error?: string;
  errors?: Array<{ filename?: string; error: string }>;
}

async function main() {
  const config = loadConfig(process.cwd());
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  // Step 1: Build resources from TS
  console.log(`Building from ${config.include.length} include path(s)...`);
  const buildResult = await buildFromInclude({
    includePaths: config.include,
    cwd: config.cwd,
  });
  const { resources } = buildResult;
  console.log(`Built ${resources.datasources.length} datasources, ${resources.pipes.length} pipes`);

  // Step 2: Write generated files to disk for tb CLI fallback
  const outDir = `${process.cwd()}/.tinybird-generated`;
  const fs = await import("fs");
  fs.mkdirSync(outDir, { recursive: true });
  for (const ds of resources.datasources) {
    fs.writeFileSync(`${outDir}/${ds.name}.datasource`, ds.content);
  }
  for (const pipe of resources.pipes) {
    fs.writeFileSync(`${outDir}/${pipe.name}.pipe`, pipe.content);
  }
  console.log(`Generated files written to ${outDir}`);

  // Step 3: Clean up stale deployments
  try {
    const res = await fetch(`${baseUrl}/v1/deployments`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    if (res.ok) {
      const { deployments } = (await res.json()) as { deployments: Array<{ id: string; live: boolean; status: string }> };
      for (const d of deployments.filter((d) => !d.live && d.status !== "live")) {
        console.log(`Cleaning up stale deployment ${d.id} (${d.status})`);
        await fetch(`${baseUrl}/v1/deployments/${d.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${config.token}` },
        });
      }
    }
  } catch {}

  // Step 3: Create deployment
  const formData = new FormData();
  for (const ds of resources.datasources) {
    formData.append("data_project://", new Blob([ds.content], { type: "text/plain" }), `${ds.name}.datasource`);
  }
  for (const pipe of resources.pipes) {
    formData.append("data_project://", new Blob([pipe.content], { type: "text/plain" }), `${pipe.name}.pipe`);
  }

  const params = new URLSearchParams({ allow_destructive_operations: "true" });
  if (isCheck) params.set("check", "true");

  console.log(isCheck ? "Validating deployment..." : "Creating deployment...");

  const deployRes = await fetch(`${baseUrl}/v1/deploy?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: formData,
  });

  const body = (await deployRes.json()) as DeployResponse;

  if (!deployRes.ok || body.result === "failed") {
    const errors = body.deployment?.feedback
      ?.filter((f) => f.level === "ERROR")
      .map((f) => f.message)
      .join("\n") ?? body.error ?? JSON.stringify(body.errors);
    console.error(`Deploy failed:\n${errors}`);
    process.exit(1);
  }

  // Print changes
  const d = body.deployment;
  if (d) {
    if (d.new_datasource_names?.length) console.log(`  + datasources: ${d.new_datasource_names.join(", ")}`);
    if (d.changed_datasource_names?.length) console.log(`  ~ datasources: ${d.changed_datasource_names.join(", ")}`);
    if (d.deleted_datasource_names?.length) console.log(`  - datasources: ${d.deleted_datasource_names.join(", ")}`);
    if (d.new_pipe_names?.length) console.log(`  + pipes: ${d.new_pipe_names.join(", ")}`);
    if (d.changed_pipe_names?.length) console.log(`  ~ pipes: ${d.changed_pipe_names.join(", ")}`);
    if (d.deleted_pipe_names?.length) console.log(`  - pipes: ${d.deleted_pipe_names.join(", ")}`);
  }

  if (isCheck) {
    console.log("Check passed!");
    return;
  }

  if (body.result === "no_changes") {
    console.log("No changes to deploy.");
    return;
  }

  const deploymentId = body.deployment!.id;
  console.log(`Deployment ${deploymentId} created, waiting for data_ready...`);

  // Step 4: Poll until ready
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${baseUrl}/v1/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${config.token}` },
    });

    if (!statusRes.ok) {
      console.error(`Status check failed: ${statusRes.status} ${statusRes.statusText}`);
      process.exit(1);
    }

    const { deployment } = (await statusRes.json()) as { deployment: { status: string } };
    const status = deployment.status;

    if (i % 5 === 0) console.log(`  Status: ${status} (attempt ${i + 1}/${MAX_POLL_ATTEMPTS})`);

    if (status === "data_ready") {
      console.log("Deployment ready, promoting to live...");
      break;
    }
    if (status === "failed" || status === "error") {
      const fullRes = await fetch(`${baseUrl}/v1/deployments/${deploymentId}`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });
      const fullBody = await fullRes.json();
      console.error(`Deployment failed. Full response:\n${JSON.stringify(fullBody, null, 2)}`);
      process.exit(1);
    }
    if (status === "deleted") {
      // List remaining deployments for debugging
      const listRes = await fetch(`${baseUrl}/v1/deployments`, {
        headers: { Authorization: `Bearer ${config.token}` },
      });
      const listBody = await listRes.json() as any;
      console.error("Deployment was deleted. Current deployments:", JSON.stringify(listBody.deployments?.map((d: any) => ({ id: d.id, status: d.status, live: d.live })), null, 2));
      process.exit(1);
    }
  }

  // Step 5: Set live
  const liveRes = await fetch(`${baseUrl}/v1/deployments/${deploymentId}/set-live`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
  });

  if (!liveRes.ok) {
    const text = await liveRes.text();
    console.error(`Failed to set live: ${liveRes.status} ${text}`);
    process.exit(1);
  }

  console.log(`Deployment ${deploymentId} is live!`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
