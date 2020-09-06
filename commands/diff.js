import chalk from 'ansi-colors';
import { inspect } from 'util';
import fs from 'fs-extra';
import YAML from 'yaml';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import diffYaml from '../utils/diff-yaml.js';

export default async function () {
  const projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    Console.error('helm_charts folder does not exist in this project. Did you run $ helm install $chart first?');
  }

  let helmJSONBuffer = await fs.readFile(`${projectRoot}/helm.json`);
  let helmDependencies = Object.keys(JSON.parse(helmJSONBuffer.toString()).dependencies);
  let targetArgs = process.argv.slice(3);

  if (targetArgs.length === 0) {
    return await diffAllPackagesFromHelmJSON(projectRoot, helmDependencies);
  }

  let helmJSONDependencyKeys = helmDependencies.map((dependencyReference) => dependencyReference.split('/'));

  return await Promise.all(
    targetArgs.map(async (arg) => {
      let targetHelmJSONDependency = arg.includes('/') ? arg : findChartFromHelmJSON(helmJSONDependencyKeys, arg);
      let [repo, name] = targetHelmJSONDependency.split('/');

      return await diffHelmChart(projectRoot, repo, name);
    })
  );
}

export function diffAllPackagesFromHelmJSON(projectRoot, helmJSONDependencies) {
  return Promise.all(
    helmJSONDependencies.map((dependencyReference) => {
      let [repo, name] = dependencyReference.split('/');

      return diffHelmChart(projectRoot, repo, name);
    })
  );
}

export function findChartFromHelmJSON(helmJSONDependencyKeys, chartName) {
  let targetHelmJSONDependencyIndex = helmJSONDependencyKeys.findIndex((dependency) => dependency[1] === chartName);

  if (targetHelmJSONDependencyIndex === -1) {
    Console.error(`${chartName} chart is not found on helm.json. First install it via $ helman install ${chartName}`);
  }

  return helmJSONDependencyKeys[targetHelmJSONDependencyIndex].join('/');
}

export async function diffHelmChart(projectRoot, repoName, chartName) {
  let targetDirectory = `${projectRoot}/k8s/bases/${chartName}`;

  if (!(await fs.pathExists(`${targetDirectory}/values.yaml`))) {
    await fs.copy(
      `${projectRoot}/helm_charts/${chartName}/values.yaml`,
      `${projectRoot}/k8s/bases/${chartName}/values.yaml`
    );
  }

  let values = YAML.parse((await fs.readFile(`${projectRoot}/k8s/bases/${chartName}/values.yaml`)).toString());
  let chartValues = YAML.parse((await fs.readFile(`${projectRoot}/helm_charts/${chartName}/values.yaml`)).toString());

  console.log(chalk.cyan('======================'));
  console.log(chalk.cyan(`DIFF ${chartName}:`));
  console.log(chalk.cyan('======================'));

  let targetDiff = diffYaml(chartValues, values);

  console.log(chalk.yellow(`CHANGED: ${inspect(targetDiff.changed, { depth: null })}`));
  console.log(chalk.green(`ADDED: ${inspect(targetDiff.added, { depth: null })}`));
  console.log(chalk.red(`REMOVED: ${inspect(targetDiff.removed, { depth: null })}`));
}
