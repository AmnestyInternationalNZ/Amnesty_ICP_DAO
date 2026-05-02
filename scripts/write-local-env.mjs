import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targetNetwork =
  process.env.ICP_NETWORK_NAME ||
  process.env.ICP_ENVIRONMENT ||
  process.argv[2] ||
  'local';
const DEFAULT_LOCAL_II_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
const candidateMappingDirs = [
  path.join(projectRoot, '.icp', 'data', 'mappings'),
  path.join(projectRoot, '.icp', 'cache', 'mappings'),
];
const localTopologyPath = path.join(
  projectRoot,
  '.icp',
  'cache',
  'networks',
  targetNetwork,
  'state',
  'topology.json'
);
const outputPath = path.join(projectRoot, 'frontend', 'public', 'env.json');

function listMappingFiles() {
  const mappingFiles = candidateMappingDirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => path.join(dir, file));
  });

  const preferredFileNames = [
    `${targetNetwork}.ids.json`,
    `${targetNetwork}.json`,
  ];

  return mappingFiles.sort((left, right) => {
    const leftPreferred = preferredFileNames.includes(path.basename(left)) ? 0 : 1;
    const rightPreferred = preferredFileNames.includes(path.basename(right)) ? 0 : 1;
    return leftPreferred - rightPreferred;
  });
}

function findCanisterId(name) {
  const mappingFiles = listMappingFiles();

  if (mappingFiles.length === 0) {
    throw new Error(
      `ICP mappings directory not found in any of: ${candidateMappingDirs.join(', ')}`
    );
  }

  for (const file of mappingFiles) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));

    if (typeof parsed?.[name] === 'string') {
      return parsed[name];
    }

    if (typeof parsed?.canisters?.[name] === 'string') {
      return parsed.canisters[name];
    }

    if (typeof parsed?.canister_ids?.[name] === 'string') {
      return parsed.canister_ids[name];
    }
  }

  return undefined;
}

function findRequiredCanisterId(name) {
  const canisterId = findCanisterId(name);

  if (canisterId) {
    return canisterId;
  }

  throw new Error(`Could not find ${name} canister ID in ${listMappingFiles().join(', ')}`);
}

function getNetworkStatus() {
  const raw = execFileSync('icp', ['network', 'status', targetNetwork, '--json'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  return JSON.parse(raw);
}

function resolveBackendHost() {
  const parsed = getNetworkStatus();

  if (typeof parsed?.gateway_url === 'string') {
    return parsed.gateway_url.replace(/\/$/, '');
  }

  if (typeof parsed?.api_url === 'string') {
    return parsed.api_url.replace(/\/$/, '');
  }

  const port =
    parsed?.gateway?.port ??
    parsed?.network?.gateway?.port ??
    parsed?.status?.gateway?.port ??
    4943;

  return `http://127.0.0.1:${port}`;
}

function resolveLocalIiUrl() {
  let iiCanisterId = findCanisterId('internet_identity');

  if (!iiCanisterId && fs.existsSync(localTopologyPath)) {
    const topology = JSON.parse(fs.readFileSync(localTopologyPath, 'utf8'));
    if (topology?.icp_features?.ii === 'DefaultConfig') {
      iiCanisterId = DEFAULT_LOCAL_II_CANISTER_ID;
    }
  }

  if (!iiCanisterId) {
    return 'undefined';
  }

  const backendHost = resolveBackendHost();
  const url = new URL(backendHost);
  const portSegment = url.port ? `:${url.port}` : '';

  return `http://${iiCanisterId}.localhost${portSegment}`;
}

const envJson = {
  backend_host: resolveBackendHost(),
  backend_canister_id: findRequiredCanisterId('backend'),
  project_id: '0000000-0000-0000-0000-00000000000',
  ii_url: resolveLocalIiUrl(),
  ii_derivation_origin: 'undefined',
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(envJson, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(`Network: ${targetNetwork}`);
console.log(JSON.stringify(envJson, null, 2));
