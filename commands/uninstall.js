import fs from 'fs-extra';

export default function () {
  //   if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
  //   throw new Error('helm.json does not exists in this project. Did you run $ helm init first?');
  // } else if (!(await fs.pathExists(`${projectRoot}/helm_charts`))) {
  //   await setupHelmChartsFolder(projectRoot);
}

export function uninstallChart(projectRoot, repoName, chartName) {
  Promise.all([
    fs.remove(`${projectRoot}/k8/bases/${chartName}`),
    fs.remove(`${projectRoot}/helm_charts/${chartName}`),
    removeChartFromHelmJSON(projectRoot, repoName, chartName),
    removeChartFromBaseKustomize(projectRoot, chartName),
  ]);
}

export function removeChartFromHelmJSON(projectRoot, repoName, chartName) {}

export function removeChartFromBaseKustomize(projectRoot, chartName) {}
