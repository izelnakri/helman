import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import YAML from 'yaml';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';

const shell = promisify(exec);

export default async function () {
  const projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    Console.error('helm_charts folder does not exist in this project. Did you run $ helm install $chart first?');
  }

  let [helmJSONBuffer] = await Promise.all([fs.readFile(`${projectRoot}/helm.json`), shell('helm repo update')]);
  let helmDependencies = Object.keys(JSON.parse(helmJSONBuffer.toString()).dependencies);
  let targetArgs = process.argv.slice(3);

  if (targetArgs.length === 0) {
    return await buildAllPackagesFromHelmJSON(projectRoot, helmDependencies);
  }

  let helmJSONDependencyKeys = helmDependencies.map((dependencyReference) => dependencyReference.split('/'));

  return await Promise.all(
    targetArgs.map(async (arg) => {
      let targetHelmJSONDependency = arg.includes('/') ? arg : findChartFromHelmJSON(helmJSONDependencyKeys, arg);
      let [repo, name] = targetHelmJSONDependency.split('/');

      return await buildHelmChart(projectRoot, repo, name);
    })
  );
}

export function buildAllPackagesFromHelmJSON(projectRoot, helmJSONDependencies) {
  return Promise.all(
    helmJSONDependencies.map((dependencyReference) => {
      let [repo, name] = dependencyReference.split('/');

      return buildHelmChart(projectRoot, repo, name);
    })
  );
}

export async function buildHelmChart(projectRoot, repoName, chartName) {
  let targetDirectory = `${projectRoot}/k8s/bases/${chartName}`;

  if (!(await fs.pathExists(`${targetDirectory}/values.yaml`))) {
    await fs.copy(
      `${projectRoot}/helm_charts/${chartName}/values.yaml`,
      `${projectRoot}/k8s/bases/${chartName}/values.yaml`
    );
  }

  let values = YAML.parse((await fs.readFile(`${projectRoot}/k8s/bases/${chartName}/values.yaml`)).toString());
  let releaseName = values.releaseName || 'RELEASE-NAME';
  let namespace = values.namespace || 'default';

  return shell(
    `helm template ${projectRoot}/helm_charts/${chartName} > ${targetDirectory}/helm.yaml --values ${targetDirectory}/values.yaml --name-template=${releaseName} --namespace=${namespace}`
  );
  // kustomize helm template helm_charts/nginx-ingress --values k8s/bases/nginx-ingress --name-template $releaseName --namespace $nameSpace
}

export function findChartFromHelmJSON(helmJSONDependencyKeys, chartName) {
  let targetHelmJSONDependencyIndex = helmJSONDependencyKeys.findIndex((dependency) => dependency[1] === chartName);

  if (targetHelmJSONDependencyIndex === -1) {
    Console.error(`${chartName} chart is not found on helm.json. First install it via $ helman install ${chartName}`);
  }

  return helmJSONDependencyKeys[targetHelmJSONDependencyIndex].join('/');
}
