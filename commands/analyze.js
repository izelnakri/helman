import chalk from 'ansi-colors';
import YAML from 'yaml';
import fs from 'fs-extra';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import { buildAllPackagesFromHelmJSON, buildHelmChart, findChartFromHelmJSON } from './build.js';

// TODO: add port forwarding data next to the each service [80:4040]
export default async function () {
  const projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    Console.error('helm_charts folder does not exist in this project. Did you run $ helm install $chart first?');
  }

  let helmDependencies = Object.keys(
    JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString()).dependencies
  );
  let targetArgs = process.argv.slice(3);

  if (targetArgs.length === 0) {
    await buildAllPackagesFromHelmJSON(projectRoot, helmDependencies);

    return await Promise.all(
      helmDependencies.map(async (helmDependency) => {
        let [repo, name] = helmDependency.split('/');

        await buildHelmChart(projectRoot, repo, name);

        return await analyzeHelmChart(projectRoot, name, false);
      })
    );
  }

  let helmJSONDependencyKeys = helmDependencies.map((dependencyReference) => dependencyReference.split('/'));

  await Promise.all(
    targetArgs.map(async (arg) => {
      let isFile = arg.endsWith('.yaml') || arg.endsWith('.yml');

      if (!isFile) {
        let targetHelmJSONDependency = arg.includes('/') ? arg : findChartFromHelmJSON(helmJSONDependencyKeys, arg);
        let [repo, name] = targetHelmJSONDependency.split('/');

        await buildHelmChart(projectRoot, repo, name);

        return await analyzeHelmChart(projectRoot, name, isFile);
      }

      return await analyzeHelmChart(projectRoot, arg, isFile);
    })
  );
}

async function analyzeHelmChart(projectRoot, chartNameOrFile, isFile = false) {
  let buildDocuments = await parseYAML(projectRoot, chartNameOrFile, isFile);
  let targetData = buildDocuments.reduce((result, document) => {
    let target = document.toJSON();
    let metadata = target.metadata || {};

    result[target.kind] = result[target.kind] || [];

    result[target.kind].push({
      name: metadata.name,
      namespace: metadata.namespace || 'default',
    });

    return result;
  }, {});

  console.log(chalk.cyan('======================'));

  if (isFile) {
    console.log(chalk.cyan(`${chartNameOrFile} has ${buildDocuments.length} resources:`));
  } else {
    console.log(chalk.cyan(`${chartNameOrFile} chart has ${buildDocuments.length} resources:`));
  }

  console.log(chalk.cyan('======================'));

  Object.keys(targetData).forEach((documentKind) => {
    let documents = targetData[documentKind];

    console.log(chalk.green(`${documents.length} ${documentKind}:`));
    console.log(chalk.green('======================'));
    documents.forEach((document) => {
      console.log(`${document.name} - namespace: ${chalk.yellow(document.namespace)}`);
    });
  });
}

async function parseYAML(projectRoot, chartNameOrFile, isFile) {
  let path = isFile ? `${projectRoot}/${chartNameOrFile}` : `${projectRoot}/k8s/bases/${chartNameOrFile}/helm.yaml`;

  return YAML.parseAllDocuments((await fs.readFile(path)).toString());
}
