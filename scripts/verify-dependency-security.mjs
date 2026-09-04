import fs from "node:fs";

const NPM_REGISTRY_PREFIX = "https://registry.npmjs.org/";
const OSV_QUERY_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const npmConfig = fs.readFileSync(new URL("../.npmrc", import.meta.url), "utf8");

/** npm install이 새 버전을 임의 선택하지 않도록 직접 의존성이 정확한 버전인지 확인한다. */
function verifyDirectVersions() {
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  const ranged = Object.entries(dependencies)
    .filter(([, version]) => !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))
    .map(([name, version]) => `${name}@${version}`);

  if (ranged.length > 0) {
    throw new Error(`정확한 버전이 아닌 직접 의존성이 있습니다: ${ranged.join(", ")}`);
  }
}

/** 잠금 파일이 공식 npm registry tarball과 무결성 해시만 참조하는지 확인한다. */
function collectLockedPackages() {
  const packages = [];
  const invalidSources = [];
  const missingIntegrity = [];
  const installScripts = [];

  for (const [path, metadata] of Object.entries(packageLock.packages ?? {})) {
    if (!path || metadata.link || !metadata.version) continue;
    if (metadata.resolved && !metadata.resolved.startsWith(NPM_REGISTRY_PREFIX)) {
      invalidSources.push(`${path}: ${metadata.resolved}`);
    }
    if (metadata.resolved && !metadata.integrity) missingIntegrity.push(path);
    if (metadata.hasInstallScript) installScripts.push(`${path}@${metadata.version}`);

    const markerIndex = path.lastIndexOf("node_modules/");
    if (markerIndex < 0) continue;
    packages.push({
      name: path.slice(markerIndex + "node_modules/".length),
      version: metadata.version,
      developmentOnly: Boolean(metadata.dev),
    });
  }

  if (invalidSources.length > 0) {
    throw new Error(`공식 npm registry 외 출처가 있습니다:\n${invalidSources.join("\n")}`);
  }
  if (missingIntegrity.length > 0) {
    throw new Error(`무결성 해시가 없는 패키지가 있습니다:\n${missingIntegrity.join("\n")}`);
  }
  if (!/^ignore-scripts=true$/m.test(npmConfig)) {
    throw new Error(".npmrc에서 의존성 lifecycle script를 기본 차단해야 합니다.");
  }

  return { packages, installScripts };
}

/** 잠금 파일의 정확한 npm 패키지 버전을 OSV 데이터베이스와 일괄 대조한다. */
async function queryOsv(packages) {
  const uniquePackages = [...new Map(
    packages.map((item) => [`${item.name}@${item.version}`, item]),
  ).values()];
  const response = await fetch(OSV_QUERY_BATCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      queries: uniquePackages.map(({ name, version }) => ({
        package: { ecosystem: "npm", name },
        version,
      })),
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`OSV 조회 실패: HTTP ${response.status}`);
  const body = await response.json();
  if (!Array.isArray(body.results) || body.results.length !== uniquePackages.length) {
    throw new Error("OSV 응답 개수가 잠금 패키지 개수와 일치하지 않습니다.");
  }

  const vulnerabilities = [];
  body.results.forEach((result, index) => {
    for (const vulnerability of result.vulns ?? []) {
      vulnerabilities.push({
        package: `${uniquePackages[index].name}@${uniquePackages[index].version}`,
        developmentOnly: uniquePackages[index].developmentOnly,
        id: vulnerability.id,
      });
    }
  });
  return { queriedCount: uniquePackages.length, vulnerabilities };
}

verifyDirectVersions();
const { packages, installScripts } = collectLockedPackages();
const { queriedCount, vulnerabilities } = await queryOsv(packages);

if (vulnerabilities.length > 0) {
  const findings = vulnerabilities.map(({ package: name, developmentOnly, id }) => (
    `${developmentOnly ? "DEV" : "PROD"} ${name}: ${id}`
  ));
  throw new Error(`알려진 취약점이 발견됐습니다:\n${findings.join("\n")}`);
}

console.log(`Dependency security check passed: ${queriedCount} package versions, 0 known vulnerabilities.`);
console.log(`Install scripts blocked by .npmrc: ${installScripts.join(", ") || "none"}.`);
