import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';

const shell = promisify(exec);

export default async function () {
  const projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    throw new Error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
    throw new Error('helm_charts folder does not exist in this project. Did you run $ helm install $chart first?');
  }

  // NOTE: get chart repos

  return buildHelmChart(projectRoot, repoName, chartName);
}

export function buildHelmChart(projectRoot, repoName, chartName) {
  return shell(
    `helm template ${projectRoot}/helm_charts/${chartName} > ${projectRoot}/k8s/bases/${chartName}/helm.yaml`
  );
}
