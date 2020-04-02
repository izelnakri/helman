import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import Console from '../utils/console.js';
import YAML from 'yaml';

export default async function () {
  let projectRoot = (await findProjectRoot('helm.json')) || (await findProjectRoot('package.json'));

  if (!(await fs.pathExists(`${projectRoot}/helm.json`))) {
    Console.error('helm.json does not exists in this project. Did you run $ helm init first?');
  } else if (!process.argv[3]) {
    Console.error('uninstall command needs a package name. Example: helman uninstall stable/nginx-ingress');
  }

  const deletedCharts = await Promise.all(process.argv.slice(3).map((arg) => uninstallChart(projectRoot, arg), []));

  return await Promise.all([
    removeChartsFromHelmJSON(projectRoot, deletedCharts),
    removeChartsFromBaseKustomize(projectRoot, deletedCharts),
  ]);
}

export async function uninstallChart(projectRoot, fullChartName) {
  let [repo, name] = fullChartName.split('/');

  await Promise.all([fs.remove(`${projectRoot}/k8s/bases/${name}`), fs.remove(`${projectRoot}/helm_charts/${name}`)]);

  return { repo, name };
}

export async function removeChartsFromHelmJSON(projectRoot, deletedCharts) {
  let helmJSON = JSON.parse((await fs.readFile(`${projectRoot}/helm.json`)).toString());

  deletedCharts.forEach((deletedChart) => {
    delete helmJSON.dependencies[`${deletedChart.repo}/${deletedChart.name}`];
  });

  return await fs.writeFile(`${projectRoot}/helm.json`, JSON.stringify(helmJSON, null, 2));
}

export async function removeChartsFromBaseKustomize(projectRoot, deletedCharts) {
  let baseKustomizationYAML = YAML.parse((await fs.readFile(`${projectRoot}/k8s/bases/kustomization.yaml`)).toString());
  let targetYAML = Object.assign(baseKustomizationYAML, {
    bases: baseKustomizationYAML.bases.filter((base) => {
      return !deletedCharts.find((deletedChart) => base.startsWith(deletedChart.name));
    }),
  });

  return await fs.writeFile(`${projectRoot}/k8s/bases/kustomization.yaml`, YAML.stringify(targetYAML));
}
